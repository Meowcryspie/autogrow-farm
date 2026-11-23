import React from 'react';
import { METRIC_METADATA } from '@autogrow/shared';

interface MetricCardProps {
  metricKey: string;
  value?: number;
  target?: number;
  deadband?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  metricKey,
  value,
  target,
  deadband = 0.2
}) => {
  const meta = METRIC_METADATA[metricKey] || {
    label: metricKey.toUpperCase(),
    unit: '',
    min: 0,
    max: 100,
    precision: 2
  };

  const currentVal = value !== undefined ? value : 0;
  const formattedVal = currentVal.toFixed(meta.precision);

  // Status calculation relative to setpoint
  let statusColor = '#10B981'; // Green
  let deltaText = 'Target Met';

  if (target !== undefined) {
    const delta = currentVal - target;
    if (Math.abs(delta) <= deadband) {
      statusColor = '#10B981';
      deltaText = 'Optimal';
    } else if (delta > deadband) {
      statusColor = '#F59E0B';
      deltaText = `+${delta.toFixed(meta.precision)} High`;
    } else {
      statusColor = '#F59E0B';
      deltaText = `${delta.toFixed(meta.precision)} Low`;
    }
  }

  // Progress Bar Percentage
  const range = meta.max - meta.min;
  const percent = Math.min(100, Math.max(0, ((currentVal - meta.min) / range) * 100));

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-hairline)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {meta.label}
        </span>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: statusColor,
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          padding: '2px 8px',
          borderRadius: '4px',
          border: `1px solid ${statusColor}40`
        }}>
          {deltaText}
        </span>
      </div>

      {/* Primary Value Display */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0 16px' }}>
        <span style={{
          fontSize: '36px',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: '#FFFFFF',
          lineHeight: 1
        }}>
          {formattedVal}
        </span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dim)' }}>
          {meta.unit}
        </span>
      </div>

      {/* Target Setpoint & Mechanical Hairline Gauge Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>
          <span>Min: {meta.min}{meta.unit}</span>
          {target !== undefined && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
              Setpoint: {target.toFixed(meta.precision)} {meta.unit}
            </span>
          )}
          <span>Max: {meta.max}{meta.unit}</span>
        </div>

        {/* 1px Mechanical Rail with Active Track */}
        <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border-hairline)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            width: `${percent}%`,
            height: '100%',
            backgroundColor: statusColor,
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>
    </div>
  );
};
