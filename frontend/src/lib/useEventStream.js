import { useEffect, useRef } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Subscribe to a Server-Sent Events stream. The browser's native EventSource
 * auto-reconnects on disconnect, so we just wrap it in a hook.
 *
 * @param {string|null} path  e.g. "/api/events/staff" or "/api/events/order/<id>"
 * @param {(msg: any) => void} onMessage  Called on every JSON message payload
 */
export function useEventStream(path, onMessage) {
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  useEffect(() => {
    if (!path) return;
    const url = `${BACKEND_URL}${path}`;
    const es = new EventSource(url);

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        cbRef.current?.(data);
      } catch (_) {
        /* ignore */
      }
    };
    es.onerror = () => {
      // EventSource auto-reconnects. We just let it.
    };

    return () => {
      es.close();
    };
  }, [path]);
}

// Alias for backward compatibility with old useWebSocket import
export const useWebSocket = useEventStream;
