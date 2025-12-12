import os
import json
import time
from google.cloud import storage

class EvidenceLocker:
    def __init__(self):
        self.project_id = os.environ.get("GCP_PROJECT_ID")
        self.bucket_name = os.environ.get("GCS_BUCKET_NAME")
        
        if self.project_id and self.bucket_name:
            try:
                self.storage_client = storage.Client(project=self.project_id)
                self.bucket = self.storage_client.bucket(self.bucket_name)
                print(f"Connected to GCS Evidence Locker: {self.bucket_name}")
            except Exception as e:
                print(f"Failed to connect to GCS: {e}")
                self.storage_client = None
        else:
            print("GCP credentials missing. Evidence Locker disabled.")
            self.storage_client = None

    def archive_report(self, scan_id: str, report_type: str, data: dict) -> str:
        """
        Uploads a scan report to GCS and returns the public link.
        """
        if not self.storage_client:
            return None

        try:
            timestamp = int(time.time())
            filename = f"evidence/{scan_id}/{report_type}_{timestamp}.json"
            
            blob = self.bucket.blob(filename)
            blob.upload_from_string(
                json.dumps(data, indent=2),
                content_type="application/json"
            )
            
            # Generate a link (assuming bucket is private, we might need a signed URL or just the console link)
            # For hackathon demo, a console link is often enough proof
            console_link = f"https://console.cloud.google.com/storage/browser/_details/{self.bucket_name}/{filename}"
            return console_link

        except Exception as e:
            print(f"Failed to archive evidence: {e}")
            return None

# Singleton
evidence_locker = EvidenceLocker()