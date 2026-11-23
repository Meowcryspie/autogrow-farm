import React, { useState } from 'react';
import { Droplet, Wind, Activity, Play } from 'lucide-react';
import type { ActuatorState } from '@autogrow/shared';

interface ActuatorMatrixProps {
  actuators: Record<string, ActuatorState>;
  onTriggerCommand: (actuatorId: string, durationSec: number) => Promise<boolean>;
}

export const ActuatorMatrix: React.FC<ActuatorMatrixProps> = ({
  actuators,
  onTriggerCommand
}) => {
  const [pulsingActuator, setPulsingActuator] = useState<string | null>(null);

  const actuatorDefs = [
    { id: 'pump-acid', label: 'Acid Dosing Pump', sub: 'pH Down (Nitric/Phosphoric)', icon: Droplet, defaultDuration: 12, color: '#EF4444' },
    { id: 'pump-nutrient-a', label: 'Nutrient Pump A', sub: 'Calcium Nitrate Stock', icon: Activity, defaultDuration: 15, color: '#10B981' },
    { id: 'pump-nutrient-b', label: 'Nutrient Pump B', sub: 'Potassium / Micronutrients', icon: Activity, defaultDuration: 15, color: '#10B981' },
    { id: 'valve-irrigation-1', label: 'Irrigation Zone 1', sub: 'Substrate Slab Solenoid', icon: Droplet, defaultDuration: 30, color: '#38BDF8' },
    { id: 'ridge-vent-north', label: 'Ridge Vent (North)', sub: 'Canopy Thermal Relief', icon: Wind, defaultDuration: 20, color: '#F59E0B' },
  ];

  const handlePulse = async (actuatorId: string, duration: number) => {
    setPulsingActuator(actuatorId);
    try {
      await onTriggerCommand(actuatorId, duration);
    } finally {
      setPulsingActuator(null);
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-hairline)',
      borderRadius: '12px',
      padding: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
            SCADA ACTUATOR & RELAY MATRIX
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '2px 0 0' }}>
            Closed-loop dosing solenoids, irrigation banks, and automated ventilation controls.
          </p>
        </div>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '4px' }}>
          EDGE FAIL-SAFE ARMED
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        {actuatorDefs.map((def) => {
          const liveState = actuators[def.id] || { status: 'IDLE', remaining_seconds: 0 };
          const isActive = liveState.status === 'ACTIVE' || (liveState.remaining_seconds && liveState.remaining_seconds > 0);
          const Icon = def.icon;
          const isBusy = pulsingActuator === def.id;

          return (
            <div
              key={def.id}
              style={{
                backgroundColor: isActive ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-surface-elevated)',
                border: `1px solid ${isActive ? '#10B981' : 'var(--border-hairline)'}`,
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'border-color 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? '#10B981' : 'var(--border-hairline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive ? '#FFFFFF' : 'var(--text-muted)'
                  }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                      {def.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {def.sub}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <span style={{
                  fontSize: '10.5px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: isActive ? '#10B981' : 'var(--border-hairline)',
                  color: isActive ? '#FFFFFF' : 'var(--text-dim)'
                }}>
                  {isActive ? `RUNNING (${liveState.remaining_seconds}s)` : 'IDLE'}
                </span>
              </div>

              {/* Action Button (Slide-to-Confirm or One-Click Timed Pulse) */}
              <button
                onClick={() => handlePulse(def.id, def.defaultDuration)}
                disabled={isActive || isBusy}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: isActive ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-hairline)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: isActive ? '#10B981' : '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: isActive || isBusy ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !isBusy) e.currentTarget.style.backgroundColor = 'var(--border-subtle)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive && !isBusy) e.currentTarget.style.backgroundColor = 'var(--border-hairline)';
                }}
              >
                <Play size={13} />
                <span>
                  {isActive ? `Pumping... (${liveState.remaining_seconds}s left)` : `Trigger ${def.defaultDuration}s Shot`}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
