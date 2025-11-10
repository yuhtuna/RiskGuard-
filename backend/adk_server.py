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
from agents.fixer_agent import generate_fixes, generate_fixes_with_fallback
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
SKIP_GCP_DEPLOYMENT = os.environ.get("SKIP_GCP_DEPLOYMENT", "true").lower() == "true"

# Use a unique temp directory per scan to avoid permission conflicts
scan_state = {
    "local_repo_path": None,  # Will be set per scan
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

        # Create a unique temp directory for this scan to avoid permission conflicts
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        local_repo_path = os.path.join(tempfile.gettempdir(), f'riskguard_scan_{unique_id}')
        
        # Decode and extract the zip file
        zip_content = base64.b64decode(zip_file_base64)
        if os.path.exists(local_repo_path):
            try:
                shutil.rmtree(local_repo_path, ignore_errors=True)
            except Exception as e:
                yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'cleanup', 'log': {'message': f'Warning: cleanup error: {e}', 'type': 'warning', 'timestamp': time.time()}}})}\n\n"
        
        os.makedirs(local_repo_path, exist_ok=True)
        scan_state["local_repo_path"] = local_repo_path
        
        zip_path = os.path.join(tempfile.gettempdir(), f"source_{unique_id}.zip")
        with open(zip_path, 'wb') as f:
            f.write(zip_content)
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(local_repo_path)
        finally:
            try:
                os.remove(zip_path)
            except Exception:
                pass  # Best effort cleanup

        extracted_files = os.listdir(local_repo_path)
        if len(extracted_files) == 1 and os.path.isdir(os.path.join(local_repo_path, extracted_files[0])):
            sub_dir = os.path.join(local_repo_path, extracted_files[0])
            for item in os.listdir(sub_dir):
                shutil.move(os.path.join(sub_dir, item), local_repo_path)
            os.rmdir(sub_dir)

        dockerfile_path, _ = generate_dockerfile(local_repo_path)
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
            for item in deploy_to_sandbox(local_repo_path, GCP_PROJECT_ID, GCP_REGION, GCS_BUCKET_NAME):
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
        sast_report = run_sast_scan(local_repo_path)
        scan_state["sast_report"] = sast_report
        yield f"data: {json.dumps({'type': 'state', 'payload': {'sast_report': sast_report}})}\n\n"
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'sast_scan', 'status': 'success'}})}\n\n"

        # Generate Fixes
        fixes = generate_fixes(sast_report, local_repo_path)
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
    try:
        git_apply_patch(patch, scan_state["local_repo_path"])
    except Exception as e:
        # Return structured JSON error so frontend can display a meaningful message
        return jsonify({"error": f"Failed to apply patch: {str(e)}"}), 500

    return jsonify(scan_state)

@app.route('/api/continue-scan', methods=['POST'])
@cross_origin()
def continue_scan() -> Response:
    """
    Continues the scan with DAST and then cleans up the environment.
    Re-deploys the patched code to a NEW sandbox before running DAST attacks.
    """
    data = request.get_json()
    current_graph_state = data.get('graph_state', {})
    scan_state.update(current_graph_state)

    def generate_dast_events():
        # Re-deploy the patched code to test if fixes work
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'deploy_sandbox', 'status': 'active'}})}\n\n"
        yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'deploy_sandbox', 'log': {'message': 'Re-deploying patched code to new sandbox for DAST testing...', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        
        if SKIP_GCP_DEPLOYMENT:
            # Skip GCP deployment - use localhost for testing
            service_url = "http://localhost:8000"
            service_name = "local-testing-patched"
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'deploy_sandbox', 'log': {'message': 'Skipping GCP deployment (local testing mode)', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'deploy_sandbox', 'log': {'message': f'Using local URL: {service_url}', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        else:
            # Deploy the patched code to a new sandbox
            service_url = None
            service_name = None
            for item in deploy_to_sandbox(scan_state["local_repo_path"], GCP_PROJECT_ID, GCP_REGION, GCS_BUCKET_NAME):
                if isinstance(item, tuple) and len(item) == 2:
                    service_url, service_name = item
                else:
                    yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'deploy_sandbox', 'log': {'message': str(item), 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        
        # Update the sandbox URL to the newly deployed patched version
        scan_state["sandbox_url"] = service_url
        scan_state["service_name"] = service_name
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'deploy_sandbox', 'status': 'success'}})}\n\n"
        
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

        # Generate Final Report
        sast_vulnerabilities = scan_state.get("sast_report", {}).get("vulnerabilities", [])
        dast_vulnerabilities = dast_report.get("vulnerabilities", [])
        
        # Determine report status based on findings
        # Check if any DAST vulnerabilities were successfully exploited
        confirmed_vulns = [v for v in dast_vulnerabilities if v.get("status") == "SUCCESS"]
        
        if confirmed_vulns:
            status = "VULNERABILITY_CONFIRMED"
        elif sast_vulnerabilities:
            status = "POTENTIAL_VULNERABILITY"
        else:
            status = "BUILD_FAILED"  # No vulnerabilities found (could also be a success status)
        
        final_report = {
            "status": status,
            "sastReport": sast_vulnerabilities,
            "dastReport": dast_vulnerabilities,
            "sast_findings": sast_vulnerabilities,
            "dast_findings": dast_vulnerabilities,
            "total_vulnerabilities": len(sast_vulnerabilities) + len(dast_vulnerabilities),
            "summary": f"Scan completed. Found {len(sast_vulnerabilities)} SAST issues and {len(dast_vulnerabilities)} DAST issues.",
            "message": f"Security scan complete: {len(confirmed_vulns)} vulnerabilities confirmed, {len(sast_vulnerabilities)} potential issues found."
        }
        scan_state["final_report"] = final_report
        yield f"data: {json.dumps({'type': 'state', 'payload': {'final_report': final_report}})}\n\n"
        yield f"data: {json.dumps({'type': 'control', 'payload': {'status': 'finished'}})}\n\n"

    return Response(generate_dast_events(), mimetype='text/event-stream')

