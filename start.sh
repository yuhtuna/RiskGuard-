#!/bin/bash
set -e

# Start the backend ADK server with Gunicorn
# We'll run this in the background
echo "Starting backend server..."
(cd /app/backend && gunicorn --bind 0.0.0.0:8000 adk_server:app) &

# Start Nginx in the foreground
# This will keep the container running
echo "Starting Nginx..."
nginx -g "daemon off;"
