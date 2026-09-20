import { useState, useEffect, useRef } from 'react';

export function useWebSocket(url: string, onMessage: (data: any) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let delay = 1000;

    const connect = () => {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        setIsConnected(true);
        delay = 1000; // Reset delay
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, delay);
        delay = Math.min(delay * 2, 30000); // Exponential backoff max 30s
      };

      ws.onerror = (error) => {
        console.error('WebSocket error', error);
        ws.close();
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, [url, onMessage]);

  const send = (data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  return { isConnected, send };
}
