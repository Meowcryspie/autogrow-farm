import { useState, useEffect } from 'react';
import { PhoneAppView } from './components/PhoneAppView';
import { FarmOSControlCenter } from './components/FarmOSControlCenter';
import { SetpointsModal } from './components/SetpointsModal';
import { useFarmWebSocket } from './hooks/useFarmWebSocket';
import type { ZoneSetpoint } from '@autogrow/shared';

export default function App() {
  const { metrics, actuators, active_alarms, setpoint, connectionStatus } = useFarmWebSocket();
  const [isSetpointsOpen, setIsSetpointsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('desktop');
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      setIsMobileScreen(window.innerWidth < 800);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Trigger manual actuator override with UUID, expiry, and bounded duration
  const handleTriggerCommand = async (actuatorId: string, durationSec: number): Promise<boolean> => {
    const host = window.location.hostname || 'localhost';
    if (host.includes('github.io') || host.includes('vercel.app')) {
      // Cloud simulation mode
      return true;
    }
    const now = Date.now();
    const payload = {
      command_id: crypto.randomUUID ? crypto.randomUUID() : 'cmd-' + Math.random().toString(36).substring(2, 9),
      farm_id: 'farm-akl-001',
      zone_id: 'zone-1',
      actuator_id: actuatorId,
      action: 'RUN_TIMED',
      duration_sec: durationSec,
      issued_by: 'operator-dashboard-manual',
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + 10000).toISOString()
    };

    try {
      const res = await fetch(`http://${host}:8080/api/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch (e) {
      console.error('[Command Send Failed]', e);
      return false;
    }
  };

  // Acknowledge Alarm
  const handleAcknowledgeAlarm = async (alarmId: string) => {
    const host = window.location.hostname || 'localhost';
    if (host.includes('github.io') || host.includes('vercel.app')) {
      return;
    }
    try {
      await fetch(`http://${host}:8080/api/alarms/${alarmId}/ack`, { method: 'POST' });
    } catch (e) {
      console.error('[Ack Alarm Failed]', e);
    }
  };

  // Save Setpoints
  const handleSaveSetpoint = async (newSetpoint: ZoneSetpoint) => {
    const host = window.location.hostname || 'localhost';
    if (host.includes('github.io') || host.includes('vercel.app')) {
      return;
    }
    try {
      await fetch(`http://${host}:8080/api/setpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSetpoint)
      });
    } catch (e) {
      console.error('[Save Setpoints Failed]', e);
    }
  };

  // If user opens directly on a physical smartphone screen, render full-bleed mobile UI directly
  if (isMobileScreen) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <PhoneAppView
          metrics={metrics}
          actuators={actuators}
          active_alarms={active_alarms}
          setpoint={setpoint}
          connectionStatus={connectionStatus}
          onTriggerCommand={handleTriggerCommand}
          onAcknowledgeAlarm={handleAcknowledgeAlarm}
          isStandaloneMobile={true}
        />
        <SetpointsModal
          isOpen={isSetpointsOpen}
          onClose={() => setIsSetpointsOpen(false)}
          setpoint={setpoint}
          onSaveSetpoint={handleSaveSetpoint}
        />
      </div>
    );
  }

  // Desktop or Tablet Browser: Show either WarehouseOS-style Farm 3D Digital Twin or Mobile Simulator
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {viewMode === 'mobile' ? (
        /* Mobile App View with studio frame and toggle back to 3D Digital Twin */
        <main style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setViewMode('desktop')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              ← Back to FarmOS 3D Digital Twin Map
            </button>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Autogrow Mobile App v3.0 Preview Mode
            </span>
          </div>

          <PhoneAppView
            metrics={metrics}
            actuators={actuators}
            active_alarms={active_alarms}
            setpoint={setpoint}
            connectionStatus={connectionStatus}
            onTriggerCommand={handleTriggerCommand}
            onAcknowledgeAlarm={handleAcknowledgeAlarm}
            isStandaloneMobile={false}
          />
        </main>
      ) : (
        /* Full Farm Digital Twin Control Center (WarehouseOS Style with 1x1 Tile Grid) */
        <FarmOSControlCenter
          metrics={metrics}
          actuators={actuators}
          active_alarms={active_alarms}
          setpoint={setpoint}
          connectionStatus={connectionStatus}
          onToggleViewMode={setViewMode}
          onOpenSetpoints={() => setIsSetpointsOpen(true)}
          onTriggerCommand={handleTriggerCommand}
          onSaveSetpoint={handleSaveSetpoint}
          onAcknowledgeAlarm={handleAcknowledgeAlarm}
        />
      )}

      {/* Setpoints Dialog Modal */}
      <SetpointsModal
        isOpen={isSetpointsOpen}
        onClose={() => setIsSetpointsOpen(false)}
        setpoint={setpoint}
        onSaveSetpoint={handleSaveSetpoint}
      />
    </div>
  );
}
