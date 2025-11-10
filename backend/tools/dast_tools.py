import os
import requests
import google.auth
import google.auth.transport.requests

def execute_exploit(attack_step: dict) -> dict:
    """
    Triggers a secure, isolated Cloud Run Job to execute a single DAST attack step.

    Args:
        attack_step: A dictionary representing the attack step to execute.

    Returns:
        A dictionary with the result of the exploit attempt.
    """
    # The URL of the secure Cloud Run Job responsible for running exploits.
    # This should be configured as an environment variable.
    cloud_run_job_url = os.environ.get("DAST_JOB_URL")
    if not cloud_run_job_url:
        raise ValueError("DAST_JOB_URL environment variable is not set.")

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
