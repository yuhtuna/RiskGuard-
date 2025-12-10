from github import Github, GithubException
import logging

class GitHubClient:
    def __init__(self, token=None, username=None):
        self.token = token
        self.username = username
        self.github = Github(token) if token else None

    def verify_token(self):
        """
        Verifies if the provided token is valid by attempting to get the authenticated user.
        """
        if not self.github:
            return False, "No token provided"
        try:
            user = self.github.get_user()
            # Verify the token belongs to the username if provided
            if self.username and user.login != self.username:
                return False, f"Token belongs to {user.login}, not {self.username}"
            return True, f"Authenticated as {user.login}"
        except GithubException as e:
            return False, f"GitHub authentication failed: {e.data.get('message', str(e))}"

    def list_user_repos(self):
        """
        Lists all repositories the authenticated user has access to.
        Returns a list of dictionaries with repo details.
        """
        if not self.github:
            return []

        try:
            repos = []
            # Get all repos (public and private)
            for repo in self.github.get_user().get_repos(sort="updated", direction="desc"):
                repos.append({
                    "id": repo.id,
                    "name": repo.name,
                    "full_name": repo.full_name,
                    "private": repo.private,
                    "html_url": repo.html_url,
                    "clone_url": repo.clone_url,
                    "default_branch": repo.default_branch,
                    "updated_at": repo.updated_at.isoformat()
                })
            return repos
        except GithubException as e:
            logging.error(f"Failed to list repos: {e}")
            return []

    def create_pull_request(self, repo_full_name, head_branch, base_branch, title, body):
        """
        Creates a pull request.
        """
        if not self.github:
            return None, "No GitHub client initialized"

        try:
            repo = self.github.get_repo(repo_full_name)
            pr = repo.create_pull(
                title=title,
                body=body,
                head=head_branch,
                base=base_branch
            )
            return pr.html_url, None
        except GithubException as e:
            error_msg = e.data.get('message', str(e))
            # Handle existing PR case
            if "A pull request already exists" in error_msg:
                 # Try to find the existing PR
                 pulls = repo.get_pulls(state='open', head=f"{repo.owner.login}:{head_branch}", base=base_branch)
                 if pulls.totalCount > 0:
                     return pulls[0].html_url, "Updated existing PR"

            # Handle "Validation Failed" (common when PR exists or no commits)
            if "Validation Failed" in error_msg:
                 errors = e.data.get('errors', [])
                 for error in errors:
                     if error.get('message', '').startswith('A pull request already exists'):
                          pulls = repo.get_pulls(state='open', head=f"{repo.owner.login}:{head_branch}", base=base_branch)
                          if pulls.totalCount > 0:
                               return pulls[0].html_url, "Updated existing PR"

            logging.error(f"Failed to create PR: {error_msg}")
            return None, error_msg
