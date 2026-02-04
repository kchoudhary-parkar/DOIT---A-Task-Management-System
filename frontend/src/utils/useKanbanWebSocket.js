import { useEffect, useRef, useState, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

/**
 * Custom hook for Kanban board WebSocket connections
 * Handles real-time task updates across the board
 */
export default function useKanbanWebSocket(projectId, onMessage, options = {}) {
  const {
    enabled = true,
    reconnectAttempts = 10,
    reconnectInterval = 2000,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  const connect = useCallback(() => {
    if (!enabled || !projectId) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.log('[KANBAN WS] No token available');
      setConnectionStatus('disconnected');
      return;
    }

    try {
      const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/tasks/ws/project/${projectId}?token=${token}`;
      console.log('[KANBAN WS] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      setConnectionStatus('connecting');

      ws.onopen = () => {
        console.log('[KANBAN WS] Connected to project:', projectId);
        setConnectionStatus('connected');
        setIsConnected(true);
        reconnectCountRef.current = 0;

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[KANBAN WS] Message received:', data.type);

          // Handle heartbeat
          if (data.type === 'pong') {
            return;
          }

          // Forward to message handler
          if (onMessage) {
            onMessage(data);
          }
        } catch (error) {
          console.error('[KANBAN WS] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[KANBAN WS] Error:', error);
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        console.log('[KANBAN WS] Connection closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        setIsConnected(false);

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Attempt reconnection
        if (enabled && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(`[KANBAN WS] Reconnecting... (${reconnectCountRef.current}/${reconnectAttempts})`);
          setConnectionStatus('reconnecting');

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectCountRef.current >= reconnectAttempts) {
          console.log('[KANBAN WS] Max reconnect attempts reached');
          setConnectionStatus('failed');
        }
      };
    } catch (error) {
      console.error('[KANBAN WS] Connection error:', error);
      setConnectionStatus('error');
    }
  }, [enabled, projectId, onMessage, reconnectAttempts, reconnectInterval]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (enabled && projectId) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      console.log('[KANBAN WS] Cleaning up connection');
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      setConnectionStatus('disconnected');
      setIsConnected(false);
    };
  }, [connect, enabled, projectId]);

  return {
    connectionStatus,
    isConnected,
    reconnect: connect,
  };
}
