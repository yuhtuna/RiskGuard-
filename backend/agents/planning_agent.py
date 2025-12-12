from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import json

def create_attack_plan(sast_report: dict, sandbox_url: str) -> dict:
    """
    Creates a DAST attack plan based on the SAST report.
    """
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0.5)
    prompt = PromptTemplate.from_template("""
Given the following SAST report, create a DAST attack plan for the live application at {sandbox_url}.
For each vulnerability, devise a specific HTTP request (including target URL, method, headers, and payload) to confirm or exploit it.

SAST Report:
{sast_report}

Return ONLY a valid JSON object with this exact structure:
{{
  "steps": [
    {{
      "vulnerability_type": "SQL Injection",
      "target_url": "http://example.com/api/endpoint",
      "method": "POST",
      "headers": {{"Content-Type": "application/json"}},
      "payload": {{"id": "1' OR '1'='1"}},
      "description": "Testing SQL injection on id parameter"
    }}
  ]
}}

Make sure to create at least one attack step for each vulnerability found in the SAST report.
""")

    chain = prompt | llm | StrOutputParser()

    response = chain.invoke({
        "sast_report": str(sast_report),
        "sandbox_url": sandbox_url
    })

    try:
        # Clean up the response
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        parsed = json.loads(cleaned)
        
        # Ensure the response has the expected structure
        if "steps" not in parsed:
            parsed = {"steps": []}
        
        print(f"[Planning Agent] Generated {len(parsed.get('steps', []))} attack steps")
        return parsed
    except json.JSONDecodeError as e:
        print(f"[Planning Agent] Failed to parse attack plan: {e}")
        print(f"[Planning Agent] Raw response: {response[:500]}")
        return {"steps": []}

def generate_pr_details(vulnerabilities: list) -> dict:
    """
    Generates a Pull Request title and body based on the fixed vulnerabilities.
    """
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0.7)
    prompt = PromptTemplate.from_template("""
You are a Senior Security Engineer submitting a critical patch.
The following vulnerabilities have been fixed:
{vulnerabilities}

Generate a PR Title and Description in an "Executive Summary" style.
It must include:
1. **Executive Summary**: High-level impact statement.
2. **Changes**: Technical details of what was fixed.
3. **Verification**: How the fixes were verified (mention Automated SAST/DAST).

Return ONLY a valid JSON object with this exact structure:
{{
  "title": "fix(security): [Concise Summary]",
  "body": "## Executive Summary\\n[Text]\\n\\n## Changes\\n[Text]\\n\\n## Verification\\n[Text]"
}}
""")

    chain = prompt | llm | StrOutputParser()

    response = chain.invoke({"vulnerabilities": str(vulnerabilities)})

    try:
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        return json.loads(cleaned)
    except Exception as e:
        print(f"[Planning Agent] Failed to generate PR details: {e}")
        return {
            "title": "Security Fixes",
            "body": "Fixed detected vulnerabilities."
        }

def generate_commit_message(fixes: list) -> str:
    """
    Generates a Conventional Commit message based on the applied fixes.
    """
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0.5)
    prompt = PromptTemplate.from_template("""
You are a Senior Software Engineer following Conventional Commits standards.
Based on the following list of applied security fixes, generate a single, concise commit message.
The message should follow the format: `type(scope): description`.

Fixes Applied:
{fixes}

Examples:
- fix(auth): sanitize input in login.py to prevent SQLi
- fix(deps): update vulnerable dependency requests
- chore(security): rotate hardcoded API keys

Return ONLY the commit message string (no quotes, no extra text).
""")

    chain = prompt | llm | StrOutputParser()

    response = chain.invoke({"fixes": str(fixes)})
    return response.strip().replace('"', '').replace("`", "")
