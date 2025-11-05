import json

def create_attack_plan(sast_report: dict, sandbox_url: str) -> dict:
    """
    Creates a DAST attack plan based on the SAST report.

    Args:
        sast_report: The SAST report from the previous step.
        sandbox_url: The URL of the live sandbox environment.

    Returns:
        A dictionary representing the DAST attack plan.
    """
    # In a real application, this would use a generative AI model to create a
    # detailed attack plan based on the SAST vulnerabilities.
    # For this example, we'll generate a mock plan.

    attack_steps = []
    for vulnerability in sast_report.get('vulnerabilities', []):
        if vulnerability['type'] == 'SQL Injection':
            attack_steps.append({
                'type': 'exploit',
                'target': f"{sandbox_url}/login",
                'payload': "' OR 1=1 --",
                'description': f"Attempt to exploit SQL Injection at {sandbox_url}/login"
            })
        elif vulnerability['type'] == 'Hardcoded Secret':
            attack_steps.append({
                'type': 'information_gathering',
                'target': f"{sandbox_url}/api/users",
                'headers': {'X-API-KEY': 'hardcoded_secret_value'},
                'description': "Attempt to access a protected endpoint using the hardcoded secret."
            })

    attack_plan = {
        'steps': attack_steps,
        'summary': f"Created an attack plan with {len(attack_steps)} steps."
    }

    return attack_plan
