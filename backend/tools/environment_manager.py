import os
import uuid
import tarfile
from typing import Tuple
from google.cloud import storage
from google.cloud.devtools import cloudbuild_v1
from google.cloud import run_v2

def _upload_source_to_gcs(local_repo_path: str, project_id: str, bucket_name: str) -> str:
    """Uploads the source code to a GCS bucket and returns the object name."""
    object_name = f"source-{uuid.uuid4()}.tar.gz"
    tarball_path = f"/tmp/{object_name}"
    with tarfile.open(tarball_path, "w:gz") as tar:
        tar.add(local_repo_path, arcname=os.path.basename(local_repo_path))

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
    build_result = operation.result()
    if build_result.status != cloudbuild_v1.Build.Status.SUCCESS:
        raise Exception(f"Cloud Build failed: {build_result.log_url}")

    run_client = run_v2.ServicesClient()
    service_name = f"sandbox-{uuid.uuid4()}"
    parent = f"projects/{project_id}/locations/{region}"
    service = {
        "template": {
            "containers": [{"image": image_name}],
        }
    }
    operation = run_client.create_service(parent=parent, service=service, service_id=service_name)
    service_result = operation.result()
    return service_result.uri, service_name

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
