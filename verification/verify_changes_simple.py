from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the app
            page.goto("http://localhost:3000")

            # Wait for the main elements to load (Landing page)
            page.wait_for_selector("text=Secure Your Code with AI", timeout=10000)

            # Verify Background Canvas exists
            canvas = page.locator("canvas")
            assert canvas.count() > 0

            # Take a screenshot
            page.screenshot(path="verification/landing_page_with_background.png")
            print("Landing page screenshot taken.")

            print("Frontend verification passed.")

        except Exception as e:
            print(f"Frontend verification failed: {e}")
            page.screenshot(path="verification/error_retry.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
