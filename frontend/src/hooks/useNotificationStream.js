import { useEffect, useRef, useState } from "react";

/**
 * Connects to backend WebSocket and pushes events to subscribers.
 * Auto-reconnects on disconnect.
 */
export function useNotificationStream(onEvent) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
    // Convert http/https to ws/wss
    const wsUrl = BACKEND_URL.replace(/^http/, "ws") + "/api/ws/events";

    let stopped = false;
    let retry = null;

    const connect = () => {
      if (stopped) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => setConnected(true);
        ws.onclose = () => {
          setConnected(false);
          if (!stopped) retry = setTimeout(connect, 4000);
        };
        ws.onerror = () => { try { ws.close(); } catch {} };
        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            if (handlerRef.current) handlerRef.current(data);
          } catch {}
        };
      } catch {
        if (!stopped) retry = setTimeout(connect, 4000);
      }
    };

    connect();
    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      if (wsRef.current) try { wsRef.current.close(); } catch {}
    };
  }, []);

  return { connected };
}
