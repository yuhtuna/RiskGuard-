import os
import langchain
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Suppress verbose output from langchain if necessary
langchain.verbose = False

def generate_dockerfile(project_path):
    """
    Analyzes a project directory and generates a suitable Dockerfile if one doesn't exist.
    """
    dockerfile_path = os.path.join(project_path, 'Dockerfile')

    if os.path.exists(dockerfile_path):
        return dockerfile_path, None

    # --- Node.js Detection ---
    if os.path.exists(os.path.join(project_path, 'package.json')):
        dockerfile_content = """
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
"""
        with open(dockerfile_path, 'w') as f:
            f.write(dockerfile_content)
        return dockerfile_path, dockerfile_content

    # --- Python Detection (Relaxed) ---
    if os.path.exists(os.path.join(project_path, 'requirements.txt')):
        # Check for app entry point
        app_file = "main.py"
        if os.path.exists(os.path.join(project_path, "app.py")):
            app_file = "app.py"

        app_name = os.path.splitext(app_file)[0]

        # Generate entrypoint.sh
        entrypoint_content = f"""#!/bin/sh
set -e
if [ -z "$PORT" ]; then
  PORT=8080
fi
# Try to run with gunicorn if available, else python
if grep -q "gunicorn" requirements.txt; then
    exec gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120 {app_name}:app
else
    exec python {app_file}
fi
"""
        with open(os.path.join(project_path, 'entrypoint.sh'), 'w', newline='\n') as f:
            f.write(entrypoint_content)
        os.chmod(os.path.join(project_path, 'entrypoint.sh'), 0o755)

        dockerfile_content = """
FROM python:3.9-slim
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
WORKDIR /app
COPY requirements.txt .
RUN if grep -q "pywin32" requirements.txt; then sed -i '/pywin32/d' requirements.txt; fi
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
"""
        with open(dockerfile_path, 'w') as f:
            f.write(dockerfile_content)
        return dockerfile_path, dockerfile_content

    # --- AI Fallback ---
    try:
        return generate_dockerfile_with_llm(project_path)
    except Exception as e:
        print(f"LLM Dockerfile generation failed: {e}")
        raise ValueError("Could not determine project type to generate a Dockerfile. Please provide a Dockerfile.")

def generate_dockerfile_with_llm(project_path):
    """
    Uses an LLM to generate a Dockerfile based on file structure and README.
    """
    # Collect file structure (limit to top 2 levels and non-hidden files)
    file_list = []
    for root, dirs, files in os.walk(project_path):
        depth = root[len(project_path):].count(os.sep)
        if depth > 2:
            continue
        for file in files:
            if not file.startswith('.'):
                file_list.append(os.path.join(root, file).replace(project_path, '').lstrip(os.sep))

    # Read README if exists
    readme_content = ""
    readme_path = os.path.join(project_path, 'README.md')
    if os.path.exists(readme_path):
        try:
            with open(readme_path, 'r', encoding='utf-8', errors='ignore') as f:
                readme_content = f.read(2000) # Read first 2000 chars
        except:
            pass

    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0.2)
    prompt = PromptTemplate.from_template("""
You are a Senior DevOps Engineer.
I have a project with the following file structure:
{file_list}

Here is the beginning of the README:
{readme_content}

Generate a production-ready `Dockerfile` for this application.
- Assume port 8080 if web server.
- Use official slim images where possible.
- Return ONLY the Dockerfile content. Do not include markdown formatting like ```dockerfile.
""")

    chain = prompt | llm | StrOutputParser()

    response = chain.invoke({
        "file_list": "\n".join(file_list),
        "readme_content": readme_content
    })

    # Clean response
    cleaned = response.strip()
    if cleaned.startswith("```dockerfile"):
        cleaned = cleaned[13:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    if not cleaned or "FROM" not in cleaned.upper():
        raise ValueError("Generated content does not look like a Dockerfile")

    dockerfile_path = os.path.join(project_path, 'Dockerfile')
    with open(dockerfile_path, 'w') as f:
        f.write(cleaned)

    return dockerfile_path, cleaned
