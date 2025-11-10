import os
import shutil
import subprocess
import time
from git import Repo, GitCommandError, InvalidGitRepositoryError, NoSuchPathError

def _retry_with_delay(func, retries=3, delay=0.5):
    """Helper to retry operations that may fail due to Windows file locking."""
    for attempt in range(retries):
        try:
            return func()
        except OSError as e:
            if attempt < retries - 1:
                time.sleep(delay)
            else:
                raise e

def git_apply_patch(patch_string: str, local_repo_path: str):
    """
    Applies a patch to the local git repository.
    """
    # Ensure the local path exists
    os.makedirs(local_repo_path, exist_ok=True)

    # Check if it's a git repository, if not, initialize it. If the repo is invalid, recreate it.
    git_dir = os.path.join(local_repo_path, '.git')
    repo = None
    try:
        if not os.path.exists(git_dir):
            repo = Repo.init(local_repo_path)
        else:
            try:
                repo = Repo(local_repo_path)
            except (InvalidGitRepositoryError, NoSuchPathError):
                # If .git is corrupted or path missing, remove and re-init
                def cleanup_git():
                    if os.path.exists(git_dir):
                        shutil.rmtree(git_dir, ignore_errors=True)
                
                try:
                    _retry_with_delay(cleanup_git)
                except Exception:
                    # best-effort cleanup; ignore errors here
                    pass
                repo = Repo.init(local_repo_path)
    except Exception as e:
        raise RuntimeError(f"Failed to prepare git repository at {local_repo_path}: {e}")

    # Configure git to reduce file locking issues on Windows
    try:
        with repo.config_writer() as git_config:
            git_config.set_value('core', 'filemode', 'false')
            git_config.set_value('core', 'fsyncobjectfiles', 'false')
    except Exception:
        pass  # Best effort - continue even if config fails

    # Check if there are any commits, if not, create an initial commit
    try:
        repo.head.commit
    except ValueError:
        # No commits yet, create initial commit
        def initial_commit():
            repo.git.add(A=True)
            repo.git.commit(m='Initial commit from uploaded code')
        
        try:
            _retry_with_delay(initial_commit)
        except Exception as e:
            raise RuntimeError(f"Failed to create initial commit: {e}")


    patch_file_path = os.path.join(local_repo_path, 'fix.patch')
    with open(patch_file_path, 'w', encoding='utf-8') as f:
        f.write(patch_string)

    try:
        # Use git apply with --reject to handle potential conflicts
        def apply_patch():
            repo.git.apply('--reject', patch_file_path)
        
        try:
            _retry_with_delay(apply_patch)
        except GitCommandError as e:
            # surface a clearer error
            raise RuntimeError(f"git apply failed: {e}")
    finally:
        # Clean up the patch file
        def cleanup_patch():
            if os.path.exists(patch_file_path):
                os.remove(patch_file_path)
        
        try:
            _retry_with_delay(cleanup_patch)
        except Exception:
            pass  # Best effort cleanup

def git_push_to_new_branch(local_repo_path: str, new_branch_name: str) -> str:
    """
    Pushes the committed changes in the local repository to a new branch on the remote repository.
    Note: This function assumes the local repository has a configured remote named 'origin'.
    This will fail if the code was uploaded as a zip and not cloned from a git repo.
    """
    repo = Repo(local_repo_path)

    # Check if a remote 'origin' exists
    if 'origin' not in [remote.name for remote in repo.remotes]:
        return "Skipped push: No remote 'origin' configured for this repository."

    # Create and checkout the new branch
    if new_branch_name in repo.heads:
        new_branch = repo.heads[new_branch_name]
        new_branch.checkout()
    else:
        new_branch = repo.create_head(new_branch_name)
        new_branch.checkout()

    # Add all changes to the staging area
    repo.git.add(A=True)
    
    # Commit the changes if there's anything to commit
    if repo.is_dirty(index=True, working_tree=False):
        repo.git.commit(m='Apply patch and push to new branch')
    
    # Push the changes to the new branch on the remote repository
    try:
        push_result = repo.git.push('--set-upstream', 'origin', new_branch_name)
        return push_result
    except GitCommandError as e:
        # Handle cases where push fails (e.g., authentication needed)
        return f"Failed to push to remote 'origin'. Error: {str(e)}"

