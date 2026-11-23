import React from 'react';
import { 
  Activity, 
  Layers, 
  TrendingUp, 
  Sparkles, 
  Sliders, 
  Smartphone, 
  ShieldCheck, 
  ChevronRight,
  Wifi,
  Building2
} from 'lucide-react';

export type ScadaTab = 'matrix' | 'designer' | 'output' | 'suggestions';

interface SidebarProps {
  currentTab: ScadaTab;
  onSelectTab: (tab: ScadaTab) => void;
  viewMode: 'mobile' | 'desktop';
  onToggleViewMode: (mode: 'mobile' | 'desktop') => void;
  onOpenSetpoints: () => void;
  activeAlarmsCount: number;
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'OFFLINE';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  viewMode,
  onToggleViewMode,
  onOpenSetpoints,
  activeAlarmsCount,
  connectionStatus
}) => {
  const navItems: { id: ScadaTab; label: string; icon: React.ReactNode; badge?: string; desc: string }[] = [
    {
      id: 'matrix',
      label: 'SCADA Matrix',
      icon: <Activity size={18} />,
      badge: activeAlarmsCount > 0 ? `${activeAlarmsCount} ALARMS` : undefined,
      desc: 'Live telemetry & relays'
    },
    {
      id: 'designer',
      label: '3D Farm Designer',
      icon: <Layers size={18} />,
      badge: 'CAD HUD',
      desc: 'Layout & sensor placement'
    },
    {
      id: 'output',
      label: 'Farm Output & Yield',
      icon: <TrendingUp size={18} />,
      badge: '+18%',
      desc: 'Harvest & biomass analytics'
    },
    {
      id: 'suggestions',
      label: 'Dosing Suggestions',
      icon: <Sparkles size={18} />,
      badge: 'AI + Research',
      desc: 'Output-backed optimization'
    }
  ];

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-hairline)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      minHeight: 'calc(100vh - 61px)',
      userSelect: 'none'
    }}>
      {/* Facility Header Card */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-hairline)',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Building2 size={15} color="#10B981" />
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            FACILITY #01
          </span>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
          Venlo Glasshouse Bay 1
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
          <Wifi size={12} color={connectionStatus === 'CONNECTED' ? '#10B981' : '#EF4444'} />
          <span>Local Edge: <strong>100% Offline Capable</strong></span>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Farm Management
        </div>

        {navItems.map(item => {
          const isActive = viewMode === 'desktop' && currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (viewMode === 'mobile') onToggleViewMode('desktop');
                onSelectTab(item.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                backgroundColor: isActive ? 'var(--bg-surface-elevated)' : 'transparent',
                color: isActive ? '#10B981' : 'var(--text-dim)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ color: isActive ? '#10B981' : 'var(--text-muted)' }}>
                {item.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: isActive ? 800 : 600, color: isActive ? '#FFFFFF' : 'var(--text-main)', lineHeight: 1.2 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {item.desc}
                </div>
              </div>
              {item.badge && (
                <span style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: item.badge.includes('ALARMS') ? '#FEE2E2' : 'rgba(16, 185, 129, 0.15)',
                  color: item.badge.includes('ALARMS') ? '#DC2626' : '#10B981',
                  border: item.badge.includes('ALARMS') ? '1px solid #FCA5A5' : '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div style={{ height: '1px', backgroundColor: 'var(--border-hairline)', margin: '8px 6px' }} />

        {/* Setpoints Quick Trigger */}
        <button
          onClick={onOpenSetpoints}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid transparent',
            backgroundColor: 'transparent',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%'
          }}
        >
          <Sliders size={18} color="var(--text-muted)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
              Crop Setpoints
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Target EC, pH, VPD corridors
            </div>
          </div>
        </button>

        {/* Mobile View Mode Switcher */}
        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: viewMode === 'mobile' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-primary)',
            border: viewMode === 'mobile' ? '1px solid #10B981' : '1px solid var(--border-hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={15} color="#10B981" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                  Mobile Mode
                </span>
              </div>
              <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: viewMode === 'mobile' ? '#10B981' : 'var(--text-muted)' }}>
                {viewMode === 'mobile' ? 'ACTIVE' : 'POCKET'}
              </span>
            </div>
            <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              Experience the pocket mobile app with simulated 3D phone chassis.
            </p>
            <button
              onClick={() => onToggleViewMode(viewMode === 'mobile' ? 'desktop' : 'mobile')}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: viewMode === 'mobile' ? '#10B981' : 'var(--bg-surface-elevated)',
                color: viewMode === 'mobile' ? '#FFFFFF' : 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              {viewMode === 'mobile' ? 'Switch to Desktop SCADA' : 'Launch Mobile App View'}
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Safety Interlock Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-hairline)',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <ShieldCheck size={16} color="#10B981" />
        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          EDGE FAIL-SAFE: <strong>ACTIVE</strong>
        </div>
      </div>
    </aside>
  );
};
