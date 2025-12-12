import requests
import os
import json
from typing import Optional, Dict, Any

class RaindropClient:
    BASE_URL = "https://api.raindrop.io/rest/v1"

    def __init__(self, token: Optional[str] = None):
        # Use provided token or fall back to env var
        self.token = token or os.environ.get("RAINDROP_TOKEN")
        if not self.token:
            print("Warning: RAINDROP_TOKEN not found. Raindrop integration will be disabled.")
        
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def get_or_create_collection(self, name: str) -> Optional[int]:
        """
        Finds a collection by name or creates it if it doesn't exist.
        Returns the Collection ID.
        """
        if not self.token:
            return None

        try:
            # 1. Search for existing collection
            response = requests.get(f"{self.BASE_URL}/collections", headers=self.headers)
            response.raise_for_status()
            collections = response.json().get("items", [])
            
            for col in collections:
                if col["title"].lower() == name.lower():
                    return col["_id"]

            # 2. Create if not found
            payload = {"title": name}
            create_res = requests.post(f"{self.BASE_URL}/collection", headers=self.headers, json=payload)
            create_res.raise_for_status()
            return create_res.json()["item"]["_id"]

        except Exception as e:
            print(f"Error managing Raindrop collection: {e}")
            return None

    def create_raindrop(self, link: str, title: str, collection_id: Optional[int] = None, tags: list = None) -> bool:
        """
        Creates a new bookmark (Raindrop).
        """
        if not self.token:
            return False

        try:
            payload = {
                "link": link,
                "title": title,
                "pleaseParse": {}, # Ask Raindrop to fetch metadata
                "tags": tags or ["riskguard"]
            }
            
            if collection_id:
                payload["collection"] = {"$id": collection_id}

            print(f"DEBUG: Creating Raindrop with payload: {json.dumps(payload)}")
            response = requests.post(f"{self.BASE_URL}/raindrop", headers=self.headers, json=payload)
            print(f"DEBUG: Raindrop Response: {response.status_code} - {response.text}")
            response.raise_for_status()
            return True

        except Exception as e:
            print(f"Error creating Raindrop: {e}")
            return False
