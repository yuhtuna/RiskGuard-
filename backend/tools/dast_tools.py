import os
import requests
try:
    import google.auth
    import google.auth.transport.requests
except ImportError:
    # google-auth not available, will use local mode
    pass

def execute_exploit(attack_step: dict) -> dict:
    """
    Triggers a secure, isolated Cloud Run Job to execute a single DAST attack step.
    In local testing mode, performs a simplified vulnerability test.

    Args:
        attack_step: A dictionary representing the attack step to execute.

    Returns:
        A dictionary with the result of the exploit attempt.
    """
    # The URL of the secure Cloud Run Job responsible for running exploits.
    # This should be configured as an environment variable.
    cloud_run_job_url = os.environ.get("DAST_JOB_URL")
    skip_gcp = os.environ.get("SKIP_GCP_DEPLOYMENT", "true").lower() == "true"
    
    # If in local testing mode, perform a simplified test
    if skip_gcp or not cloud_run_job_url:
        return _execute_local_exploit(attack_step)

    print(f"Triggering exploit job for: {attack_step['description']}")

    # Get an identity token for authenticating to the Cloud Run Job.
    # This assumes the current environment has the necessary permissions.
    auth_req = google.auth.transport.requests.Request()
    id_token = google.auth.id_token.fetch_id_token(auth_req, cloud_run_job_url)

    headers = {
        "Authorization": f"Bearer {id_token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(
            cloud_run_job_url,
            json=attack_step,
            headers=headers,
            timeout=300 # 5 minute timeout for the job
        )
        response.raise_for_status()  # Raise an exception for bad status codes
        return response.json()
    except requests.exceptions.RequestException as e:
        return {
            'success': False,
            'proof': 'Failed to trigger or complete the DAST job.',
            'output': str(e)
        }


def _execute_local_exploit(attack_step: dict) -> dict:
    """
    Performs a simplified local DAST test without Cloud Run.
    Attempts to make HTTP requests to test vulnerabilities.
    
    Args:
        attack_step: A dictionary representing the attack step to execute.
    
    Returns:
        A dictionary with the result of the exploit attempt.
    """
    print(f"[DAST Local] Testing: {attack_step.get('description', 'Unknown')}")
    
    target_url = attack_step.get('target_url', '')
    method = attack_step.get('method', 'GET').upper()
    headers = attack_step.get('headers', {})
    payload = attack_step.get('payload', {})
    vuln_type = attack_step.get('vulnerability_type', 'Unknown')
    
    # If no target URL or it's pointing to localhost that doesn't exist, simulate result
    if not target_url or 'localhost' in target_url or '127.0.0.1' in target_url:
        print(f"[DAST Local] Target is localhost/missing - simulating test for {vuln_type}")
        # Simulate a test result based on vulnerability type
        return {
            'status': 'FAILURE',
            'proof_of_exploit': None,
            'vulnerability_type': vuln_type,
            'message': f'Local testing mode: Cannot test against {target_url or "missing URL"}. Deploy to Cloud Run for full DAST testing.'
        }
    
    # Try to make the actual HTTP request
    try:
        if method == 'GET':
            response = requests.get(target_url, headers=headers, params=payload, timeout=10)
        elif method == 'POST':
            response = requests.post(target_url, headers=headers, json=payload, timeout=10)
        elif method == 'PUT':
            response = requests.put(target_url, headers=headers, json=payload, timeout=10)
        elif method == 'DELETE':
            response = requests.delete(target_url, headers=headers, timeout=10)
        else:
            response = requests.request(method, target_url, headers=headers, json=payload, timeout=10)
        
        # Basic heuristics to determine if exploit might have succeeded
        response_text = response.text.lower()
        status_code = response.status_code
        
        # Check for common success indicators
        success_indicators = [
            'error' in response_text and 'sql' in response_text,  # SQL error
            'syntax error' in response_text,
            'mysql' in response_text or 'postgresql' in response_text,
            status_code == 500 and 'injection' in vuln_type.lower(),
            '<script>' in response_text and 'xss' in vuln_type.lower(),
        ]
        
        if any(success_indicators):
            return {
                'status': 'SUCCESS',
                'proof_of_exploit': f'Response contained indicators of {vuln_type}. Status: {status_code}',
                'vulnerability_type': vuln_type,
                'response_snippet': response_text[:200]
            }
        else:
            return {
                'status': 'FAILURE',
                'proof_of_exploit': None,
                'vulnerability_type': vuln_type,
                'message': f'Request completed but no exploit indicators found. Status: {status_code}'
            }
    
    except requests.exceptions.RequestException as e:
        return {
            'status': 'FAILURE',
            'proof_of_exploit': None,
            'vulnerability_type': vuln_type,
            'message': f'Request failed: {str(e)}'
        }
