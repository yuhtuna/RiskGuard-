import os
import shutil
import subprocess
import time
import re
import logging
import tempfile
from git import Repo, GitCommandError, InvalidGitRepositoryError, NoSuchPathError

def _retry_with_delay(func, retries=3, delay=0.5):
    """Helper to retry operations that may fail due to Windows file locking."""
    for attempt in range(retries):
        try:
            return func()
        except (OSError, GitCommandError) as e:
            if attempt < retries - 1:
                logging.warning(f"Operation failed: {e}. Retrying in {delay}s...")
                time.sleep(delay)
            else:
                raise e

def _clean_patch(patch_string: str) -> str:
    """
    Cleans and validates a patch string to ensure it's properly formatted for git apply.
    Removes markdown artifacts, fixes line endings, normalizes paths, and validates patch structure.
    """
    # Remove markdown code blocks
    lines = patch_string.strip().split('\n')
    cleaned_lines = []
    in_code_block = False
    
    for line in lines:
        # Skip markdown code block markers
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            continue
        
        # Convert Windows backslashes to forward slashes in file paths
        # This is critical for git patch format which always uses forward slashes
        if line.startswith('--- ') or line.startswith('+++ ') or line.startswith('diff --git'):
            # Replace backslashes with forward slashes in path lines
            line = line.replace('\\', '/')
        
        # Remove trailing ? characters that some LLMs add (especially at line ends)
        # These break patch matching. Remove ALL trailing ? from code lines
        if '?' in line:
            # Check if this is a patch context/diff line (starts with space, +, -)
            # Don't touch @@ markers or header lines
            if len(line) > 0 and line[0] in (' ', '+', '-') and not line.startswith('---') and not line.startswith('+++'):
                # Remove ALL ? characters from the end of the line
                line = line.rstrip('?')
                # Also replace ? that appear as " ? " or "? " which might be hallucinated newlines
                line = line.replace('? ', ' ').replace(' ?', ' ')
                # Finally, if the line ends with a semicolon followed by ?, remove the ?
                if line.endswith(';?'):
                    line = line[:-1]
        
        cleaned_lines.append(line)
    
    # Rejoin and normalize line endings
    patch = '\n'.join(cleaned_lines)
    
    # Ensure the patch starts with proper diff headers
    if not patch.strip().startswith('---'):
        # Try to find the start of the patch
        match = re.search(r'--- a/', patch)
        if match:
            patch = patch[match.start():]
        else:
            # If no header found, it might be a raw diff without headers (unlikely but possible)
            pass
    
    # Ensure patch ends with a newline
    if not patch.endswith('\n'):
        patch += '\n'
    
    return patch

def git_apply_patch(patch_content: str, repo_path: str):
    """
    Applies a git patch to the repository.
    This now includes a final, aggressive cleaning step on the source file
    just before applying the patch to ensure git can match the content.
    """
    repo = Repo(repo_path)
    
    # Clean the patch content first (normalize paths, remove artifacts)
    try:
        patch_content = _clean_patch(patch_content)
    except Exception as e:
        logging.warning(f"Patch cleaning failed: {e}. Using original patch.")

    # Create a temporary file for the patch
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.patch', encoding='utf-8') as temp_patch_file:
        temp_patch_file.write(patch_content)
        patch_file_path = temp_patch_file.name

    logging.debug(f"[DEBUG] First 20 lines of patch file:\n" + "\n".join([f"{i+1}: '{line}'" for i, line in enumerate(patch_content.splitlines()[:20])]))

    try:
        # Attempt to apply the patch using a 3-way merge first
        _retry_with_delay(lambda: repo.git.apply('--3way', patch_file_path))
        logging.info("Patch applied successfully with 3-way merge.")
    except GitCommandError as e:
        logging.warning(f"3-way merge failed: {e}. Falling back to --reject.")
        try:
            # Fallback to applying with --reject, which creates .rej files for failed hunks
            _retry_with_delay(lambda: repo.git.apply('--reject', patch_file_path))
            logging.info("Patch applied with --reject. Some hunks may have been rejected.")
        except GitCommandError as final_error:
            error_msg = str(final_error)
            logging.error(f"[ERROR] Failed to apply patch: {error_msg}")
            raise RuntimeError(f"Failed to apply patch: {error_msg}")
    finally:
        # Clean up the temporary patch file
        if os.path.exists(patch_file_path):
            os.unlink(patch_file_path)

def clone_repository(repo_url: str, local_path: str, token: str = None) -> Repo:
    """
    Clones a repository to the local path.
    If a token is provided, it modifies the URL to include authentication.
    """
    if os.path.exists(local_path):
        shutil.rmtree(local_path)

    auth_url = repo_url
    if token:
        # Inject token into URL for basic auth: https://oauth2:TOKEN@github.com/user/repo.git
        if repo_url.startswith("https://"):
            auth_url = repo_url.replace("https://", f"https://oauth2:{token}@")
        elif repo_url.startswith("http://"):
             auth_url = repo_url.replace("http://", f"http://oauth2:{token}@")

    try:
        return Repo.clone_from(auth_url, local_path)
    except GitCommandError as e:
        # Don't log the full URL as it contains the token
        logging.error(f"Failed to clone repository: {str(e).replace(token, '***') if token else str(e)}")
        raise RuntimeError(f"Failed to clone repository")

def create_branch(local_path: str, branch_name: str):
    """
    Creates and checks out a new branch.
    """
    repo = Repo(local_path)
    current = repo.active_branch

    if branch_name in repo.heads:
        new_branch = repo.heads[branch_name]
        new_branch.checkout()
    else:
        new_branch = repo.create_head(branch_name)
        new_branch.checkout()

    logging.info(f"Checked out branch: {branch_name}")

def commit_changes(local_path: str, message: str):
    """
    Commits all current changes to the local repository.
    """
    repo = Repo(local_path)
    repo.git.add(A=True)
    if repo.is_dirty(index=True, working_tree=False):
        repo.index.commit(message)
        logging.info(f"Committed changes with message: {message}")
    else:
        logging.info("No changes to commit.")

def push_changes(local_path: str, token: str, branch_name: str) -> str:
    """
    Pushes the current branch to origin.
    The repo must have been cloned with the token for this to work.
    """
    repo = Repo(local_path)
    try:
        # Force set the remote url to ensure token is present (persisted from clone, but good to be safe)
        origin = repo.remotes.origin
        push_info = origin.push(refspec=f'{branch_name}:{branch_name}', set_upstream=True)

        for info in push_info:
             if info.flags & info.ERROR:
                  raise RuntimeError(f"Push failed: {info.summary}")

        logging.info(f"Pushed branch {branch_name} to origin.")
        return "Success"
    except GitCommandError as e:
        logging.error(f"Failed to push: {str(e).replace(token, '***') if token else str(e)}")
        raise RuntimeError(f"Failed to push changes to remote")
