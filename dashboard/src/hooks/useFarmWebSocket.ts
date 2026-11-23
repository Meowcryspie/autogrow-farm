import { useState, useEffect, useRef, useCallback } from 'react';
import type { ActuatorState, AlarmEvent, ZoneSetpoint } from '@autogrow/shared';

export interface LiveTelemetryState {
  metrics: Record<string, number>;
  actuators: Record<string, ActuatorState>;
  active_alarms: AlarmEvent[];
  setpoint: ZoneSetpoint | null;
  lastUpdated: string;
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'OFFLINE';
}

export function useFarmWebSocket() {
  const [telemetry, setTelemetry] = useState<LiveTelemetryState>({
    metrics: {
      ec: 2.35,
      ph: 5.82,
      vpd: 1.15,
      temp_air: 22.4,
      humidity: 72.0,
      vwc: 64.5,
      ppfd: 450,
      water_temp: 20.8
    },
    actuators: {},
    active_alarms: [],
    setpoint: null,
    lastUpdated: new Date().toISOString(),
    connectionStatus: 'CONNECTING'
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    const host = window.location.hostname || 'localhost';
    
    // Cloud Demo Mode on GitHub Pages or static host without local daemon
    if (host.includes('github.io') || host.includes('vercel.app')) {
      setTelemetry(prev => ({ ...prev, connectionStatus: 'CONNECTED' }));
      const interval = setInterval(() => {
        setTelemetry(prev => {
          const jitterEC = Number((prev.metrics.ec + (Math.random() * 0.04 - 0.02)).toFixed(2));
          const jitterPH = Number((prev.metrics.ph + (Math.random() * 0.02 - 0.01)).toFixed(2));
          const jitterTemp = Number((prev.metrics.temp_air + (Math.random() * 0.2 - 0.1)).toFixed(1));
          return {
            ...prev,
            metrics: {
              ...prev.metrics,
              ec: Math.max(1.5, Math.min(2.5, jitterEC)),
              ph: Math.max(5.6, Math.min(6.2, jitterPH)),
              temp_air: jitterTemp,
              co2: Math.round(750 + Math.random() * 30),
              vwc: Number((64.0 + Math.random() * 0.8).toFixed(1)),
            },
            lastUpdated: new Date().toISOString(),
            connectionStatus: 'CONNECTED'
          };
        });
      }, 2000);
      return () => clearInterval(interval);
    }

    const wsUrl = `ws://${host}:8080/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setTelemetry(prev => ({ ...prev, connectionStatus: 'CONNECTED' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'TELEMETRY_TICK') {
            setTelemetry({
              metrics: data.metrics || {},
              actuators: data.actuators || {},
              active_alarms: data.active_alarms || [],
              setpoint: data.setpoint || null,
              lastUpdated: data.timestamp || new Date().toISOString(),
              connectionStatus: 'CONNECTED'
            });
          }
        } catch (e) {
          console.error('[WS Parse Error]', e);
        }
      };

      ws.onclose = () => {
        setTelemetry(prev => ({ ...prev, connectionStatus: 'OFFLINE' }));
        // Auto-reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setTelemetry(prev => ({ ...prev, connectionStatus: 'OFFLINE' }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return telemetry;
}
