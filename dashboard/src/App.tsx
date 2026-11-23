import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MetricCard } from './components/MetricCard';
import { ActuatorMatrix } from './components/ActuatorMatrix';
import { TelemetryChart } from './components/TelemetryChart';
import { AlarmsFeed } from './components/AlarmsFeed';
import { SetpointsModal } from './components/SetpointsModal';
import { PhoneAppView } from './components/PhoneAppView';
import { Sidebar, type ScadaTab } from './components/Sidebar';
import { FarmDesigner } from './components/FarmDesigner';
import { FarmOutputAnalytics } from './components/FarmOutputAnalytics';
import { DoseSuggestions } from './components/DoseSuggestions';
import { useFarmWebSocket } from './hooks/useFarmWebSocket';
import type { ZoneSetpoint } from '@autogrow/shared';

export default function App() {
  const { metrics, actuators, active_alarms, setpoint, connectionStatus, lastUpdated } = useFarmWebSocket();
  const [isSetpointsOpen, setIsSetpointsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('desktop');
  const [currentTab, setCurrentTab] = useState<ScadaTab>('matrix');
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
      expires_at: new Date(now + 10000).toISOString() // 10 second expiry
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

  // Software Emergency Pause
  const handleEmergencyPause = async () => {
    const host = window.location.hostname || 'localhost';
    if (host.includes('github.io') || host.includes('vercel.app')) {
      return;
    }
    try {
      await fetch(`http://${host}:8080/api/emergency-pause`, { method: 'POST' });
    } catch (e) {
      console.error('[Pause Failed]', e);
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

  // If user opens directly on a physical phone screen, render full-bleed mobile UI directly
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* SCADA Header */}
      <Header
        farmId="farm-akl-001"
        zoneName="Venlo Bay 1 (Tomatoes)"
        connectionStatus={connectionStatus}
        lastUpdated={lastUpdated}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onOpenSetpoints={() => setIsSetpointsOpen(true)}
        onEmergencyPause={handleEmergencyPause}
      />

      {viewMode === 'mobile' ? (
        /* Mobile App View with scaling studio and flanking telemetry cards */
        <main style={{ flex: 1, padding: '24px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          <section style={{ padding: '16px 0 32px' }}>
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
          </section>
        </main>
      ) : (
        /* Desktop SCADA Suite with Sidebar Navigation */
        <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 61px)' }}>
          {/* Farm Management Sidebar */}
          <Sidebar
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            viewMode={viewMode}
            onToggleViewMode={setViewMode}
            onOpenSetpoints={() => setIsSetpointsOpen(true)}
            activeAlarmsCount={active_alarms.length}
            connectionStatus={connectionStatus}
          />

          {/* Dynamic Content Area */}
          <main style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              {currentTab === 'matrix' && (
                <>
                  {/* Core CEA Metrics Strip */}
                  <section style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                      <MetricCard
                        metricKey="ec"
                        value={metrics.ec}
                        target={setpoint?.target_ec}
                        deadband={setpoint?.ec_deadband}
                      />
                      <MetricCard
                        metricKey="ph"
                        value={metrics.ph}
                        target={setpoint?.target_ph}
                        deadband={setpoint?.ph_deadband}
                      />
                      <MetricCard
                        metricKey="vpd"
                        value={metrics.vpd}
                        target={setpoint?.target_vpd}
                        deadband={0.25}
                      />
                      <MetricCard
                        metricKey="vwc"
                        value={metrics.vwc}
                        target={setpoint?.target_vwc_irrigation}
                        deadband={5.0}
                      />
                      <MetricCard
                        metricKey="temp_air"
                        value={metrics.temp_air}
                        target={setpoint?.target_temp_day}
                        deadband={1.5}
                      />
                      <MetricCard
                        metricKey="humidity"
                        value={metrics.humidity}
                        deadband={5.0}
                      />
                      <MetricCard
                        metricKey="ppfd"
                        value={metrics.ppfd}
                      />
                      <MetricCard
                        metricKey="water_temp"
                        value={metrics.water_temp}
                        target={20.0}
                        deadband={2.0}
                      />
                    </div>
                  </section>

                  {/* Telemetry Chart & Actuators Control Grid */}
                  <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <ActuatorMatrix
                        actuators={actuators}
                        onTriggerCommand={handleTriggerCommand}
                      />
                      <AlarmsFeed
                        alarms={active_alarms}
                        onAcknowledgeAlarm={handleAcknowledgeAlarm}
                      />
                    </div>

                    <div>
                      <TelemetryChart currentMetricValues={metrics} />
                    </div>
                  </section>
                </>
              )}

              {currentTab === 'designer' && (
                <FarmDesigner
                  metrics={metrics}
                  onTriggerActuator={handleTriggerCommand}
                />
              )}

              {currentTab === 'output' && (
                <FarmOutputAnalytics />
              )}

              {currentTab === 'suggestions' && (
                <DoseSuggestions
                  currentSetpoint={setpoint}
                  onApplySetpoints={handleSaveSetpoint}
                />
              )}
            </div>
          </main>
        </div>
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
