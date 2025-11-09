import os

def read_source_code(file_path: str) -> str:
    """
    Reads the content of a file from the local workspace.

    Args:
        file_path: The path to the file to read.

    Returns:
        The content of the file.

    Raises:
        FileNotFoundError: If the file does not exist.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    with open(file_path, 'r') as f:
        return f.read()
