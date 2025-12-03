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

from agents.planning_agent import create_attack_plan, generate_pr_details
from agents.fixer_agent import generate_fixes
from agents.sast_agent import run_sast_scan
from agents.dast_agent import run_dast_scan
from tools.environment_manager import deploy_to_sandbox, destroy_sandbox
from tools.git_workspace import clone_repository, create_branch, commit_changes, push_changes
from tools.dockerfile_generator import generate_dockerfile
from tools.github_client import GitHubClient

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

@app.route('/api/github/login', methods=['POST'])
@cross_origin()
def github_login() -> Dict[str, Any]:
    """
    Validates GitHub token and returns a list of repositories.
    """
    data = request.get_json()
    username = data.get('username')
    token = data.get('token')

    if not token:
        return jsonify({"error": "Token is required"}), 400

    client = GitHubClient(token=token, username=username)
    success, message = client.verify_token()

    if not success:
        return jsonify({"error": message}), 401

    repos = client.list_user_repos()
    return jsonify({"success": True, "message": message, "repos": repos})

@app.route('/api/scan', methods=['POST'])
@cross_origin()
def start_full_scan() -> Response:
    """
    Accepts repo details, clones it, runs SAST, Auto-Fixes, Deploys, and runs DAST.
    This is the Autonomous Self-Healing Loop.
    """
    data = request.get_json()
    repo_url = data.get('repo_url')
    token = data.get('token')
    default_branch = data.get('default_branch', 'main')
    
    if not repo_url:
        return jsonify({'error': 'repo_url not provided'}), 400
    
    def generate_autonomous_events():
        yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'start', 'log': {'message': 'Scan initiated...', 'type': 'info', 'timestamp': time.time()}}})}\n\n"

        # Create a unique temp directory
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        local_repo_path = os.path.join(tempfile.gettempdir(), f'riskguard_scan_{unique_id}')
        
        # Clean up existing
        if os.path.exists(local_repo_path):
            shutil.rmtree(local_repo_path, ignore_errors=True)
        
        scan_state["local_repo_path"] = local_repo_path
        scan_state["repo_url"] = repo_url
        scan_state["token"] = token
        scan_state["default_branch"] = default_branch
        
        # 1. Clone Repo
        yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'file_upload', 'log': {'message': f'Cloning repository {repo_url}...', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        
        try:
            clone_repository(repo_url, local_repo_path, token)
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'file_upload', 'log': {'message': 'Repository cloned successfully', 'type': 'success', 'timestamp': time.time()}}})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'file_upload', 'log': {'message': f'Failed to clone repository: {str(e)}', 'type': 'failure', 'timestamp': time.time()}}})}\n\n"
            return

        # 2. Dockerfile Check/Generation
        try:
            dockerfile_path, _ = generate_dockerfile(local_repo_path)
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'generate_dockerfile', 'log': {'message': f'Dockerfile validated/generated at {dockerfile_path}', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'generate_dockerfile', 'log': {'message': f'Dockerfile generation failed: {str(e)}', 'type': 'failure', 'timestamp': time.time()}}})}\n\n"
            return

        # 3. SAST Scan
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'sast_scan', 'status': 'active'}})}\n\n"
        sast_report = run_sast_scan(local_repo_path)
        scan_state["sast_report"] = sast_report
        yield f"data: {json.dumps({'type': 'state', 'payload': {'sast_report': sast_report}})}\n\n"
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'sast_scan', 'status': 'success'}})}\n\n"

        # 4. Generate Fixes
        yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'generate_fixes', 'log': {'message': 'Generating fixes for detected vulnerabilities...', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        fixes = generate_fixes(sast_report, local_repo_path)
        scan_state["suggested_fixes"] = fixes
        yield f"data: {json.dumps({'type': 'state', 'payload': {'suggested_fixes': fixes}})}\n\n"

        if not fixes:
             yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'generate_fixes', 'log': {'message': 'No vulnerabilities requiring fixes found.', 'type': 'success', 'timestamp': time.time()}}})}\n\n"
             # Optionally verify "Clean" state with DAST here too, but for now we might stop or skip to report
             yield f"data: {json.dumps({'type': 'control', 'payload': {'status': 'finished'}})}\n\n"
             return

        # 5. Auto-Apply Fixes (Self-Healing)
        yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'apply_fix', 'log': {'message': 'Auto-applying fixes to codebase...', 'type': 'info', 'timestamp': time.time()}}})}\n\n"

        timestamp = int(time.time())
        branch_name = f"riskguard-auto-fix-{timestamp}"
        scan_state["fix_branch"] = branch_name

        try:
            create_branch(local_repo_path, branch_name)

            applied_count = 0
            for fix in fixes:
                file_rel_path = fix['file_path']
                fixed_content = fix['fixed_content']
                full_path = os.path.join(local_repo_path, file_rel_path)

                # Overwrite file with fixed content
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(fixed_content)
                applied_count += 1

            commit_changes(local_repo_path, "Auto-applied security fixes by RiskGuard")
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'apply_fix', 'log': {'message': f'Applied {applied_count} fixes and committed to branch {branch_name}', 'type': 'success', 'timestamp': time.time()}}})}\n\n"

        except Exception as e:
             yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'apply_fix', 'log': {'message': f'Failed to auto-apply fixes: {str(e)}', 'type': 'failure', 'timestamp': time.time()}}})}\n\n"
             return

        # 6. Deploy to Sandbox
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'deploy_sandbox', 'status': 'active'}})}\n\n"

        service_url = None
        service_name = None
        
        if SKIP_GCP_DEPLOYMENT:
            service_url = "http://localhost:8000"
            service_name = "local-testing"
            yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'deploy_sandbox', 'log': {'message': 'Skipping GCP deployment (local testing mode)', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        else:
            for item in deploy_to_sandbox(local_repo_path, GCP_PROJECT_ID, GCP_REGION, GCS_BUCKET_NAME):
                if isinstance(item, tuple) and len(item) == 2:
                    service_url, service_name = item
                else:
                    yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'deploy_sandbox', 'log': {'message': str(item), 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        
        scan_state["sandbox_url"] = service_url
        scan_state["service_name"] = service_name
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'deploy_sandbox', 'status': 'success'}})}\n\n"

        # 7. Plan & Run DAST
        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'plan_attack', 'status': 'active'}})}\n\n"
        yield f"data: {json.dumps({'type': 'log', 'payload': {'actionKey': 'plan_attack', 'log': {'message': 'Planning DAST verification...', 'type': 'info', 'timestamp': time.time()}}})}\n\n"
        
        attack_plan = {"steps": []}
        try:
             attack_plan = create_attack_plan(sast_report, service_url)
             scan_state["attack_plan"] = attack_plan
             yield f"data: {json.dumps({'type': 'state', 'payload': {'attack_plan': attack_plan}})}\n\n"
             yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'plan_attack', 'status': 'success'}})}\n\n"
        except Exception as e:
             yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'plan_attack', 'status': 'failure'}})}\n\n"

        yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'run_dast', 'status': 'active'}})}\n\n"
        try:
            dast_report = run_dast_scan(attack_plan)
            scan_state["dast_report"] = dast_report
            yield f"data: {json.dumps({'type': 'state', 'payload': {'dast_report': dast_report}})}\n\n"
            yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'run_dast', 'status': 'success'}})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'node_status', 'payload': {'node': 'run_dast', 'status': 'failure'}})}\n\n"

        # 8. Cleanup
        if not SKIP_GCP_DEPLOYMENT:
             destroy_sandbox(service_name, GCP_PROJECT_ID, GCP_REGION)

        # 9. Final Report
        dast_vulnerabilities = dast_report.get("vulnerabilities", []) if 'dast_report' in locals() and dast_report else []
        confirmed_vulns = [v for v in dast_vulnerabilities if v.get("status") == "SUCCESS"]
        
        status = "VULNERABILITY_CONFIRMED" if confirmed_vulns else "SECURE_VERIFIED"
        
        final_report = {
            "status": status,
            "summary": f"Autonomous scan complete. {len(fixes)} fixes applied. {len(confirmed_vulns)} issues remain exploitable."
        }
        scan_state["final_report"] = final_report
        yield f"data: {json.dumps({'type': 'state', 'payload': {'final_report': final_report}})}\n\n"
        yield f"data: {json.dumps({'type': 'control', 'payload': {'status': 'finished'}})}\n\n"

    response = Response(generate_autonomous_events(), mimetype='text/event-stream')
    response.headers['Cache-Control'] = 'no-cache'
    response.headers['X-Accel-Buffering'] = 'no'
    return response

