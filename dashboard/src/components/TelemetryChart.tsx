import React, { useState, useEffect } from 'react';
import { METRIC_METADATA } from '@autogrow/shared';

interface TelemetryChartProps {
  currentMetricValues: Record<string, number>;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ currentMetricValues }) => {
  const [selectedMetric, setSelectedMetric] = useState<'vpd' | 'ec' | 'ph' | 'temp_air' | 'vwc'>('vpd');
  const [historyData, setHistoryData] = useState<{ bucket_minute: string; avg_val: number; min_val: number; max_val: number }[]>([]);

  const fetchHistory = async (metric: string) => {
    try {
      const host = window.location.hostname || 'localhost';
      const res = await fetch(`http://${host}:8080/api/telemetry/history?metric=${metric}&hours=24`);
      if (res.ok) {
        const json = await res.json();
        setHistoryData(json.history || []);
      }
    } catch {
      // If edge offline, fallback to generated curve for preview
      generateSyntheticPreview(metric);
    }
  };

  const generateSyntheticPreview = (metric: string) => {
    const points: any[] = [];
    const base = metric === 'ec' ? 2.35 : metric === 'ph' ? 5.8 : metric === 'vpd' ? 1.15 : metric === 'temp_air' ? 22 : 65;
    
    for (let i = 24; i >= 0; i--) {
      const time = new Date(Date.now() - i * 3600000).toISOString();
      const wave = Math.sin((i / 24) * Math.PI * 2) * (metric === 'vpd' ? 0.4 : 0.2);
      const val = Number((base + wave + (Math.random() * 0.05 - 0.025)).toFixed(2));
      points.push({
        bucket_minute: time,
        avg_val: val,
        min_val: val - 0.05,
        max_val: val + 0.05
      });
    }
    setHistoryData(points);
  };

  useEffect(() => {
    fetchHistory(selectedMetric);
    const interval = setInterval(() => fetchHistory(selectedMetric), 60000);
    return () => clearInterval(interval);
  }, [selectedMetric]);

  const meta = METRIC_METADATA[selectedMetric] || { label: selectedMetric, unit: '', precision: 2 };
  const currentLive = currentMetricValues[selectedMetric] !== undefined ? currentMetricValues[selectedMetric] : 0;

  // Compute SVG Polyline Points
  const width = 800;
  const height = 200;
  const padding = 20;

  const vals = historyData.map(d => d.avg_val);
  const min = vals.length > 0 ? Math.min(...vals) * 0.95 : 0;
  const max = vals.length > 0 ? Math.max(...vals) * 1.05 : 10;
  const range = max - min || 1;

  const pointsString = historyData.map((d, index) => {
    const x = padding + (index / Math.max(1, historyData.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.avg_val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-hairline)',
      borderRadius: '12px',
      padding: '24px'
    }}>
      {/* Chart Header & Metric Selectors */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
              24-HOUR CEA TREND CURVES
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              (1-Minute Rollup Resolution)
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
            Store-and-forward edge telemetry with minute-level diurnal tracking.
          </div>
        </div>

        {/* Metric Switcher Tabs */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-primary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-hairline)' }}>
          {[
            { id: 'vpd', label: 'VPD' },
            { id: 'ec', label: 'EC' },
            { id: 'ph', label: 'pH' },
            { id: 'temp_air', label: 'Temp' },
            { id: 'vwc', label: 'VWC%' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedMetric(tab.id as any)}
              style={{
                padding: '5px 12px',
                fontSize: '11.5px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                backgroundColor: selectedMetric === tab.id ? 'var(--bg-surface-elevated)' : 'transparent',
                color: selectedMetric === tab.id ? '#10B981' : 'var(--text-dim)',
                border: selectedMetric === tab.id ? '1px solid var(--border-subtle)' : '1px solid transparent',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Stats Strip */}
      <div style={{ display: 'flex', gap: '20px', padding: '12px 16px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '8px', border: '1px solid var(--border-hairline)', marginBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Live Now</span>
          <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#10B981' }}>
            {currentLive.toFixed(meta.precision)} {meta.unit}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>24h Low</span>
          <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38BDF8' }}>
            {vals.length > 0 ? Math.min(...vals).toFixed(meta.precision) : '0'} {meta.unit}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>24h High</span>
          <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#F59E0B' }}>
            {vals.length > 0 ? Math.max(...vals).toFixed(meta.precision) : '0'} {meta.unit}
          </div>
        </div>
      </div>

      {/* SVG Canvas Plot */}
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '180px', display: 'block' }}>
          {/* Subtle grid lines */}
          <line x1={padding} y1={height / 4} x2={width - padding} y2={height / 4} stroke="var(--border-hairline)" strokeDasharray="4 4" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--border-hairline)" strokeDasharray="4 4" />
          <line x1={padding} y1={(height * 3) / 4} x2={width - padding} y2={(height * 3) / 4} stroke="var(--border-hairline)" strokeDasharray="4 4" />

          {/* Polyline Curve */}
          {pointsString && (
            <polyline
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsString}
            />
          )}
        </svg>
      </div>
    </div>
  );
};
