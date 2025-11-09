import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.schema.output_parser import StrOutputParser

from tools.sast_tools import read_source_code

def run_sast_scan(local_repo_path: str) -> dict:
    """
    Runs a generative AI-powered SAST scan on the local repository.
    """
    files_to_scan = ['app.py', 'main.py', 'index.js', 'package.json', 'requirements.txt']
    code_snippets = []
    for file_name in files_to_scan:
        file_path = os.path.join(local_repo_path, file_name)
        try:
            content = read_source_code(file_path)
            code_snippets.append(f"--- {file_name} ---\n{content}\n---\n")
        except FileNotFoundError:
            pass

    if not code_snippets:
        return {"vulnerabilities": [], "summary": "No scannable files found."}

    llm = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0.2)
    prompt = PromptTemplate.from_template("""
Analyze the following code snippets for potential security vulnerabilities.
For each vulnerability found, provide the file name, line number, vulnerability type, severity (High, Medium, Low), and a brief description.

Code snippets:
{code}

Return the report in a valid JSON format.
""")

    chain = prompt | llm | StrOutputParser()

    response = chain.invoke({"code": "\n".join(code_snippets)})

    try:
        return json.loads(response.replace("```json", "").replace("```", ""))
    except json.JSONDecodeError:
        return {"vulnerabilities": [], "summary": "Failed to parse SAST report."}
