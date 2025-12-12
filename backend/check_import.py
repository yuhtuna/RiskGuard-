import sys
print(f"Python Executable: {sys.executable}")
print(f"Sys Path: {sys.path}")

try:
    import raindrop
    print("Import 'raindrop' successful")
    print("Dir(raindrop):", dir(raindrop))
    
    client = raindrop.Raindrop(api_key="test")
    print("Type(client.query):", type(client.query))
    print("Dir(client.query):", dir(client.query))
    
    print("Dir(raindrop.resources):", dir(raindrop.resources))


        
except ImportError as e:
    print(f"Import 'raindrop' failed: {e}")
except Exception as e:
    print(f"Error inspecting client: {e}")

