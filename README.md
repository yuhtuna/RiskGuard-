# RiskGuard: Autonomous AI Security Architect

RiskGuard is an advanced, autonomous security platform that uses a multi-agent AI system to **Scan**, **Fix**, **Deploy**, and **Verify** applications automatically. It goes beyond simple reporting by actively healing codebases and verifying fixes in real-world sandbox environments.

![RiskGuard Dashboard](https://via.placeholder.com/800x400?text=RiskGuard+Dashboard+Preview)

## 🚀 Key Features

*   **Autonomous Self-Healing Loop**: Detects vulnerabilities, generates code fixes, applies them, and verifies them without human intervention.
*   **Multi-Agent Architecture**:
    *   **SAST Agent**: Static analysis to find code flaws.
    *   **Fixer Agent**: Generates context-aware patches using LLMs.
    *   **Planning Agent**: Orchestrates the attack and verification strategy.
    *   **DAST Agent**: Executes dynamic exploits against a live sandbox to confirm vulnerabilities.
*   **Liquid Metal Integration**:
    *   **SmartBuckets**: Uses `riskguard-state` for session persistence and `riskguard-playbook` for storing security findings.
    *   **Evidence Locker**: Securely archives scan reports and proof-of-exploit data.
*   **Multi-Cloud Sandbox Support**:
    *   **Google Cloud Run**: Deploys sandboxes to serverless containers.
    *   **Vultr**: Deploys sandboxes to high-performance cloud instances.
*   **Interactive Dashboard**: Real-time visualization of the agent's thought process, scan progress, and vulnerability reports.

## 🏗️ Architecture

RiskGuard consists of a **React Frontend** and a **Python Flask Backend**.

```mermaid
graph TD
    User[User] -->|Uploads Repo| Frontend[React Frontend]
    Frontend -->|SSE Stream| Backend[Flask Backend]
    Backend -->|Persist State| LM[Liquid Metal SmartBuckets]
    Backend -->|Clone & Scan| SAST[SAST Agent]
    SAST -->|Report| Fixer[Fixer Agent]
    Fixer -->|Apply Patch| Git[Git Workspace]
    Git -->|Deploy| Sandbox[Cloud Sandbox (GCP/Vultr)]
    Sandbox -->|Verify| DAST[DAST Agent]
    DAST -->|Confirm| Report[Final Report]
```

## 🛠️ Prerequisites

*   **Node.js** (v18+)
*   **Python** (v3.12+)
*   **Docker** (for containerization)
*   **Google Cloud SDK** (if using GCP sandboxes)
*   **Liquid Metal Account** (for SmartBuckets)

## ⚙️ Configuration

Create a `.env` file in the `backend/` directory with the following variables:

```ini
# --- Core Security ---
OPENAI_API_KEY=sk-...          # Required for AI Agents
RAINDROP_API_KEY=...           # Required for Liquid Metal SmartBuckets

# --- Sandbox Provider (GCP or VULTR) ---
SANDBOX_PROVIDER=GCP           # or VULTR
SKIP_GCP_DEPLOYMENT=false      # Set to true for local-only testing

# --- Google Cloud Config (if using GCP) ---
GCP_PROJECT_ID=your-project-id
GCP_REGION=us-central1
GCS_BUCKET_NAME=your-evidence-bucket

# --- Vultr Config (if using Vultr) ---
VULTR_API_KEY=...

# --- GitHub Integration ---
GITHUB_TOKEN=...               # Optional: For higher API limits and PR creation
```

## 🚀 Getting Started (Local Development)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\Activate.ps1
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
python adk_server.py
```
The backend will start on `http://localhost:8080`.

### 2. Frontend Setup
Open a new terminal:
```bash
npm install
npm run dev
```
The frontend will start on `http://localhost:3000`.

## ☁️ Deployment (Google Cloud Run)

RiskGuard is designed to run as a containerized application on Google Cloud Run.

1.  **Configure Project**:
    Edit `deploy_to_cloud_run.ps1` or run it with parameters.

2.  **Deploy**:
    ```powershell
    .\deploy_to_cloud_run.ps1 -ProjectId "YOUR_GCP_PROJECT_ID"
    ```

3.  **Post-Deployment**:
    Go to the Cloud Run Console and set your `OPENAI_API_KEY` and `RAINDROP_API_KEY` as environment variables.

## 🧪 Usage Guide

1.  **Start a Scan**: Enter a GitHub repository URL (e.g., `https://github.com/user/vulnerable-app`).
2.  **Monitor Progress**: Watch the "Live Agent Feed" as the system clones, scans, and analyzes the code.
3.  **Review Fixes**: The Fixer Agent will propose code changes.
4.  **Verify**: The system will deploy the patched app to a sandbox and run DAST attacks to verify the fix works.
5.  **Remediate**: Click "Create Pull Request" to send the fixed code back to GitHub, or "Download Code" to get a zip file.

## 📂 Project Structure

*   `frontend/`: React application (Vite, Tailwind, Lucide).
*   `backend/`: Python Flask server.
    *   `agents/`: AI logic for SAST, DAST, and Fixing.
    *   `tools/`: Integrations for Git, Docker, Liquid Metal, Vultr, etc.
    *   `adk_server.py`: Main API entry point.
*   `Dockerfile`: Multi-stage build for production.

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

## 📄 License

MIT License - see `LICENSE` for details.
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
