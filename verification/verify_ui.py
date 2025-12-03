from playwright.sync_api import sync_playwright

def verify_github_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (assuming it's running on port 3000)
        page.goto("http://localhost:3000")

        # Wait for the GitHub Login component to appear
        page.wait_for_selector("text=Connect to GitHub")

        # Take a screenshot of the login screen
        page.screenshot(path="verification/github_login.png")
        print("Screenshot of login screen saved.")

        # Fill in dummy credentials to test transition (backend mock needed or just UI)
        # Note: Without a running backend mock, this might fail network requests,
        # but we can verify the input fields exist.
        page.fill("input[placeholder='octocat']", "testuser")
        page.fill("input[placeholder='ghp_...']", "ghp_testtoken")

        # Take another screenshot with filled inputs
        page.screenshot(path="verification/github_login_filled.png")
        print("Screenshot of filled login screen saved.")

        browser.close()

if __name__ == "__main__":
    verify_github_ui()
