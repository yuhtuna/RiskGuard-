from tools.dast_tools import execute_exploit

def run_dast_scan(attack_plan: dict) -> dict:
    """
    Runs a DAST scan based on the provided attack plan.

    Args:
        attack_plan: The DAST attack plan.

    Returns:
        A dictionary representing the DAST report with 'vulnerabilities' key.
    """
    print(f"[DAST Agent] Received attack plan with {len(attack_plan.get('steps', []))} steps")
    
    dast_vulnerabilities = []
    steps = attack_plan.get('steps', [])
    
    if not steps:
        print("[DAST Agent] WARNING: No attack steps found in the plan!")
    
    for i, step in enumerate(steps):
        print(f"[DAST Agent] Executing step {i+1}/{len(steps)}: {step.get('vulnerability_type', 'Unknown')}")
        result = execute_exploit(step)
        dast_vulnerabilities.append(result)

    dast_report = {
        'vulnerabilities': dast_vulnerabilities,
        'summary': f"Executed {len(dast_vulnerabilities)} attack steps. Found {sum(1 for v in dast_vulnerabilities if v.get('status') == 'SUCCESS')} confirmed vulnerabilities."
    }

    print(f"[DAST Agent] Completed: {dast_report['summary']}")
    return dast_report
