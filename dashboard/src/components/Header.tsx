import React from 'react';
import { Wifi, WifiOff, OctagonAlert, Sliders, RefreshCw } from 'lucide-react';

interface HeaderProps {
  farmId: string;
  zoneName: string;
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'OFFLINE';
  lastUpdated: string;
  onOpenSetpoints: () => void;
  onEmergencyPause: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  farmId,
  zoneName,
  connectionStatus,
  lastUpdated,
  onOpenSetpoints,
  onEmergencyPause
}) => {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-hairline)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      gap: '16px',
      flexWrap: 'wrap'
    }}>
      {/* Brand & Zone Identifiers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          backgroundColor: '#10B981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          color: '#FFFFFF',
          fontSize: '18px',
          fontFamily: 'var(--font-mono)'
        }}>
          A
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              AUTOGROW FARM OS
            </span>
            <span style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              backgroundColor: 'var(--border-hairline)',
              padding: '2px 6px',
              borderRadius: '4px',
              color: 'var(--text-muted)'
            }}>
              v1.0-EDGE
            </span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span>{zoneName}</span>
            <span>•</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{farmId}</span>
            <span>•</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              Sync: {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Network Status & Real-time Connectivity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: connectionStatus === 'CONNECTED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${connectionStatus === 'CONNECTED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          padding: '6px 12px',
          borderRadius: '999px',
          fontSize: '11.5px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)'
        }}>
          {connectionStatus === 'CONNECTED' ? (
            <>
              <Wifi size={14} color="#10B981" />
              <span style={{ color: '#10B981' }}>LOCAL LAN ONLINE</span>
            </>
          ) : connectionStatus === 'CONNECTING' ? (
            <>
              <RefreshCw size={14} color="#F59E0B" className="spin" />
              <span style={{ color: '#F59E0B' }}>CONNECTING TO EDGE...</span>
            </>
          ) : (
            <>
              <WifiOff size={14} color="#EF4444" />
              <span style={{ color: '#EF4444' }}>EDGE GATEWAY OFFLINE</span>
            </>
          )}
        </div>

        {/* Setpoints Configuration Trigger */}
        <button
          onClick={onOpenSetpoints}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-hairline)',
            color: 'var(--text-main)',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.15s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--border-hairline)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)')}
        >
          <Sliders size={14} color="#38BDF8" />
          <span>Crop Setpoints</span>
        </button>

        {/* Software "Pause All Outputs" Button (Explicitly distinct from physical E-STOP) */}
        <button
          onClick={() => {
            if (confirm('PAUSE ALL OUTPUTS: This immediately stops all dosing pumps and irrigation valves. Continue?')) {
              onEmergencyPause();
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#DC2626',
            border: 'none',
            color: '#FFFFFF',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)'
          }}
          title="Software Pause: Shuts down all active pump timers immediately"
        >
          <OctagonAlert size={14} />
          <span>Pause All Outputs</span>
        </button>
      </div>
    </header>
  );
};
