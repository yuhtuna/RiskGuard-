# HAST Agent Workflow Visualizer

This project is a full-stack application designed to demonstrate an AI-driven security workflow. It clones a user-provided Git repository, deploys it to a temporary sandbox environment on Google Cloud, runs a simulated SAST (Static Application Security Testing) scan, generates potential fixes, and orchestrates a DAST (Dynamic Application Security Testing) scan based on the findings.

## Project Architecture

The application is composed of two main parts:

1.  **Frontend:** A React-based single-page application built with Vite that provides the user interface for initiating scans, viewing progress, and interacting with the results.
2.  **Backend:** A Python Flask server that orchestrates the entire security workflow, including cloning repositories, interacting with Google Cloud services, and running the various scanning and fixing "agents."

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** (v18 or later)
*   **Python** (v3.8 or later)
*   **pip** (Python package installer)
*   **Google Cloud SDK** (`gcloud` CLI)
*   **Git**

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

4.  **Authenticate with Google Cloud:**
    ```bash
    gcloud auth application-default login
    ```

5.  **Set Environment Variables:**
    The backend requires the following environment variables to be set. You can set them directly in your shell or create a `.env` file and use a library like `python-dotenv`.

    *   `GCP_PROJECT_ID`: Your Google Cloud project ID.
    *   `GCP_REGION`: The Google Cloud region where you want to deploy the sandbox services (e.g., `us-central1`).
    *   `GCS_BUCKET_NAME`: The name of your Google Cloud Storage bucket for source code.

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
    *   Run the Flask server:
        ```bash
        python3 main.py
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
2.  Enter the URL of a public Git repository you want to scan.
3.  Click "Start Scan." The backend will begin the workflow, and you will see real-time progress updates in the UI.
4.  The scan will pause after the SAST scan is complete and suggested fixes have been generated.
5.  At this point, you can interact with the application to (these are simulated):
    *   **Apply a Fix:** Triggers the `/api/apply-fix` endpoint to patch the code in the local workspace.
    *   **Run DAST Scan:** Triggers the `/api/run-dast` endpoint to continue the workflow, run the DAST scan, and destroy the sandbox.
    *   **Confirm and Push:** Triggers the `/api/confirm-and-push` endpoint to commit the changes to a new branch and push to the remote repository.
