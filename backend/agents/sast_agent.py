import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from tools.sast_tools import read_source_code
from tools.smart_file_analyzer import select_files_for_scanning

def run_sast_scan(local_repo_path: str) -> dict:
    """
    Runs a generative AI-powered SAST scan on the local repository.
    Uses smart file selection to prioritize high-risk files.
    """
    print("[SAST Agent] Starting smart file selection...")
    
    # Intelligently select the most important files to scan
    selected_files = select_files_for_scanning(
        local_repo_path,
        max_files=20,  # Limit to top 20 files
        max_total_size_kb=500  # Max 500KB total
    )
    
    if not selected_files:
        print("[SAST Agent] No scannable files found")
        return {"vulnerabilities": [], "summary": "No scannable files found."}
    
    print(f"[SAST Agent] Selected {len(selected_files)} high-priority files for scanning:")
    for f in selected_files[:5]:  # Show top 5
        print(f"  - {f['relative_path']} (priority: {f['priority']}, size: {f['size_kb']:.1f}KB)")
    if len(selected_files) > 5:
        print(f"  ... and {len(selected_files) - 5} more files")
    
    # Read selected files
    code_snippets = []
    for file_info in selected_files:
        try:
            content = read_source_code(file_info['path'])
            code_snippets.append(f"--- {file_info['relative_path']} (Priority: {file_info['priority']}) ---\n{content}\n---\n")
        except (FileNotFoundError, UnicodeDecodeError, PermissionError):
            pass

    if not code_snippets:
        return {"vulnerabilities": [], "summary": "Could not read any files."}

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
