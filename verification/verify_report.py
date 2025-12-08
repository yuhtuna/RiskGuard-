
from playwright.sync_api import Page, expect, sync_playwright

def verify_report_summary(page: Page):
    # 1. Arrange: Go to the verification app
    page.goto("http://localhost:3001/verification/index.html")

    # 2. Act: Verify the "Brief Report & Prevention Guide" is present
    expect(page.get_by_text("Brief Report & Prevention Guide")).to_be_visible()

    # 3. Act: Verify Executive Summary content
    expect(page.get_by_text("Executive Summary")).to_be_visible()
    # Use exact=False or specific locator to avoid ambiguity if strict mode is triggered
    expect(page.get_by_text("Fixed critical SQL Injection in auth.py")).to_be_visible()

    # 4. Act: Verify Prevention Strategy
    expect(page.get_by_text("Prevention Strategy")).to_be_visible()

    # For "SQL Injection" which appears multiple times, use a more specific locator or .first
    # We want to verify it appears in the Prevention Strategy section
    prevention_section = page.locator("div.grid.gap-4.md\\:grid-cols-2")
    expect(prevention_section.get_by_text("SQL Injection")).to_be_visible()

    expect(page.get_by_text("Use parameterized queries or prepared statements")).to_be_visible()

    # 5. Act: Verify "Create Pull Request" button
    create_pr_btn = page.get_by_role("button", name="Create Pull Request")
    expect(create_pr_btn).to_be_visible()

    # 6. Screenshot
    page.screenshot(path="verification/verification_report.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_report_summary(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
