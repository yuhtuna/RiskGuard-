from playwright.sync_api import sync_playwright

def verify_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        try:
            print("Navigating to home page...")
            page.goto("http://localhost:3000")

            # Wait for the dashboard layout to be visible
            print("Waiting for dashboard...")
            # The sidebar should be visible now due to forced state
            page.wait_for_selector("aside")

            # 1. Verify Audit Timeline (ScanProgress) is visible
            print("Checking Audit Timeline...")
            timeline_header = page.get_by_text("Audit Timeline")
            if timeline_header.is_visible():
                print("Audit Timeline is visible.")
            else:
                print("Audit Timeline NOT visible.")

            # Check if steps are visible (e.g., "Build Application")
            if page.get_by_text("Build Application").is_visible():
                 print("Steps are visible.")

            # 2. Verify Resize Handles
            # The handle is .cursor-col-resize inside aside
            print("Checking Resize Handles...")
            # We can select by class since I added specific cursor classes
            # or by the visual div.

            # Sidebar handle
            sidebar_handle = page.locator("aside .cursor-col-resize")
            if sidebar_handle.count() > 0:
                print("Sidebar resize handle found.")
            else:
                print("Sidebar resize handle NOT found.")

            # History handle
            # It's in the middle section.
            history_handle = page.locator(".cursor-row-resize")
            if history_handle.count() > 0:
                print("History resize handle found.")
            else:
                print("History resize handle NOT found.")

            # 3. Take Screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification/dashboard_layout.png")
            print("Screenshot saved to verification/dashboard_layout.png")

        except Exception as e:
            print(f"Error: {e}")
            # Take error screenshot
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_dashboard()
