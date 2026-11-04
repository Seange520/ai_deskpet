import { useCallback, useEffect, useRef, useState } from 'react';
import { hardwareConnection, useHardwareStore } from './useHardwareStore';
import { createSerialDemoSession } from './serialDemoSession';

export function useSerialDemoSession(enabled) {
  const [session, setSession] = useState({ samples: [], events: [] });
  const observer = useRef(null);
  useEffect(() => {
    if (!enabled) {
      setSession({ samples: [], events: [] });
      return;
    }
    const current = createSerialDemoSession(useHardwareStore, setSession);
    observer.current = current;
    return () => {
      observer.current = null;
      current.dispose();
    };
  }, [enabled]);
  const sendLight = useCallback((light) => {
    const accepted = hardwareConnection.setDemoLight(light);
    observer.current?.recordCommand(light, accepted);
    return accepted;
  }, []);
  return { ...session, sendLight };
}
