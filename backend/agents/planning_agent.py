from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import json

def create_attack_plan(sast_report: dict, sandbox_url: str) -> dict:
    """
    Creates a DAST attack plan based on the SAST report.
    """
    llm = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0.5)
    prompt = PromptTemplate.from_template("""
Given the following SAST report, create a DAST attack plan for the live application at {sandbox_url}.
For each vulnerability, devise a specific HTTP request (including target URL, method, headers, and payload) to confirm or exploit it.

SAST Report:
{sast_report}

Return the plan in a valid JSON format.
""")

    chain = prompt | llm | StrOutputParser()

    response = chain.invoke({
        "sast_report": str(sast_report),
        "sandbox_url": sandbox_url
    })

    try:
        return json.loads(response.replace("```json", "").replace("```", ""))
    except json.JSONDecodeError:
        return {"steps": [], "summary": "Failed to parse attack plan."}
