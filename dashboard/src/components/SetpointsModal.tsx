import React, { useState } from 'react';
import { X, Save, Sliders } from 'lucide-react';
import type { ZoneSetpoint } from '@autogrow/shared';

interface SetpointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  setpoint: ZoneSetpoint | null;
  onSaveSetpoint: (newSetpoint: ZoneSetpoint) => Promise<void>;
}

export const SetpointsModal: React.FC<SetpointsModalProps> = ({
  isOpen,
  onClose,
  setpoint,
  onSaveSetpoint
}) => {
  const [formData, setFormData] = useState<ZoneSetpoint>(
    setpoint || {
      farm_id: 'farm-akl-001',
      zone_id: 'zone-1',
      crop_profile: 'Vine Crops (Tomatoes)',
      target_ec: 2.4,
      ec_deadband: 0.15,
      target_ph: 5.8,
      ph_deadband: 0.2,
      target_vpd: 1.15,
      target_temp_day: 24.0,
      target_temp_night: 18.0,
      target_vwc_irrigation: 58.0,
      updated_at: new Date().toISOString()
    }
  );

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSetpoint({ ...formData, updated_at: new Date().toISOString() });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(7, 11, 20, 0.8)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        padding: '28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="#10B981" />
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF' }}>
              Crop CEA Setpoints & Target Deadbands
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Target EC */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Target EC (mS/cm)
              </label>
              <input
                type="number"
                step="0.05"
                value={formData.target_ec}
                onChange={(e) => setFormData({ ...formData, target_ec: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                EC Deadband (±)
              </label>
              <input
                type="number"
                step="0.05"
                value={formData.ec_deadband}
                onChange={(e) => setFormData({ ...formData, ec_deadband: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          {/* Target pH */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Target pH
              </label>
              <input
                type="number"
                step="0.05"
                value={formData.target_ph}
                onChange={(e) => setFormData({ ...formData, target_ph: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                pH Deadband (±)
              </label>
              <input
                type="number"
                step="0.05"
                value={formData.ph_deadband}
                onChange={(e) => setFormData({ ...formData, ph_deadband: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          {/* Target VPD & VWC */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Target VPD (kPa)
              </label>
              <input
                type="number"
                step="0.05"
                value={formData.target_vpd}
                onChange={(e) => setFormData({ ...formData, target_vpd: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Irrigation Trigger (% VWC)
              </label>
              <input
                type="number"
                step="1"
                value={formData.target_vwc_irrigation}
                onChange={(e) => setFormData({ ...formData, target_vwc_irrigation: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-hairline)', borderRadius: '6px', color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#10B981',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '13.5px',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Save size={16} />
            <span>{saving ? 'Syncing to Edge...' : 'Save & Arm Automation Rules'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
