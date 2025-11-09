# HAST Agent Workflow Visualizer

This project is a full-stack application designed to demonstrate an AI-driven security workflow. It analyzes an uploaded user application, deploys it to a temporary sandbox environment on Google Cloud, runs a generative AI-powered SAST (Static Application Security Testing) scan, generates potential fixes, and orchestrates a DAST (Dynamic Application Security Testing) scan based on the findings.

## Project Architecture

The application is composed of two main parts:

1.  **Frontend:** A React-based single-page application built with Vite that provides the user interface for uploading an application, initiating scans, viewing progress, and interacting with the results.
2.  **Backend:** A Python server built with the **Google Application Development Kit (ADK)** that orchestrates the entire security workflow, including interacting with Google Cloud services and running the various scanning and fixing "agents."

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** (v18 or later)
*   **Python** (v3.12 or later)
*   **pip** (Python package installer)
*   **Google Cloud SDK** (`gcloud` CLI)
*   **A Secure Cloud Run Job for DAST:** You must have a separate, secure Cloud Run Job deployed to execute DAST attacks.

## Setup and Configuration

### 1. Google Cloud Project

You will need a Google Cloud project with the following APIs enabled:

*   Cloud Build API (`cloudbuild.googleapis.com`)
*   Cloud Run Admin API (`run.googleapis.com`)
*   Identity and Access Management (IAM) API (`iam.googleapis.com`)
*   Cloud Storage API (`storage.googleapis.com`)

You will also need a Google Cloud Storage (GCS) bucket to temporarily store the source code for the Cloud Build process.

### 2. Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install the required Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    **Note:** The `requirements.txt` file contains pinned versions of all dependencies. This ensures that the application is built with the exact same libraries every time, which leads to faster and more reliable deployments, especially on Google Cloud Run.

4.  **Authenticate with Google Cloud:**
    ```bash
    gcloud auth application-default login
    ```

5.  **Set Environment Variables:**
    The backend requires the following environment variables to be set. You can set them directly in your shell or create a `.env` file and use a library like `python-dotenv`.

    *   `GCP_PROJECT_ID`: Your Google Cloud project ID.
    *   `GCP_REGION`: The Google Cloud region where you want to deploy the sandbox services (e.g., `us-central1`).
    *   `GCS_BUCKET_NAME`: The name of your Google Cloud Storage bucket for source code.
    *   `DAST_JOB_URL`: The URL of your secure Cloud Run Job for executing DAST exploits.

### 3. Frontend Setup

1.  **Navigate to the project root directory.**

2.  **Install the required Node.js dependencies:**
    ```bash
    npm install
    ```

## Running the Application

You will need to run both the backend and frontend servers simultaneously in two separate terminals.

1.  **Start the Backend Server:**
    *   Make sure you are in the `backend` directory with your virtual environment activated.
    *   Ensure your environment variables are set.
    *   Run the ADK server using Flask:
        ```bash
        export FLASK_APP=adk_server.py
        flask run --port=8080
        ```
    The backend server will start on `http://localhost:8080`.

2.  **Start the Frontend Server:**
    *   Navigate to the project root directory.
    *   Run the Vite development server:
        ```bash
        npm run dev
        ```
    The frontend application will be available at `http://localhost:3000`.

## How It Works

1.  Open the application in your browser (`http://localhost:3000`).
2.  Upload a ZIP file of the application you want to scan.
3.  Click "Start Scan." The backend will begin the workflow, and you will see real-time progress updates in the UI.
4.  The scan will pause after the SAST scan is complete and suggested fixes have been generated.
5.  At this point, you can interact with the application to:
    *   **Apply a Fix:** Triggers the backend to patch the code in the local workspace.
    *   **Run DAST Scan:** Continues the workflow, runs the DAST scan against the live sandbox, and finally destroys the sandbox.
    *   **Download Code:** Downloads a ZIP file of the application with the applied fixes.


## 🐳 Docker Support for Uploaded Projects

The application supports scanning projects that include a `Dockerfile` for custom build and deployment. If your uploaded zip file contains a `Dockerfile` at the root, it will be used to build and run your application in the sandbox environment.

If your project does **not** include a `Dockerfile` but contains a `requirements.txt` (for Python projects), the application will attempt to auto-generate a suitable Dockerfile.

---
## ⚠️ Important: Uploading Your Project for Scanning

When uploading your own project (as a zip file) for scanning, **make sure your project folder contains a complete and accurate `requirements.txt` file** listing all Python dependencies your application needs to run. This is critical for successful deployment and scanning in the sandbox environment.

- You can generate a complete `requirements.txt` by running:
  ```bash
  pip freeze > requirements.txt
  ```
- If a required library is missing, your application will fail to start in the sandbox.

**Always double-check your `requirements.txt` before uploading!**
