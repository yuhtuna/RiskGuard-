from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the app
            page.goto("http://localhost:3000")

            # Wait for the main elements to load
            page.wait_for_selector("text=Audit Timeline", timeout=10000)

            # Take a screenshot of the initial state
            page.screenshot(path="verification/dashboard_initial.png")
            print("Initial screenshot taken.")

            # Simulate "Review & Approve" state by manually setting it if possible,
            # but since we can't easily inject state into the React app from here without
            # interacting with the UI or mocking the API, we'll verify the visible structure.

            # Verify "Audit Timeline" exists and has updated styling (e.g., checking for new classes or layout)
            # This is hard to check specifically for classes via text, but we can check existence.
            assert page.is_visible("text=Audit Timeline")

            # Verify the "General" icon issue is fixed (Task History) if visible
            # It's empty initially, so maybe hard to check without running a scan.

            # Verify Background Canvas
            canvas = page.locator("canvas")
            assert canvas.count() > 0

            print("Frontend verification passed.")

        except Exception as e:
            print(f"Frontend verification failed: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
