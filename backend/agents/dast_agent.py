from tools.dast_tools import execute_exploit

def run_dast_scan(attack_plan: dict) -> dict:
    """
    Runs a DAST scan based on the provided attack plan.

    Args:
        attack_plan: The DAST attack plan.

    Returns:
        A dictionary representing the DAST report.
    """
    dast_results = []
    for step in attack_plan.get('steps', []):
        result = execute_exploit(step)
        dast_results.append(result)

    dast_report = {
        'results': dast_results,
        'summary': f"Executed {len(dast_results)} attack steps."
    }

    return dast_report
