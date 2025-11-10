import os
import shutil
import zipfile
import base64
import json
import time
import tempfile
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS, cross_origin
from flask_swagger_ui import get_swaggerui_blueprint

from agents.planning_agent import create_attack_plan
from agents.fixer_agent import generate_fixes
from agents.sast_agent import run_sast_scan
from agents.dast_agent import run_dast_scan
from tools.environment_manager import deploy_to_sandbox, destroy_sandbox
from tools.git_workspace import git_apply_patch
from tools.dockerfile_generator import generate_dockerfile

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB

# Swagger UI configuration
SWAGGER_URL = '/api/docs'
API_URL = '/api/swagger.json'

swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL,
    API_URL,
    config={
        'app_name': "RiskGuard Security Scanner API"
    }
)

app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)

GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "your-gcp-project-id")
GCP_REGION = os.environ.get("GCP_REGION", "us-central1")
GCS_BUCKET_NAME = os.environ.get("GCS_BUCKET_NAME", "your-gcs-bucket-name")
LOCAL_REPO_PATH = os.path.join(tempfile.gettempdir(), 'repo')
SKIP_GCP_DEPLOYMENT = os.environ.get("SKIP_GCP_DEPLOYMENT", "true").lower() == "true"

scan_state = {
    "local_repo_path": LOCAL_REPO_PATH,
}

@app.route('/api/swagger.json')
def swagger_spec():
    """Serve the OpenAPI specification file"""
    return send_from_directory('.', 'swagger.json')

@app.route('/api/scan', methods=['POST'])
@cross_origin()
def start_full_scan() -> Response:
    """
    Accepts a Base64-encoded ZIP file, extracts it, and starts the scanning process.
    This tool orchestrates the initial part of the scan including sandbox deployment
    and SAST scanning.
    """
    data = request.get_json()
    if 'zip_file_base64' not in data:
        return jsonify({'error': 'zip_file_base64 not found in request'}), 400
    
    zip_file_base64 = data['zip_file_base64']
    
    def generate_scan_events():
        yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'start', 'log': {'message': 'Scan initiated...', 'type': 'info', 'timestamp': time.time()}}})}\n\n"

        # Decode and extract the zip file
        zip_content = base64.b64decode(zip_file_base64)
        if os.path.exists(LOCAL_REPO_PATH):
            shutil.rmtree(LOCAL_REPO_PATH)
        os.makedirs(LOCAL_REPO_PATH, exist_ok=True)
        zip_path = os.path.join(tempfile.gettempdir(), "source.zip")
        with open(zip_path, 'wb') as f:
            f.write(zip_content)
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(LOCAL_REPO_PATH)
        os.remove(zip_path)

        extracted_files = os.listdir(LOCAL_REPO_PATH)
        if len(extracted_files) == 1 and os.path.isdir(os.path.join(LOCAL_REPO_PATH, extracted_files[0])):
            sub_dir = os.path.join(LOCAL_REPO_PATH, extracted_files[0])
            for item in os.listdir(sub_dir):
                shutil.move(os.path.join(sub_dir, item), LOCAL_REPO_PATH)
            os.rmdir(sub_dir)

        dockerfile_path, _ = generate_dockerfile(LOCAL_REPO_PATH)
        yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'generate_dockerfile', 'log': {'message': f'Dockerfile is at {dockerfile_path}', 'type': 'info', 'timestamp': time.time()}}})}\n\n"

        # Deploy Sandbox (skip if SKIP_GCP_DEPLOYMENT is true)
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'deploy_sandbox', 'status': 'active'}})}\n\n"
        
        if SKIP_GCP_DEPLOYMENT:
            # Skip GCP deployment - use localhost for testing
            service_url = "http://localhost:8000"
            service_name = "local-testing"
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'deploy_sandbox', 'log': {'message': 'Skipping GCP deployment (local testing mode)', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'deploy_sandbox', 'log': {'message': f'Using local URL: {service_url}', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        else:
            # Iterate through the deploy_to_sandbox generator to get logs and final result
            service_url = None
            service_name = None
            for item in deploy_to_sandbox(LOCAL_REPO_PATH, GCP_PROJECT_ID, GCP_REGION, GCS_BUCKET_NAME):
                if isinstance(item, tuple) and len(item) == 2:
                    # This is the final result (service_url, service_name)
                    service_url, service_name = item
                else:
                    # This is a log entry - forward it as SSE
                    yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'deploy_sandbox', 'log': {'message': str(item), 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        
        scan_state["sandbox_url"] = service_url
        scan_state["service_name"] = service_name
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'deploy_sandbox', 'status': 'success'}})}\n\n"

        # SAST Scan
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'sast_scan', 'status': 'active'}})}\n\n"
        sast_report = run_sast_scan(LOCAL_REPO_PATH)
        scan_state["sast_report"] = sast_report
        yield f"data: {json.dumps({'type': 'state', 'payload': {'sast_report': sast_report}})}\n\n"
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'sast_scan', 'status': 'success'}})}\n\n"

        # Generate Fixes
        fixes = generate_fixes(sast_report, LOCAL_REPO_PATH)
        scan_state["suggested_fixes"] = fixes
        yield f"data: {json.dumps({'type': 'state', 'payload': {'suggested_fixes': fixes}})}\n\n"

        yield f"data: {json.dumps({'type': 'control', 'payload': {'status': 'paused'}})}\n\n"

    return Response(generate_scan_events(), mimetype='text/event-stream')

