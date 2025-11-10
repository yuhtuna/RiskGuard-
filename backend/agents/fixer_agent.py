import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from tools.sast_tools import read_source_code
from tools.smart_file_analyzer import get_code_context_around_line

def generate_fixes(sast_report, local_repo_path: str, use_focused_context: bool = False) -> list:
    """
    Generates suggested fixes for vulnerabilities found in the SAST report.
    Uses improved prompting to generate more accurate, context-aware patches.
    """
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0.3)
    prompt = PromptTemplate.from_template("""
You are an expert security engineer. Generate a git diff patch to fix the following security vulnerability.

**CRITICAL INSTRUCTIONS:**
1. Study the EXACT code structure, including whitespace, indentation, and line breaks
2. The patch MUST apply cleanly using `git apply`
3. Use sufficient context lines (at least 3 lines before and after changes)
4. Match the exact formatting, quotes, and spacing in the original code
5. Only fix the specific vulnerability - minimize code changes
6. Preserve all existing functionality

**Vulnerability Details:**
Type: {vuln_type}
File: {file_path}
Line: {line_number}
Issue: {flaw_description}

**Full File Content ({file_path}):**
```
{code}
```

**Security Fix Guidelines:**
- For SQL Injection: Use prepared statements or parameterized queries
- For XSS: Use proper output encoding/escaping for the context
- For Path Traversal: Validate and sanitize file paths, use whitelists
- For Command Injection: Avoid shell execution, use safe APIs
- For Authentication: Implement proper password hashing, session management

Generate ONLY the unified diff patch starting with "--- a/{file_path}" and ending with the last changed line.
The patch must have enough context to apply successfully even if line numbers shift slightly.
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
            # Extract vulnerability details for better prompt context
            vuln_type = vulnerability.get('vulnerability_type', vulnerability.get('type', 'Security Issue'))
            flaw = vulnerability.get('flaw', vulnerability.get('description', 'Security vulnerability detected'))
            line_num = vulnerability.get('line', 'unknown')
            
            # Read full file content (we need complete file for accurate patching)
            original_code = read_source_code(file_path)
            
            # Optional: For very large files (>500 lines), we could use focused context
            # but for now, we keep full file to ensure accurate patches
            code_to_analyze = original_code
            if use_focused_context and isinstance(line_num, int):
                lines = original_code.split('\n')
                if len(lines) > 500:  # Only use focused context for large files
                    print(f"[Fixer] Using focused context for large file: {vulnerability['file']}")
                    code_to_analyze = get_code_context_around_line(original_code, line_num, context_lines=50)

            patch = chain.invoke({
                "vuln_type": vuln_type,
                "file_path": vulnerability['file'],
                "line_number": line_num,
                "flaw_description": flaw,
                "code": code_to_analyze
            })
            
            # Clean up the patch - remove any markdown code blocks
            patch = patch.strip()
            if patch.startswith('```'):
                # Remove markdown code block markers
                lines = patch.split('\n')
                if lines[0].startswith('```'):
                    lines = lines[1:]
                if lines[-1].startswith('```'):
                    lines = lines[:-1]
                patch = '\n'.join(lines).strip()

            suggested_fixes.append({
                'file_path': vulnerability['file'],
                'description': f"Fix {vuln_type} in {vulnerability['file']} (line {line_num}): {flaw[:80]}",
                'patch': patch
            })
        except FileNotFoundError:
            print(f"Warning: File not found: {file_path}")
        except Exception as e:
            print(f"Warning: Failed to generate fix for {vulnerability.get('file', 'unknown')}: {e}")

    return suggested_fixes


def generate_fixes_with_fallback(sast_report, local_repo_path: str, dast_report=None) -> list:
    """
    Enhanced fix generation with fallback strategies and DAST feedback.
    
    Args:
        sast_report: SAST vulnerabilities report
        local_repo_path: Path to the local repository
        dast_report: Optional DAST report to provide context on which fixes failed
        
    Returns:
        List of suggested fixes with improved accuracy
    """
    # First attempt - standard fix generation
    fixes = generate_fixes(sast_report, local_repo_path)
    
    # If we have DAST feedback showing exploits succeeded, generate alternative approaches
    if dast_report:
        vulnerabilities = dast_report.get('vulnerabilities', [])
        failed_exploits = [v for v in vulnerabilities if v.get('status') == 'SUCCESS']
        
        if failed_exploits:
            print(f"[Fixer Agent] Regenerating fixes - {len(failed_exploits)} vulnerabilities were still exploitable")
            
            # Add context about which fixes didn't work
            llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0.3)
            enhanced_prompt = PromptTemplate.from_template("""
You are a senior security engineer. The previous fix attempt FAILED - the vulnerability was still exploitable.

**Previous Attempt Failed For:**
{failed_vulns}

**Original Vulnerability:**
Type: {vuln_type}
File: {file_path}
Line: {line_number}
Issue: {flaw_description}

**Full File Content:**
```
{code}
```

**Your Task:**
Generate a MORE ROBUST fix that:
1. Takes a more defensive approach
2. Adds input validation AND output encoding
3. Implements defense-in-depth (multiple layers of protection)
4. Uses the safest APIs available in this language/framework
5. Must apply cleanly as a git diff patch

Generate the unified diff patch starting with "--- a/{file_path}".
Use at least 5 lines of context before and after changes.
""")
            
            chain = enhanced_prompt | llm | StrOutputParser()
            
            # Try to enhance fixes that correspond to failed exploits
            for fix in fixes:
                for failed in failed_exploits:
                    if failed.get('vulnerability_type') in fix.get('description', ''):
                        try:
                            file_path = os.path.join(local_repo_path, fix['file_path'])
                            original_code = read_source_code(file_path)
                            
                            enhanced_patch = chain.invoke({
                                "failed_vulns": str(failed_exploits),
                                "vuln_type": failed.get('vulnerability_type', 'Security Issue'),
                                "file_path": fix['file_path'],
                                "line_number": "unknown",
                                "flaw_description": fix.get('description', ''),
                                "code": original_code
                            })
                            
                            # Clean up markdown
                            enhanced_patch = enhanced_patch.strip()
                            if enhanced_patch.startswith('```'):
                                lines = enhanced_patch.split('\n')
                                if lines[0].startswith('```'):
                                    lines = lines[1:]
                                if lines[-1].startswith('```'):
                                    lines = lines[:-1]
                                enhanced_patch = '\n'.join(lines).strip()
                            
                            # Update the fix with enhanced patch
                            fix['patch'] = enhanced_patch
                            fix['description'] = f"[Enhanced] {fix['description']}"
                            print(f"[Fixer Agent] Enhanced fix for {fix['file_path']}")
                        except Exception as e:
                            print(f"[Fixer Agent] Failed to enhance fix: {e}")
    
    return fixes
