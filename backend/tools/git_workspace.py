import os
import shutil
import subprocess
from git import Repo, GitCommandError

def git_clone_repo(repo_url: str, local_path: str) -> str:
    """
    Clones a remote git repository to a local path.
    """
    if os.path.exists(local_path):
        shutil.rmtree(local_path)
    os.makedirs(local_path)
    Repo.clone_from(repo_url, local_path)
    return local_path

def git_apply_patch(patch_string: str, local_repo_path: str):
    """
    Applies a patch to the local git repository.
    """
    patch_file_path = os.path.join(local_repo_path, 'fix.patch')
    with open(patch_file_path, 'w') as f:
        f.write(patch_string)

    repo = Repo(local_repo_path)
    repo.git.apply(patch_file_path)
    os.remove(patch_file_path)

def git_push_to_new_branch(branch_name: str, commit_message: str, local_repo_path: str):
    """
    Pushes changes to a new branch on the remote repository.
    """
    repo = Repo(local_repo_path)
    repo.git.checkout('-b', branch_name)
    repo.git.add(A=True)
    repo.git.commit(m=commit_message)
    # In a real application, you would need to handle authentication for the push.
    # This example assumes that the environment is already authenticated.
    repo.git.push('--set-upstream', 'origin', branch_name)
