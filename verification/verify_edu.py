
from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_educational_ui(page: Page):
    # 1. Arrange: Go to the verification app
    page.goto("http://localhost:3001/verification/index.html")

    # 2. Act: Wait for the component to load and verify the "Fixed SQL Injection" text is present
    expect(page.get_by_text("Fixed SQL Injection")).to_be_visible()

    # 3. Act: Click "Learn about this Vulnerability"
    learn_more_btn = page.get_by_text("Learn about this Vulnerability")
    expect(learn_more_btn).to_be_visible()
    learn_more_btn.click()

    # 4. Assert: Check if the educational content is visible
    expect(page.get_by_text("What is SQL Injection?")).to_be_visible()
    expect(page.get_by_text("How to Prevent It")).to_be_visible()
    expect(page.get_by_text("Use parameterized queries")).to_be_visible()

    # 5. Screenshot
    page.screenshot(path="verification/verification_edu.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_educational_ui(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