@app.route('/api/download', methods=['POST'])
@cross_origin()
def download_fixed_code() -> Any:
    """
    Zips the fixed code and returns it as a Base64-encoded string.
    """
    data = request.get_json()
    current_graph_state = data.get('graph_state', {})
    scan_state.update(current_graph_state)

    local_path = scan_state.get("local_repo_path")
    if not local_path or not os.path.exists(local_path):
        return jsonify({"error": "Local repository path not found or has been removed."}), 400

    try:
        zip_base = os.path.join(tempfile.gettempdir(), "fixed_source")
        zip_path = shutil.make_archive(zip_base, 'zip', local_path)
        with open(zip_path, 'rb') as f:
            zip_content = f.read()
        os.remove(zip_path)
        return jsonify({"data": base64.b64encode(zip_content).decode('utf-8')})
    except Exception as e:
        return jsonify({"error": f"Failed to create zip archive: {str(e)}"}), 500

@app.route('/api/regenerate-fixes', methods=['POST'])
@cross_origin()
def regenerate_fixes_endpoint() -> Response:
    """
    Regenerates fixes based on the current SAST report and DAST results.
    Uses enhanced fix generation that learns from DAST failures.
    Called when the previous fix failed (DAST exploit succeeded).
    """
    data = request.get_json()
    current_graph_state = data.get('graph_state', {})
    scan_state.update(current_graph_state)

    def generate_fixes_events():
        yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'regenerate_fixes', 'log': {'message': 'Previous fix failed. Analyzing DAST results and generating improved fixes...', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        
        # Use enhanced fix generation with DAST feedback
        dast_report = scan_state.get("dast_report")
        if dast_report:
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'regenerate_fixes', 'log': {'message': 'Using DAST feedback to generate more robust fixes', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
            fixes = generate_fixes_with_fallback(
                scan_state["sast_report"], 
                scan_state["local_repo_path"],
                dast_report
            )
        else:
            fixes = generate_fixes(scan_state["sast_report"], scan_state["local_repo_path"])
        
        scan_state["suggested_fixes"] = fixes
        
        # Clear the old DAST report since we're going to try new fixes
        scan_state["dast_report"] = None
        
        yield f"data: {json.dumps({'type': 'state', 'payload': {'suggested_fixes': fixes, 'dast_report': None}})}\n\n"
        yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'regenerate_fixes', 'log': {'message': f'Generated {len(fixes)} enhanced fix suggestions', 'type': 'success', 'timestamp': time.time()}}})}\n\n"
        yield f"data: {json.dumps({'type': 'control', 'payload': {'status': 'paused'}})}\n\n"

    return Response(generate_fixes_events(), mimetype='text/event-stream')

@app.route('/api/finish', methods=['POST'])
@cross_origin()
def finish_scan() -> Dict[str, Any]:
    """
    Cleans up the sandbox environment.
    """
    data = request.get_json()
    current_graph_state = data.get('graph_state', {})
    scan_state.update(current_graph_state)
    # Destroy Sandbox
    if SKIP_GCP_DEPLOYMENT:
        print("Skipping GCP cleanup (local testing mode)")
    else:
        destroy_sandbox(scan_state["service_name"], GCP_PROJECT_ID, GCP_REGION)
    return jsonify({"status": "Sandbox destroyed"})

if __name__ == '__main__':
    # Disable debug mode to avoid watchdog reloader issues
    app.run(host='0.0.0.0', port=8080, debug=False)
