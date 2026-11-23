import time
import json
import urllib.request
from playwright.sync_api import sync_playwright

def verify_local_farm_system():
    print("[1] Verifying Edge REST API Health...")
    with urllib.request.urlopen('http://localhost:8080/api/status') as response:
        assert response.status == 200, f"Expected 200, got {response.status}"
        status_data = json.loads(response.read().decode())
        print("  -> Edge Status:", status_data)
        assert status_data['status'] == 'ONLINE'
        assert status_data['db_mode'] == 'SQLITE_WAL'

    print("\n[2] Verifying Live Telemetry API...")
    with urllib.request.urlopen('http://localhost:8080/api/telemetry/live') as response:
        assert response.status == 200
        live_data = json.loads(response.read().decode())
        print(f"  -> Farm ID: {live_data['farm_id']}, Readings Count: {len(live_data['readings'])}")

    print("\n[3] Launching Playwright to test Industrial Farm SCADA Dashboard...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()

        page.goto('http://localhost:8080/')
        page.wait_for_selector('text=AUTOGROW FARM OS')
        print("  -> Dashboard loaded successfully over local Edge HTTP server!")

        # Verify Online LAN badge
        page.wait_for_selector('text=LOCAL LAN ONLINE')
        print("  -> Local LAN Online status confirmed over WebSocket!")

        # Wait 2 seconds for WebSocket telemetry ticks to populate
        time.sleep(2)
        page.screenshot(path='c:/Projects/autogrow-farm/dashboard_scada_live.png')
        print("  -> Screenshot saved: dashboard_scada_live.png")

        # Verify core CEA metric cards are visible
        assert page.locator('text=Electrical Conductivity').first.is_visible()
        assert page.locator('text=pH Level').first.is_visible()
        assert page.locator('text=Vapor Pressure Deficit').first.is_visible()
        print("  -> All core CEA metric cards verified!")

        # Test Actuator Matrix & Triggering a manual pulse
        print("\n[4] Testing Manual Actuator Pulse (Acid Dosing Pump 12s Shot)...")
        dose_button = page.locator('button:has-text("Trigger 12s Shot")').first
        assert dose_button.is_visible()
        dose_button.click()

        time.sleep(1)
        page.screenshot(path='c:/Projects/autogrow-farm/dashboard_actuator_running.png')
        print("  -> Screenshot saved: dashboard_actuator_running.png")

        running_badge = page.locator('text=RUNNING (').first
        assert running_badge.is_visible(), "Actuator did not enter RUNNING state"
        print("  -> Actuator successfully transitioned to RUNNING state with active countdown!")

        # Test Pause All Outputs
        print("\n[5] Testing Software Emergency Pause Button...")
        page.on('dialog', lambda dialog: dialog.accept())
        pause_button = page.locator('button:has-text("Pause All Outputs")')
        pause_button.click()
        time.sleep(1)

        print("\nALL LOCAL STAGE 1, 2 & 3 TESTS PASSED PERFECTLY!")
        browser.close()

if __name__ == '__main__':
    verify_local_farm_system()
