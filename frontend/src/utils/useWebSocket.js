import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Custom hook for managing WebSocket connections with auto-reconnect
 * @param {string} url - WebSocket URL
 * @param {Function} onMessage - Callback for incoming messages
 * @param {Object} options - Configuration options
 */
export const useWebSocket = (url, onMessage, options = {}) => {
  const {
    reconnectInterval = 3000,
    reconnectAttempts = 5,
    onOpen = null,
    onClose = null,
    onError = null,
    enabled = true
  } = options;

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectCountRef = useRef(0);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastError, setLastError] = useState(null);

  const connect = useCallback(() => {
    if (!enabled || !url) {
      console.log('[WS Hook] WebSocket disabled or no URL provided');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('[WS Hook] Already connected or connecting');
      return;
    }

    try {
      console.log('[WS Hook] Connecting to:', url);
      setConnectionStatus('connecting');
      
      const ws = new WebSocket(url);

      ws.onopen = (event) => {
        console.log('[WS Hook] Connected');
        setConnectionStatus('connected');
        setLastError(null);
        reconnectCountRef.current = 0;
        
        if (onOpen) onOpen(event);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WS Hook] Message received:', data.type);
          
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error('[WS Hook] Error parsing message:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('[WS Hook] WebSocket error');
        const errorMsg = 'WebSocket connection error';
        setLastError(errorMsg);
        setConnectionStatus('error');
        
        if (onError) onError(event);
      };

      ws.onclose = (event) => {
        console.log('[WS Hook] Disconnected', event.code, event.reason);
        setConnectionStatus('disconnected');
        wsRef.current = null;
        
        if (onClose) onClose(event);

        // Auto-reconnect logic
        if (enabled && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(
            `[WS Hook] Reconnecting... (attempt ${reconnectCountRef.current}/${reconnectAttempts})`
          );
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectCountRef.current >= reconnectAttempts) {
          console.log('[WS Hook] Max reconnection attempts reached');
          setConnectionStatus('failed');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WS Hook] Error creating WebSocket:', error);
      setConnectionStatus('error');
      setLastError(error.message);
    }
  }, [url, enabled, onMessage, onOpen, onClose, onError, reconnectInterval, reconnectAttempts]);

  const disconnect = useCallback(() => {
    console.log('[WS Hook] Disconnecting...');
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    reconnectCountRef.current = 0;
  }, []);

  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
      return true;
    } else {
      console.warn('[WS Hook] Cannot send message - WebSocket not connected');
      return false;
    }
  }, []);

  // Connect on mount and when URL changes
  useEffect(() => {
    if (enabled && url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, enabled, connect, disconnect]);

  // Heartbeat/keepalive
  useEffect(() => {
    if (connectionStatus !== 'connected') return;

    const heartbeatInterval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000); // Every 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, [connectionStatus, sendMessage]);

  return {
    sendMessage,
    disconnect,
    reconnect: connect,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    lastError
  };
};

export default useWebSocket;
