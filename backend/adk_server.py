import os
import shutil
import zipfile
import base64
import json
import time
from typing import Dict, Any

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
LOCAL_REPO_PATH = '/tmp/repo'

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
    yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'start', 'log': {'message': 'Scan initiated...', 'type': 'info', 'timestamp': time.time()}}})}\n\n"

    # Decode and extract the zip file
    zip_content = base64.b64decode(zip_file_base64)
    if os.path.exists(LOCAL_REPO_PATH):
        shutil.rmtree(LOCAL_REPO_PATH)
    os.makedirs(LOCAL_REPO_PATH, exist_ok=True)
    zip_path = "/tmp/source.zip"
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

    # Deploy Sandbox
    yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'deploy_sandbox', 'status': 'active'}})}\n\n"
    service_url, service_name = deploy_to_sandbox(LOCAL_REPO_PATH, GCP_PROJECT_ID, GCP_REGION, GCS_BUCKET_NAME)
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

    return scan_state

@tool
def apply_fix_and_update_state(patch: str, current_graph_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Applies a patch and updates the scan state.
    """
    scan_state.update(current_graph_state)
    git_apply_patch(patch, scan_state["local_repo_path"])
    return scan_state

@tool
def continue_scan_with_dast(current_graph_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Continues the scan with DAST and then cleans up the environment.
    """
    scan_state.update(current_graph_state)

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
    destroy_sandbox(scan_state["service_name"], GCP_PROJECT_ID, GCP_REGION)
    yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'destroy_sandbox', 'status': 'success'}})}\n\n"

    return scan_state

@tool
def download_fixed_code(current_graph_state: Dict[str, Any]) -> Dict[str, str]:
    """
    Zips the fixed code and returns it as a Base64-encoded string.
    """
    scan_state.update(current_graph_state)
    zip_path = shutil.make_archive("/tmp/fixed_source", 'zip', scan_state["local_repo_path"])
    with open(zip_path, 'rb') as f:
        zip_content = f.read()
    os.remove(zip_path)
    return {"data": base64.b64encode(zip_content).decode('utf-8')}

if __name__ == '__main__':
    adk.run()
