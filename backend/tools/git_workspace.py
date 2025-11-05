import os
import subprocess
from git import Repo, GitCommandError

def git_apply_patch(patch_string: str, local_repo_path: str):
    """
    Applies a patch to the local git repository.
    """
    # Ensure the repo is initialized
    repo = Repo(local_repo_path)
    
    # Check if it's a git repository, if not, initialize it
    if not os.path.exists(os.path.join(local_repo_path, '.git')):
        repo.init()

    # Check if there are any commits, if not, create an initial commit
    if not repo.head.is_valid():
        repo.git.add(A=True)
        repo.git.commit(m='Initial commit from uploaded code')


    patch_file_path = os.path.join(local_repo_path, 'fix.patch')
    with open(patch_file_path, 'w') as f:
        f.write(patch_string)

    try:
        # Use git apply with --reject to handle potential conflicts
        repo.git.apply('--reject', patch_file_path)
    finally:
        # Clean up the patch file
        if os.path.exists(patch_file_path):
            os.remove(patch_file_path)

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

