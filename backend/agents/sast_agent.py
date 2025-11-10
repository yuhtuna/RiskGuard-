import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from tools.sast_tools import read_source_code

def run_sast_scan(local_repo_path: str) -> dict:
    """
    Runs a generative AI-powered SAST scan on the local repository.
    """
    # Scan all code files in the repository
    code_extensions = ['.py', '.js', '.ts', '.java', '.php', '.go', '.rb', '.cs', '.cpp', '.c', '.jsx', '.tsx']
    code_snippets = []
    
    for root, dirs, files in os.walk(local_repo_path):
        # Skip common non-code directories
        dirs[:] = [d for d in dirs if d not in ['node_modules', 'venv', '.git', '__pycache__', 'dist', 'build']]
        
        for file in files:
            if any(file.endswith(ext) for ext in code_extensions):
                file_path = os.path.join(root, file)
                try:
                    content = read_source_code(file_path)
                    relative_path = os.path.relpath(file_path, local_repo_path)
                    code_snippets.append(f"--- {relative_path} ---\n{content}\n---\n")
                except (FileNotFoundError, UnicodeDecodeError, PermissionError):
                    pass

    if not code_snippets:
        return {"vulnerabilities": [], "summary": "No scannable files found."}

    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0.2)
    prompt = PromptTemplate.from_template("""
Analyze the following code snippets for potential security vulnerabilities.

Code snippets:
{code}

IMPORTANT: Return ONLY a valid JSON object in this EXACT format (no markdown, no extra text):
{{
  "vulnerabilities": [
    {{
      "file": "filename.py",
      "line": 10,
      "type": "SQL Injection",
      "severity": "High",
      "description": "Brief description of the vulnerability"
    }}
  ],
  "summary": "Found X vulnerabilities"
}}

If no vulnerabilities found, return:
{{
  "vulnerabilities": [],
  "summary": "No vulnerabilities detected"
}}
""")

    chain = prompt | llm | StrOutputParser()

    response = chain.invoke({"code": "\n".join(code_snippets)})

    try:
        # Clean up common formatting issues
        cleaned = response.strip()
        # Remove markdown code blocks
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
        # Try to parse
        result = json.loads(cleaned)
        
        # Ensure it has the required structure
        if not isinstance(result, dict):
            return {"vulnerabilities": [], "summary": "Invalid report format"}
        if "vulnerabilities" not in result:
            result["vulnerabilities"] = []
        if "summary" not in result:
            result["summary"] = f"Found {len(result['vulnerabilities'])} vulnerabilities"
            
        return result
    except json.JSONDecodeError as e:
        # Try to extract JSON from the response
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            try:
                result = json.loads(json_match.group(0))
                if isinstance(result, dict) and "vulnerabilities" in result:
                    return result
            except:
                pass
        
        return {"vulnerabilities": [], "summary": f"Failed to parse SAST report. Error: {str(e)}"}
