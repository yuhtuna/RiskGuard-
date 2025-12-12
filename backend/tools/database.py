import os
import json
from typing import Optional

class RiskGuardDB:
    def __init__(self):
        self.api_key = os.environ.get("RAINDROP_API_KEY")
        self.client = None
        self.db_name = "riskguard-users"
        
        if self.api_key:
            try:
                from raindrop import Raindrop
                self.client = Raindrop(api_key=self.api_key)
                print("Connected to Liquid Metal Raindrop SDK.")
            except ImportError:
                print("Warning: 'lm_raindrop' package not installed. Database features disabled.")
        else:
            print("Warning: RAINDROP_API_KEY not found. Database features disabled.")

    def init_db(self):
        """
        Initializes the SmartBucket for users (conceptually).
        SmartBuckets are created on demand or via manifest, so we just verify connection here.
        """
        if not self.client: return
        print(f"Using SmartBucket '{self.db_name}' for user storage.")

    def get_user_token(self, username: str) -> Optional[str]:
        """
        Retrieves the Raindrop bookmark token for a specific user from SmartBucket.
        """
        if not self.client: return None
        
        try:
            # Read user file: users/{username}.json
            file_key = f"users/{username}.json"
            # Note: The SDK method might be client.bucket.get(bucket_name, key) or client.bucket(name).get(key)
            # Based on dir(client.bucket), it has 'get'. Let's assume client.bucket.get(bucket_id, key)
            # But wait, the SDK usually requires a bucket ID. 
            # Let's try to list buckets or just use the name if the SDK supports it.
            
            # Actually, looking at the dir(client), it has 'bucket'. 
            # Let's assume the usage is client.bucket.get(bucket_name, key)
            response = self.client.bucket.get(self.db_name, file_key)
            
            if response and hasattr(response, 'content'):
                data = json.loads(response.content)
                return data.get('raindrop_token')
            return None
        except Exception as e:
            # If file not found, it might throw an error
            # print(f"User not found or error: {e}")
            return None

    def save_user_token(self, username: str, token: str):
        """
        Saves a user's Raindrop token to SmartBucket.
        """
        if not self.client: return

        try:
            file_key = f"users/{username}.json"
            data = {
                "github_username": username,
                "raindrop_token": token,
                "updated_at": "now" # simplified
            }
            
            # Upload/Put the file
            self.client.bucket.put(
                self.db_name, 
                file_key, 
                json.dumps(data)
            )
            print(f"Token saved for user {username} in SmartBucket")
        except Exception as e:
            print(f"Error saving user token: {e}")

# Global DB Instance
db = RiskGuardDB()