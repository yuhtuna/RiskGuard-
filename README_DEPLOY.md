# Deployment Instructions for Google Cloud Run

## Prerequisites
1.  **Google Cloud SDK (gcloud)** installed and authenticated.
    *   Run `gcloud auth login`
    *   Run `gcloud config set project YOUR_PROJECT_ID`
2.  **Billing enabled** on your Google Cloud Project.

## Deployment Steps

1.  **Open PowerShell** in the project root.
2.  **Run the deployment script**:
    ```powershell
    .\deploy_to_cloud_run.ps1 -ProjectId "YOUR_PROJECT_ID" -Region "us-central1"
    ```
    *   Replace `YOUR_PROJECT_ID` with your actual GCP Project ID.
    *   You can omit `-Region` to default to `us-central1`.

## What the script does
1.  Enables required Google Cloud APIs (Cloud Build, Cloud Run, Artifact Registry).
2.  Builds the Docker image using Cloud Build (this happens in the cloud, so you don't need Docker running locally).
3.  Deploys the image to Cloud Run as a public service.
4.  Outputs the **Service URL**.

## Environment Variables
The script sets default environment variables. You can update them in the Cloud Run console after deployment if needed:
*   `RAINDROP_API_KEY`: (Required for Liquid Metal)
*   `OPENAI_API_KEY`: (Required for AI Agents)
*   `GITHUB_TOKEN`: (Optional, for higher rate limits)
*   `SKIP_GCP_DEPLOYMENT`: Set to `false` if you want the app to deploy real sandboxes to Cloud Run (requires Cloud Run Admin permissions for the service account). Default is `true` (simulated deployment).

**Note:** For security, you should set these secrets in Cloud Run using Secret Manager, but for this demo, you can set them as environment variables.
