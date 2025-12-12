import os
from dotenv import load_dotenv
from tools.raindrop_client import RaindropClient

# Load env vars
load_dotenv()

def test_connection():
    token = os.environ.get("RAINDROP_TOKEN")
    print(f"Checking Token: {token[:5]}... (Length: {len(token) if token else 0})")
    
    if not token:
        print("ERROR: No RAINDROP_TOKEN found in environment.")
        return

    client = RaindropClient(token)
    
    print("Attempting to create/find collection 'RiskGuard Test'...")
    col_id = client.get_or_create_collection("RiskGuard Test")
    
    if col_id:
        print(f"SUCCESS: Collection ID is {col_id}")
        print("Attempting to create a test bookmark...")
        success = client.create_raindrop(
            "https://github.com/yuhtuna/RiskGuard-", 
            "RiskGuard Test Bookmark", 
            col_id, 
            ["test", "riskguard"]
        )
        if success:
            print("SUCCESS: Bookmark created!")
        else:
            print("FAILURE: Could not create bookmark.")
    else:
        print("FAILURE: Could not get or create collection.")

if __name__ == "__main__":
    test_connection()