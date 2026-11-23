import React from 'react';
import { AlertTriangle, Info, ShieldAlert, Check } from 'lucide-react';
import type { AlarmEvent } from '@autogrow/shared';

interface AlarmsFeedProps {
  alarms: AlarmEvent[];
  onAcknowledgeAlarm: (alarmId: string) => Promise<void>;
}

export const AlarmsFeed: React.FC<AlarmsFeedProps> = ({ alarms, onAcknowledgeAlarm }) => {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-hairline)',
      borderRadius: '12px',
      padding: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
            ACTIVE EVENT & ALARM LOG
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '2px 0 0' }}>
            Threshold breaches, probe drift notifications, and pump safety cutoffs.
          </p>
        </div>
        <span style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: alarms.length > 0 ? '#EF4444' : '#10B981',
          backgroundColor: alarms.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          padding: '2px 8px',
          borderRadius: '4px'
        }}>
          {alarms.length > 0 ? `${alarms.length} ACTIVE ALERTS` : 'ALL CLEAR'}
        </span>
      </div>

      {alarms.length === 0 ? (
        <div style={{
          padding: '28px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface-elevated)',
          borderRadius: '8px',
          border: '1px solid var(--border-hairline)'
        }}>
          <div style={{ color: '#10B981', fontSize: '13px', fontWeight: 700 }}>
            No Active Farm Alarms
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-dim)', margin: '4px 0 0' }}>
            Sensors are operating within programmed target deadbands. Local automation active.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alarms.map((alarm) => {
            const isCritical = alarm.severity === 'CRITICAL';
            const isWarning = alarm.severity === 'WARNING';
            const color = isCritical ? '#EF4444' : isWarning ? '#F59E0B' : '#38BDF8';
            const Icon = isCritical ? ShieldAlert : isWarning ? AlertTriangle : Info;

            return (
              <div
                key={alarm.alarm_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: `1px solid ${color}40`,
                  borderRadius: '8px',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={18} color={color} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF' }}>
                      {alarm.message}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      Code: {alarm.code} • {new Date(alarm.triggered_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onAcknowledgeAlarm(alarm.alarm_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: 'var(--text-muted)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--border-hairline)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Check size={12} />
                  <span>Acknowledge</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