@app.route('/api/apply-fix', methods=['POST'])
@cross_origin()
def apply_fix() -> Dict[str, Any]:
    """
    Applies a patch and updates the scan state.
    """
    data = request.get_json()
    patch = data.get('patch')
    current_graph_state = data.get('graph_state', {})
    
    scan_state.update(current_graph_state)
    git_apply_patch(patch, scan_state["local_repo_path"])
    return jsonify(scan_state)

@app.route('/api/continue-scan', methods=['POST'])
@cross_origin()
def continue_scan() -> Response:
    """
    Continues the scan with DAST and then cleans up the environment.
    """
    data = request.get_json()
    current_graph_state = data.get('graph_state', {})
    scan_state.update(current_graph_state)

    def generate_dast_events():
        # Plan Attack
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'plan_attack', 'status': 'active'}})}\n\n"
        attack_plan = create_attack_plan(scan_state["sast_report"], scan_state["sandbox_url"])
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'plan_attack', 'status': 'success'}})}\n\n"

        # DAST Scan
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'run_dast', 'status': 'active'}})}\n\n"
        dast_report = run_dast_scan(attack_plan)
        scan_state["dast_report"] = dast_report
        yield f"data: {json.dumps({'type': 'state', 'payload': {'dast_report': dast_report}})}\n\n"
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'run_dast', 'status': 'success'}})}\n\n"

        # Destroy Sandbox
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'destroy_sandbox', 'status': 'active'}})}\n\n"
        if SKIP_GCP_DEPLOYMENT:
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'destroy_sandbox', 'log': {'message': 'Skipping GCP cleanup (local testing mode)', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        else:
            destroy_sandbox(scan_state["service_name"], GCP_PROJECT_ID, GCP_REGION)
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'destroy_sandbox', 'status': 'success'}})}\n\n"

    return Response(generate_dast_events(), mimetype='text/event-stream')

@app.route('/api/download', methods=['POST'])
@cross_origin()
def download_fixed_code() -> Dict[str, str]:
    """
    Zips the fixed code and returns it as a Base64-encoded string.
    """
    data = request.get_json()
    current_graph_state = data.get('graph_state', {})
    scan_state.update(current_graph_state)
    zip_base = os.path.join(tempfile.gettempdir(), "fixed_source")
    zip_path = shutil.make_archive(zip_base, 'zip', scan_state["local_repo_path"])
    with open(zip_path, 'rb') as f:
        zip_content = f.read()
    os.remove(zip_path)
    return jsonify({"data": base64.b64encode(zip_content).decode('utf-8')})

if __name__ == '__main__':
    # Disable debug mode to avoid watchdog reloader issues
    app.run(host='0.0.0.0', port=8080, debug=False)
