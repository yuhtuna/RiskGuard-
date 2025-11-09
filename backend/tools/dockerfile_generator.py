import os

def generate_dockerfile(project_path):
    """
    Analyzes a project directory and generates a suitable Dockerfile if one doesn't exist.

    Args:
        project_path (str): The absolute path to the extracted project code.

    Returns:
        str: The path to the Dockerfile that should be used for the build.
             Returns the existing Dockerfile path if found, or the path to the
             newly generated one.
        str: The content of the generated Dockerfile, or None if it already existed.
    """
    dockerfile_path = os.path.join(project_path, 'Dockerfile')

    if os.path.exists(dockerfile_path):
        # If a Dockerfile already exists, do nothing.
        return dockerfile_path, None

    # --- Python/Flask/Gunicorn Detection ---
    if os.path.exists(os.path.join(project_path, 'requirements.txt')):
        # Simple heuristic: assume it's a web app if flask or gunicorn is in requirements
        with open(os.path.join(project_path, 'requirements.txt'), 'r') as f:
            reqs = f.read()
            if 'flask' in reqs.lower() or 'gunicorn' in reqs.lower():
                # Find the main application file (e.g., app.py, main.py)
                app_file = "main.py" # default
                if os.path.exists(os.path.join(project_path, "app.py")):
                    app_file = "app.py"

                app_name = os.path.splitext(app_file)[0]

                entrypoint_content = f"""#!/bin/sh
set -e
# Check if PORT is set, otherwise default to 8080
if [ -z "$PORT" ]; then
  PORT=8080
fi
exec gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120 {app_name}:app
"""
                # Write with Unix-style line endings
                with open(os.path.join(project_path, 'entrypoint.sh'), 'w', newline='\n') as f:
                    f.write(entrypoint_content)
                
                # Make the entrypoint script executable
                os.chmod(os.path.join(project_path, 'entrypoint.sh'), 0o755)

                dockerfile_content = """
# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Copy the dependencies file to the working directory
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
# We'll first try to remove pywin32 if it exists, as it's Windows-only
# and will cause the build to fail on Linux.
RUN if grep -q "pywin32" requirements.txt; then sed -i '/pywin32/d' requirements.txt; fi
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code to the working directory
COPY . .

# Run the entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
"""
                with open(dockerfile_path, 'w') as f:
                    f.write(dockerfile_content)
                return dockerfile_path, dockerfile_content

    # --- Add more detectors here for other languages (Node.js, Java, etc.) ---

    # If no suitable project type is detected, raise an error
    raise ValueError("Could not determine project type to generate a Dockerfile. Please provide a Dockerfile.")
