import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    
    # 1. Desktop widescreen showing Phone Studio
    page1 = browser.new_page(viewport={'width': 1440, 'height': 920})
    page1.goto('http://localhost:8080/')
    time.sleep(2)
    page1.screenshot(path='c:/Projects/autogrow-farm/dashboard_phone_studio_desktop.png')
    print('1. Phone studio desktop screenshot captured!')

    # Click Dosing tab inside phone
    page1.click('button:has-text("Dosing")')
    time.sleep(1)
    page1.screenshot(path='c:/Projects/autogrow-farm/dashboard_phone_dosing_tab.png')
    print('2. Dosing tab screenshot captured!')

    # 2. Standalone mobile viewport (iPhone 14 Pro)
    page2 = browser.new_page(viewport={'width': 393, 'height': 852})
    page2.goto('http://localhost:8080/')
    time.sleep(2)
    page2.screenshot(path='c:/Projects/autogrow-farm/dashboard_phone_standalone_mobile.png')
    print('3. Standalone mobile screenshot captured!')

    browser.close()