@app.route('/api/finish', methods=['POST'])
@cross_origin()
def submit_pr() -> Dict[str, Any]:
    """
    Pushes the fix branch and creates a Pull Request.
    """
    data = request.get_json()
    current_graph_state = data.get('graph_state', {})
    scan_state.update(current_graph_state)

    branch_name = scan_state.get("fix_branch")
    token = scan_state.get("token")
    repo_url = scan_state.get("repo_url")
    default_branch = scan_state.get("default_branch", "main")

    if not branch_name or not token:
        return jsonify({"error": "Missing branch or token information"}), 400

    try:
        # Push Changes
        push_changes(scan_state["local_repo_path"], token, branch_name)

        # Generate PR Details
        vulnerabilities = scan_state.get("sast_report", {}).get("vulnerabilities", [])
        pr_details = generate_pr_details(vulnerabilities)

        # Extract repo name from URL or state
        repo_full_name = "/".join(repo_url.rstrip(".git").split("/")[-2:])

        client = GitHubClient(token=token)
        pr_url, msg = client.create_pull_request(
            repo_full_name,
            branch_name,
            default_branch,
            pr_details["title"],
            pr_details["body"]
        )

        if pr_url:
            return jsonify({"pr_url": pr_url})
        else:
            return jsonify({"error": msg}), 500

    except Exception as e:
        return jsonify({"error": f"Failed to submit PR: {str(e)}"}), 500

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
