param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectId,
    
    [string]$Region = "us-central1",
    [string]$ServiceName = "riskguard-app"
)

$ErrorActionPreference = "Stop"

Write-Host "=== RiskGuard Cloud Run Deployment ===" -ForegroundColor Cyan
Write-Host "Project ID: $ProjectId"
Write-Host "Region: $Region"
Write-Host "Service Name: $ServiceName"
Write-Host ""

# 1. Set Project
Write-Host "1. Setting active project..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# 2. Enable APIs
Write-Host "2. Enabling required APIs (Cloud Build, Cloud Run, Artifact Registry)..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com

# 3. Build Image
$ImageName = "gcr.io/$ProjectId/$ServiceName"
Write-Host "3. Building container image using Cloud Build..." -ForegroundColor Yellow
Write-Host "   Image: $ImageName"
gcloud builds submit --tag $ImageName .

# 4. Deploy
Write-Host "4. Deploying to Cloud Run..." -ForegroundColor Yellow
# Note: We allow unauthenticated invocations so the website is public.
# We set 2GB memory and 1 CPU as a baseline.
gcloud run deploy $ServiceName `
    --image $ImageName `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --port 8080 `
    --memory 2Gi `
    --set-env-vars "GCP_PROJECT_ID=$ProjectId,GCP_REGION=$Region,SANDBOX_PROVIDER=GCP"

Write-Host ""
Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host "Your application is available at the URL above."
Write-Host "Don't forget to set your API Keys (RAINDROP_API_KEY, OPENAI_API_KEY) in the Cloud Run Console!" -ForegroundColor Magenta
