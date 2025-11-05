import os
import uuid
import tarfile
from typing import Tuple
from google.cloud import storage
from google.cloud.devtools import cloudbuild_v1
from google.cloud import run_v2
import time

class CloudBuildLogStreamer:
    def __init__(self, build_id, project_id):
        self.build_id = build_id
        self.project_id = project_id
        self.storage_client = storage.Client(project=project_id)
        self.build_client = cloudbuild_v1.CloudBuildClient()
        self.last_log_index = 0

    def _get_log_bucket_and_object(self):
        build = self.build_client.get_build(project_id=self.project_id, id=self.build_id)
        log_url = build.log_url
        if not log_url:
            return None, None
        
        parts = log_url.replace("https://console.cloud.google.com/logs/viewer?project=", "").split("&resource=build%2Fbuild_id%2F")
        log_bucket_path = build.logs_bucket
        if not log_bucket_path:
            return None, None
            
        bucket_name = log_bucket_path.split('/')[-1]
        object_name = f"log-{self.build_id}.txt"
        return bucket_name, object_name

    def stream_logs(self):
        bucket_name, object_name = self._get_log_bucket_and_object()
        if not bucket_name or not object_name:
            yield "Waiting for log URL to be generated..."
            time.sleep(3)
            bucket_name, object_name = self._get_log_bucket_and_object()
            if not bucket_name or not object_name:
                yield "Could not retrieve log location."
                return

        bucket = self.storage_client.bucket(bucket_name)
        blob = bucket.blob(object_name)
        
        while True:
            build = self.build_client.get_build(project_id=self.project_id, id=self.build_id)
            
            try:
                # Download logs in chunks
                log_content_bytes = blob.download_as_bytes(start=self.last_log_index)
                log_content = log_content_bytes.decode('utf-8', errors='ignore')
                
                if log_content:
                    lines = log_content.splitlines()
                    for line in lines:
                        # Process and yield each line
                        # This simple implementation yields raw lines.
                        # A more advanced version could parse the structured log format.
                        yield line
                    self.last_log_index += len(log_content_bytes)

            except Exception as e:
                # Handle cases where the log file might not be fully written yet
                pass

            if build.status not in (cloudbuild_v1.Build.Status.QUEUED, cloudbuild_v1.Build.Status.WORKING):
                # Final check to get any remaining logs
                try:
                    log_content_bytes = blob.download_as_bytes(start=self.last_log_index)
                    if log_content_bytes:
                        yield log_content_bytes.decode('utf-8', errors='ignore')
                except Exception:
                    pass
                break 
            
            time.sleep(2) # Poll every 2 seconds

def _upload_source_to_gcs(local_repo_path: str, project_id: str, bucket_name: str) -> str:
    """Uploads the source code to a GCS bucket and returns the object name."""
    object_name = f"source-{uuid.uuid4()}.tar.gz"
    tarball_path = f"/tmp/{object_name}"
    with tarfile.open(tarball_path, "w:gz") as tar:
        tar.add(local_repo_path, arcname='.')

    storage_client = storage.Client(project=project_id)
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(object_name)
    blob.upload_from_filename(tarball_path)
    os.remove(tarball_path)
    return object_name

def deploy_to_sandbox(local_repo_path: str, project_id: str, region: str, bucket_name: str) -> Tuple[str, str]:
    """
    Deploys a containerized application to a temporary Cloud Run service.
    Returns the service URL and the full service name.
    """
    source_object = _upload_source_to_gcs(local_repo_path, project_id, bucket_name)
    build_client = cloudbuild_v1.CloudBuildClient()
    image_name = f"gcr.io/{project_id}/sandbox-{uuid.uuid4()}"
    build = {
        "source": {"storage_source": {"bucket": bucket_name, "object": source_object}},
        "steps": [
            {
                "name": "gcr.io/cloud-builders/docker",
                "args": ["build", "-t", image_name, "."],
            }
        ],
        "images": [image_name],
    }
    operation = build_client.create_build(project_id=project_id, build=build)
    
    # Stream build logs
    build_id = operation.metadata.build.id
    streamer = CloudBuildLogStreamer(build_id, project_id)
    for log_entry in streamer.stream_logs():
        yield log_entry

    build_result = operation.result()
    
    if build_result.status != cloudbuild_v1.Build.Status.SUCCESS:
        failure_info = build_result.failure_info
        error_message = "Build failed"
        if failure_info:
            error_message += f": {failure_info.detail}"
        raise Exception(error_message)

    run_client = run_v2.ServicesClient()
    service_name = f"sandbox-{uuid.uuid4()}"
    parent = f"projects/{project_id}/locations/{region}"
    service = {
        "template": {
            "containers": [{
                "image": image_name,
                "ports": [{"container_port": 80}]
            }],
        }
    }
    operation = run_client.create_service(parent=parent, service=service, service_id=service_name)
    
    # Wait for the operation to complete
    operation.result()

    # After the operation is done, get the service to ensure it's ready and has a URI
    # This is a more reliable way to get the final state of the service
    # Add a short delay and retries to handle potential propagation delays
    service_uri = None
    for _ in range(5): # Retry up to 5 times
        try:
            service_info = run_client.get_service(name=f"{parent}/services/{service_name}")
            if service_info.uri:
                service_uri = service_info.uri
                break
        except Exception:
            # Service might not be fully available yet
            pass
        time.sleep(5) # Wait 5 seconds before retrying

    if not service_uri:
        raise Exception(f"Could not retrieve URI for service {service_name} after deployment.")

    yield service_uri, service_name

def destroy_sandbox(service_name: str, project_id: str, region: str) -> None:
    """
    Destroys a temporary Cloud Run service.
    """
    run_client = run_v2.ServicesClient()
    service_path = f"projects/{project_id}/locations/{region}/services/{service_name}"
    try:
        operation = run_client.delete_service(name=service_path)
        operation.result()
        print(f"Successfully deleted service: {service_name}")
    except Exception as e:
        print(f"Error deleting service {service_name}: {e}")
