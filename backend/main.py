import json
import time
import os
import zipfile
import shutil
from flask import Flask, Response, request, jsonify, send_file
from cors import cross_origin
import werkzeug

from agents.planning_agent import create_attack_plan
from agents.fixer_agent import generate_fixes
from agents.sast_agent import run_sast_scan
from agents.dast_agent import run_dast_scan
from tools.environment_manager import deploy_to_sandbox, destroy_sandbox
from tools.git_workspace import git_apply_patch, git_push_to_new_branch
from tools.dockerfile_generator import generate_dockerfile
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB

# --- Configuration ---
GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "your-gcp-project-id")
GCP_REGION = os.environ.get("GCP_REGION", "us-central1")
GCS_BUCKET_NAME = os.environ.get("GCS_BUCKET_NAME", "your-gcs-bucket-name")
LOCAL_REPO_PATH = '/tmp/repo'

# --- Global State ---
scan_state = {
    "local_repo_path": LOCAL_REPO_PATH,
    "sandbox_url": None,
    "service_name": None,
    "sast_report": None,
}

@app.route('/api/upload-scan', methods=['POST'])
@cross_origin()
def upload_scan():
    """
    Accepts a ZIP file upload, extracts it, and starts the scanning process.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected for uploading'}), 400

    if file and file.filename.endswith('.zip'):
        try:
            # Clean up previous repo directory
            if os.path.exists(LOCAL_REPO_PATH):
                shutil.rmtree(LOCAL_REPO_PATH)
            os.makedirs(LOCAL_REPO_PATH, exist_ok=True)

            # Save and extract the zip file
            zip_path = f"/tmp/{werkzeug.utils.secure_filename(file.filename)}"
            file.save(zip_path)

            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(LOCAL_REPO_PATH)
            
            # After extraction, the repo might be in a subdirectory. Let's move it up.
            extracted_files = os.listdir(LOCAL_REPO_PATH)
            if len(extracted_files) == 1 and os.path.isdir(os.path.join(LOCAL_REPO_PATH, extracted_files[0])):
                sub_dir = os.path.join(LOCAL_REPO_PATH, extracted_files[0])
                for item in os.listdir(sub_dir):
                    shutil.move(os.path.join(sub_dir, item), LOCAL_REPO_PATH)
                os.rmdir(sub_dir)

            # Generate Dockerfile if it doesn't exist
            try:
                dockerfile_path, generated_content = generate_dockerfile(LOCAL_REPO_PATH)
                if generated_content:
                    # Optionally, log that a Dockerfile was generated
                    print(f"Generated Dockerfile at {dockerfile_path}")
            except ValueError as e:
                # Handle cases where a Dockerfile can't be generated
                return jsonify({'error': str(e)}), 400


            os.remove(zip_path) # Clean up the uploaded zip file

            return Response(_run_scan_flow(), mimetype='text/event-stream')

        except Exception as e:
            return jsonify({'error': f'Failed to process uploaded file: {str(e)}'}), 500
    else:
        return jsonify({'error': 'Invalid file type, please upload a .zip file.'}), 400

def _run_scan_flow():
    """
    A generator function that runs the core scanning workflow and yields SSE events.
    """
    yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'start', 'log': {'message': 'Scan initiated...', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
    time.sleep(1)

    try:
        # --- Deploy Sandbox ---
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'deploy_sandbox', 'status': 'active'}})}\n\n"
        
        deployment_generator = deploy_to_sandbox(LOCAL_REPO_PATH, GCP_PROJECT_ID, GCP_REGION, GCS_BUCKET_NAME)
        
        service_url = None
        service_name = None

        for log in deployment_generator:
            if isinstance(log, tuple):
                service_url, service_name = log
                break
            else:
                yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'deploy_sandbox', 'log': {'message': log, 'type': 'info', 'timestamp': time.time()}}})}\n\n"

        if not service_url or not service_name:
            raise Exception("Failed to get service URL or name from deployment.")

        scan_state["sandbox_url"] = service_url
        scan_state["service_name"] = service_name
        
        yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'deploy_sandbox', 'log': {'message': f'Deployed sandbox to {service_url}', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'deploy_sandbox', 'status': 'success'}})}\n\n"
        time.sleep(1)

        # --- SAST Scan ---
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'sast_scan', 'status': 'active'}})}\n\n"
        scan_state["sast_report"] = run_sast_scan(LOCAL_REPO_PATH)
        yield f"data: {json.dumps({'type': 'state', 'payload': {'sast_report': scan_state['sast_report']}})}\n\n"
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'sast_scan', 'status': 'success'}})}\n\n"
        time.sleep(1)

        # --- Generate Fixes ---
        fixes = generate_fixes(scan_state["sast_report"], LOCAL_REPO_PATH)
        yield f"data: {json.dumps({'type': 'state', 'payload': {'suggested_fixes': fixes}})}\n\n"

        yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'pause', 'log': {'message': 'Scan paused. Waiting for user interaction.', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        yield f"data: {json.dumps({'type': 'control', 'payload': {'status': 'paused'}})}\n\n"

    except Exception as e:
        error_msg = str(e)
        yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'error', 'log': {'message': f'An error occurred: {error_msg}', 'type': 'error', 'timestamp': time.time()}}})}\n\n"
        if scan_state.get("service_name"):
            destroy_sandbox(scan_state["service_name"], GCP_PROJECT_ID, GCP_REGION)
        yield f"data: {json.dumps({'type': 'control', 'payload': {'status': 'finished'}})}\n\n"

@app.route('/api/run-dast', methods=['POST'])
@cross_origin()
def run_dast():
    """
    Runs the DAST scan and destroys the sandbox.
    """
    def generate_events():
        try:
            # --- Plan Attack ---
            yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'plan_attack', 'status': 'active'}})}\n\n"
            attack_plan = create_attack_plan(scan_state["sast_report"], scan_state["sandbox_url"])
            yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'plan_attack', 'status': 'success'}})}\n\n"
            time.sleep(1)

            # --- DAST Scan ---
            yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'run_dast', 'status': 'active'}})}\n\n"
            dast_report = run_dast_scan(attack_plan)
            yield f"data: {json.dumps({'type': 'state', 'payload': {'dast_report': dast_report}})}\n\n"
            yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'run_dast', 'status': 'success'}})}\n\n"
            time.sleep(1)

            # --- Destroy Sandbox ---
            yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'destroy_sandbox', 'status': 'active'}})}\n\n"
            destroy_sandbox(scan_state["service_name"], GCP_PROJECT_ID, GCP_REGION)
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'destroy_sandbox', 'log': {'message': 'Sandbox destroyed.', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
            yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'destroy_sandbox', 'status': 'success'}})}\n\n"
            time.sleep(1)

            # --- Final Report ---
            final_report = {
                "sast_report": scan_state["sast_report"],
                "dast_report": dast_report,
                "suggested_fixes": scan_state.get("suggested_fixes", [])
            }
            yield f"data: {json.dumps({'type': 'state', 'payload': {'final_report': final_report}})}\n\n"

        except Exception as e:
            error_msg = str(e)
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'error', 'log': {'message': f'An error occurred: {error_msg}', 'type': 'error', 'timestamp': time.time()}}})}\n\n"

        finally:
            # --- Destroy Sandbox ---
            if scan_state.get("service_name"):
                yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'destroy_sandbox', 'status': 'active'}})}\n\n"
                destroy_sandbox(scan_state["service_name"], GCP_PROJECT_ID, GCP_REGION)
                yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'destroy_sandbox', 'log': {'message': 'Sandbox destroyed.', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
                yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'destroy_sandbox', 'status': 'success'}})}\n\n"

            yield f"data: {json.dumps({'type': 'control', 'payload': {'status': 'finished'}})}\n\n"

    return Response(generate_events(), mimetype='text/event-stream')


@app.route('/api/apply-fix', methods=['POST'])
@cross_origin()
def apply_fix():
    data = request.get_json()
    patch_content = data.get('patch')
    if not patch_content:
        return jsonify({'error': 'Patch content is required'}), 400

    try:
        # Apply the patch
        git_apply_patch(patch_content, scan_state["local_repo_path"])
        return jsonify({'message': 'Fix applied locally.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download-fixed-code', methods=['GET'])
@cross_origin()
def download_fixed_code():
    """
    Zips the fixed code from the local repository and sends it to the user.
    """
    try:
        # Create a zip file of the fixed code
        zip_filename = f"fixed_source_{int(time.time())}.zip"
        zip_path = f"/tmp/{zip_filename}"
        
        shutil.make_archive(zip_path.replace('.zip', ''), 'zip', scan_state["local_repo_path"])

        return send_file(zip_path, as_attachment=True, download_name=zip_filename)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=8080, threaded=True)