import os
import difflib
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from tools.sast_tools import read_source_code
from tools.smart_file_analyzer import get_code_context_around_line

def generate_fixes(sast_report, local_repo_path: str, use_focused_context: bool = False) -> list:
    """
    Generates suggested fixes for vulnerabilities found in the SAST report.
    RETURNS FULL FILE CONTENT instead of patches to avoid git apply errors.
    """
    import langchain
    langchain.verbose = False

    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0.3)
    prompt = PromptTemplate.from_template("""
You are an expert security engineer. A security vulnerability has been detected in the following code.
Your task is to fix the vulnerability and return the **COMPLETE, CORRECTED FILE CONTENT**.

**Vulnerability Details:**
Type: {vuln_type}
File: {file_path}
Line: {line_number}
Issue: {flaw_description}

**Full File Content ({file_path}):**
```
{code}
```

**Instructions:**
1.  Read the entire file carefully.
2.  Fix the specific vulnerability described.
3.  Ensure the rest of the code remains exactly the same (imports, logic, indentation).
4.  Do NOT generate a diff/patch. Return the **entire file** with the fix applied.
5.  Do NOT include any markdown formatting (like ```python ... ```). Return raw code only.

**Security Fix Guidelines:**
- For SQL Injection: Use prepared statements or parameterized queries.
- For XSS: Use proper output encoding/escaping.
- For Path Traversal: Validate and sanitize file paths.
- For Command Injection: Avoid shell execution; use safe APIs.
- For Secrets: Move hardcoded secrets to environment variables.
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
    # Deduplicate fixes per file to avoid overwriting multiple times if multiple vulns exist in one file.
    # We ideally want to fix all vulns in a file at once.
    # Strategy: Group vulnerabilities by file.
    vulns_by_file = {}
    for v in vulnerabilities:
        if not isinstance(v, dict) or 'file' not in v:
            continue
        file_path = v['file']
        if file_path not in vulns_by_file:
            vulns_by_file[file_path] = []
        vulns_by_file[file_path].append(v)

    for relative_path, file_vulns in vulns_by_file.items():
        full_path = os.path.join(local_repo_path, relative_path)
        try:
            original_code = read_source_code(full_path)
            
            # Construct a summary of all issues in this file
            vuln_descriptions = []
            for v in file_vulns:
                v_type = v.get('vulnerability_type', v.get('type', 'Security Issue'))
                v_line = v.get('line', 'unknown')
                v_flaw = v.get('flaw', v.get('description', 'detected issue'))
                vuln_descriptions.append(f"- Line {v_line}: [{v_type}] {v_flaw}")
            
            combined_description = "\n".join(vuln_descriptions)

            fixed_code = chain.invoke({
                "vuln_type": "Multiple Issues" if len(file_vulns) > 1 else file_vulns[0].get('vulnerability_type', 'Issue'),
                "file_path": relative_path,
                "line_number": "Multiple" if len(file_vulns) > 1 else file_vulns[0].get('line', 'unknown'),
                "flaw_description": combined_description,
                "code": original_code
            })
            
            # Clean up markdown if present
            fixed_code = fixed_code.strip()
            if fixed_code.startswith("```"):
                lines = fixed_code.split('\n')
                # Remove first line (```language)
                if lines[0].startswith("```"):
                    lines = lines[1:]
                # Remove last line (```)
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                fixed_code = "\n".join(lines)

            # Generate Unified Diff
            diff = difflib.unified_diff(
                original_code.splitlines(),
                fixed_code.splitlines(),
                fromfile=f"a/{relative_path}",
                tofile=f"b/{relative_path}",
                lineterm=""
            )
            diff_text = "\n".join(diff)

            # Aggregate educational info
            educational_info = []
            for v in file_vulns:
                educational_info.append({
                    "type": v.get('vulnerability_type', v.get('type', 'Unknown')),
                    "explanation": v.get('explanation', 'No explanation provided.'),
                    "remediation": v.get('remediation', 'No remediation provided.')
                })

            suggested_fixes.append({
                'file_path': relative_path,
                'description': f"Fixed {len(file_vulns)} vulnerabilities in {relative_path}",
                'fixed_content': fixed_code,
                'diff': diff_text,
                'educational_info': educational_info
            })

        except FileNotFoundError:
            print(f"Warning: File not found: {full_path}")
        except Exception as e:
            print(f"Warning: Failed to fix {relative_path}: {e}")

    return suggested_fixes

def generate_fixes_with_fallback(sast_report, local_repo_path: str, dast_report=None) -> list:
    """
    Enhanced fix generation with fallback strategies and DAST feedback.
    """
    # Simply re-run the main generation logic for now.
    # With "Rewrite Full File" strategy, we can pass the DAST feedback into the prompt if needed in future iterations.
    return generate_fixes(sast_report, local_repo_path)
