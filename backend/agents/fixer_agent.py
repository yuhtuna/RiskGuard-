import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.schema.output_parser import StrOutputParser

from tools.sast_tools import read_source_code

def generate_fixes(sast_report: dict, local_repo_path: str) -> dict:
    """
    Generates suggested fixes for vulnerabilities found in the SAST report.
    """
    llm = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0.3)
    prompt = PromptTemplate.from_template("""
Given the following vulnerability and the original source code, generate a patch in the diff format to fix the issue.

Vulnerability:
{vulnerability}

Original Code ({file_path}):
{code}

Return only the patch content, starting with "--- a/{file_path}".
""")

    chain = prompt | llm | StrOutputParser()

    suggested_fixes = []
    for vulnerability in sast_report.get('vulnerabilities', []):
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
                'description': f"Fix for {vulnerability['type']} in {vulnerability['file']}",
                'patch': patch
            })
        except FileNotFoundError:
            pass

    return suggested_fixes
