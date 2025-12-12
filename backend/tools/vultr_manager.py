import os
import time
import requests
import json
import logging
from typing import Tuple, Optional

VULTR_API_KEY = os.environ.get("VULTR_API_KEY")
VULTR_API_URL = "https://api.vultr.com/v2"

# Configuration
# Region: ewr (New Jersey)
REGION = "ewr"
# Plan: vc2-1c-1gb (Basic Cloud Compute)
PLAN = "vc2-1c-1gb"
# OS ID: 1743 is Ubuntu 22.04 LTS x64
OS_ID = 1743

def _get_headers():
    if not VULTR_API_KEY:
        raise ValueError("VULTR_API_KEY environment variable is not set")
    return {
        "Authorization": f"Bearer {VULTR_API_KEY}",
        "Content-Type": "application/json"
    }

def deploy_to_vultr(repo_url: str, branch_name: str, github_token: str):
    """
    Deploys the repository to a Vultr instance.
    Yields status strings and finally yields (service_url, instance_id).
    """
    if not VULTR_API_KEY:
        yield "VULTR_API_KEY not found. Cannot deploy to Vultr."
        raise ValueError("VULTR_API_KEY missing")

    yield "Preparing Vultr deployment configuration..."

    # Inject token into repo_url for authentication
    auth_repo_url = repo_url
    if github_token:
        if repo_url.startswith("https://"):
            auth_repo_url = repo_url.replace("https://", f"https://oauth2:{github_token}@")
        elif repo_url.startswith("http://"):
             auth_repo_url = repo_url.replace("http://", f"http://oauth2:{github_token}@")

    # Create User Data Script
    # 1. Install Docker
    # 2. Clone Repo
    # 3. Build Dockerfile
    # 4. Run Container (Map 80 -> 8080)
    user_data_script = f"""#!/bin/bash
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y docker.io git

# Start Docker
systemctl start docker
systemctl enable docker

# Create app directory
mkdir -p /app
cd /app

# Clone Repository
git clone -b {branch_name} {auth_repo_url} .

# Build Docker Image
docker build -t app:latest .

# Run Container
# The application runs on port 8080 inside the container (based on memory/config)
# We map host port 80 to container port 8080
docker run -d -p 80:8080 app:latest
"""

    # Base64 encode user data
    import base64
    user_data_encoded = base64.b64encode(user_data_script.encode("utf-8")).decode("utf-8")

    payload = {
        "region": REGION,
        "plan": PLAN,
        "os_id": OS_ID,
        "label": f"riskguard-sandbox-{int(time.time())}",
        "user_data": user_data_encoded,
        "backups": "disabled"
    }

    yield "Creating Vultr instance..."
    try:
        response = requests.post(f"{VULTR_API_URL}/instances", headers=_get_headers(), json=payload)
        response.raise_for_status()
        instance_data = response.json().get("instance", {})
        instance_id = instance_data.get("id")
        password = instance_data.get("default_password")

        if not instance_id:
            raise ValueError("Failed to get instance ID from Vultr response")

        yield f"Instance created with ID: {instance_id}. Waiting for active status..."

    except Exception as e:
        yield f"Failed to create Vultr instance: {str(e)}"
        raise

    # Poll for status
    main_ip = None
    status = "pending"
    max_retries = 60 # 5 minutes roughly

    for _ in range(max_retries):
        try:
            r = requests.get(f"{VULTR_API_URL}/instances/{instance_id}", headers=_get_headers())
            if r.status_code == 200:
                inst = r.json().get("instance", {})
                status = inst.get("status")
                server_state = inst.get("server_status")
                main_ip = inst.get("main_ip")

                if status == "active" and main_ip and main_ip != "0.0.0.0":
                    yield f"Instance is active. IP Address: {main_ip}"
                    break

            time.sleep(5)
        except Exception as e:
            pass

    if not main_ip or main_ip == "0.0.0.0":
        yield "Timed out waiting for instance to become active."
        raise TimeoutError("Vultr instance did not become active in time.")

    # Wait for Application Health Check
    service_url = f"http://{main_ip}"
    yield f"Waiting for application to come online at {service_url}..."

    max_health_retries = 60 # 5 minutes for docker build and start
    healthy = False

    for _ in range(max_health_retries):
        try:
            # We use a short timeout so we don't hang if the firewall drops packets
            # (though Vultr default doesn't drop port 80)
            hr = requests.get(service_url, timeout=2)
            if hr.status_code == 200:
                healthy = True
                yield "Application is responding to health check."
                break
        except requests.RequestException:
            pass

        time.sleep(5)

    if not healthy:
        yield "Application failed to respond to health checks. DAST scan may fail."
        # We don't raise here, we let DAST try and fail if it must, so logs are visible

    yield service_url, instance_id

def destroy_vultr_sandbox(instance_id: str):
    """
    Destroys the Vultr instance.
    """
    if not instance_id:
        return

    if not VULTR_API_KEY:
        logging.error("VULTR_API_KEY missing, cannot destroy instance.")
        return

    try:
        logging.info(f"Destroying Vultr instance {instance_id}...")
        response = requests.delete(f"{VULTR_API_URL}/instances/{instance_id}", headers=_get_headers())
        if response.status_code in [204, 404]:
             logging.info(f"Successfully destroyed instance {instance_id}")
        else:
             logging.error(f"Failed to destroy instance {instance_id}: {response.text}")
    except Exception as e:
        logging.error(f"Error destroying Vultr instance: {e}")
