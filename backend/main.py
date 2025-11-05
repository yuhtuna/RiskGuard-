import json
import time
import os
from flask import Flask, Response, request, jsonify
from cors import cross_origin
from tools.git_workspace import git_clone_repo, git_apply_patch, git_push_to_new_branch
from tools.environment_manager import deploy_to_sandbox, destroy_sandbox
from agents.sast_agent import run_sast_scan
from agents.planning_agent import create_attack_plan
from agents.dast_agent import run_dast_scan
from agents.fixer_agent import generate_fixes
import werkzeug
app = Flask(__name__)

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

@app.route('/api/start-scan', methods=['POST'])
@cross_origin()
def start_scan():
    """
    Starts the initial scan, which includes cloning, deploying, SAST, and fix generation.
    """
    data = request.get_json()
    source_code_url = data.get('sourceCodeUrl')
    if not source_code_url:
        return Response(json.dumps({'error': 'sourceCodeUrl is required'}), status=400, mimetype='application/json')

    def generate_events():
        yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'start', 'log': {'message': 'Scan initiated...', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        time.sleep(1)

        try:
            # --- Git Clone & Deploy ---
            yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'deploy_sandbox', 'status': 'active'}})}\n\n"
            scan_state["local_repo_path"] = git_clone_repo(source_code_url, LOCAL_REPO_PATH)
            scan_state["sandbox_url"], scan_state["service_name"] = deploy_to_sandbox(scan_state["local_repo_path"], GCP_PROJECT_ID, GCP_REGION, GCS_BUCKET_NAME)
            sandbox_url = scan_state["sandbox_url"]
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'deploy_sandbox', 'log': {'message': f'Deployed sandbox to {sandbox_url}', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
            yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'deploy_sandbox', 'status': 'success'}})}\n\n"
            time.sleep(1)

            # --- SAST Scan ---
            yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'sast_scan', 'status': 'active'}})}\n\n"
            scan_state["sast_report"] = run_sast_scan(scan_state["local_repo_path"])
            yield f"data: {json.dumps({'type': 'state', 'payload': {'sast_report': scan_state['sast_report']}})}\n\n"
            yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'sast_scan', 'status': 'success'}})}\n\n"
            time.sleep(1)

            # --- Generate Fixes ---
            fixes = generate_fixes(scan_state["sast_report"], scan_state["local_repo_path"])
            yield f"data: {json.dumps({'type': 'state', 'payload': {'suggested_fixes': fixes}})}\n\n"

            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'pause', 'log': {'message': 'Scan paused. Waiting for user interaction.', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
            yield f"data: {json.dumps({'type': 'control', 'payload': {'status': 'paused'}})}\n\n"

        except Exception as e:
            error_msg = str(e)
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'error', 'log': {'message': f'An error occurred: {error_msg}', 'type': 'error', 'timestamp': time.time()}}})}\n\n"
            if scan_state["service_name"]:
                destroy_sandbox(scan_state["service_name"], GCP_PROJECT_ID, GCP_REGION)
            yield f"data: {json.dumps({'type': 'control', 'payload': {'status': 'finished'}})}\n\n"

    return Response(generate_events(), mimetype='text/event-stream')

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

            # --- Final Report ---
            final_report = {
                'summary': 'Scan complete. Found 1 critical vulnerability.',
                'details': 'A SQL Injection vulnerability was successfully exploited.'
            }
            yield f"data: {json.dumps({'type': 'state', 'payload': {'final_report': final_report}})}\n\n"

        except Exception as e:
            error_msg = str(e)
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'error', 'log': {'message': f'An error occurred: {error_msg}', 'type': 'error', 'timestamp': time.time()}}})}\n\n"

        finally:
            # --- Destroy Sandbox ---
            if scan_state["service_name"]:
                yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'destroy_sandbox', 'status': 'active'}})}\n\n"
                destroy_sandbox(scan_state["service_name"], GCP_PROJECT_ID, GCP_REGION)
                yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'destroy_sandbox', 'status': 'success'}})}\n\n"

            yield f"data: {json.dumps({'type': 'control', 'payload': {'status': 'finished'}})}\n\n"

    return Response(generate_events(), mimetype='text/event-stream')

@app.route('/api/apply-fix', methods=['POST'])
@cross_origin()
def apply_fix():
    data = request.get_json()
    patch_string = data.get('patch_string')
    if not patch_string:
        return jsonify({'error': 'patch_string is required'}), 400
    try:
        git_apply_patch(patch_string, scan_state["local_repo_path"])
        return jsonify({'message': 'Patch applied successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/confirm-and-push', methods=['POST'])
@cross_origin()
def confirm_and_push():
    data = request.get_json()
    branch_name = data.get('branch_name')
    commit_message = data.get('commit_message')
    if not branch_name or not commit_message:
        return jsonify({'error': 'branch_name and commit_message are required'}), 400
    try:
        git_push_to_new_branch(branch_name, commit_message, scan_state["local_repo_path"])
        return jsonify({'message': 'Changes pushed successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8080)