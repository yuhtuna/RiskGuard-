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
