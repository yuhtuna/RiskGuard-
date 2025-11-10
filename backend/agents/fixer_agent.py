import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from tools.sast_tools import read_source_code

def generate_fixes(sast_report, local_repo_path: str) -> list:
    """
    Generates suggested fixes for vulnerabilities found in the SAST report.
    """
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0.3)
    prompt = PromptTemplate.from_template("""
Given the following vulnerability and the original source code, generate a patch in the diff format to fix the issue.

Vulnerability:
{vulnerability}

Original Code ({file_path}):
{code}

Return only the patch content, starting with "--- a/{file_path}".
""")

    chain = prompt | llm | StrOutputParser()

    # Handle both dict and list formats
    if isinstance(sast_report, dict):
        vulnerabilities = sast_report.get('vulnerabilities', [])
    elif isinstance(sast_report, list):
        vulnerabilities = sast_report
    else:
        vulnerabilities = []

    suggested_fixes = []
    for vulnerability in vulnerabilities:
        # Skip if vulnerability doesn't have required fields
        if not isinstance(vulnerability, dict) or 'file' not in vulnerability:
            continue
            
        file_path = os.path.join(local_repo_path, vulnerability['file'])
        try:
            original_code = read_source_code(file_path)

            patch = chain.invoke({
                "vulnerability": str(vulnerability),
                "file_path": vulnerability['file'],
                "code": original_code
            })

            suggested_fixes.append({
                'file_path': vulnerability['file'],
                'description': f"Fix for {vulnerability.get('type', 'vulnerability')} in {vulnerability['file']}",
                'patch': patch
            })
        except (FileNotFoundError, KeyError, Exception):
            pass

    return suggested_fixes
