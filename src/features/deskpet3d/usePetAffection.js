import { useCallback, useEffect, useRef, useState } from 'react';

// Raw strokes count independently of the existing happy-animation cooldown.
export function usePetAffection({ compact, paused, blocked, onPet }) {
  const lastHappy = useRef(-Infinity),
    lastDizzy = useRef(-Infinity),
    strokes = useRef([]);
  const [petting, setPetting] = useState(0),
    [dizzy, setDizzy] = useState(0);
  const petHead = useCallback(() => {
    if (compact || paused || blocked) return;
    const now = performance.now();
    if (now - lastDizzy.current < 2200 || now - (strokes.current.at(-1) ?? -Infinity) < 80) return;
    strokes.current = [...strokes.current.filter((time) => now - time <= 1800), now];
    if (strokes.current.length >= 3) {
      lastDizzy.current = now;
      strokes.current = [];
      setPetting(0);
      setDizzy((value) => value + 1);
      onPet?.('dizzy');
    } else if (now - lastHappy.current >= 700) {
      lastHappy.current = now;
      setPetting((value) => value + 1);
      onPet?.('success');
    }
  }, [compact, paused, blocked, onPet]);
  useEffect(() => {
    if (compact || paused || blocked) {
      setPetting(0);
      setDizzy(0);
      strokes.current = [];
      return;
    }
    const happyTimer = petting ? setTimeout(() => setPetting(0), 1300) : null;
    const dizzyTimer = dizzy ? setTimeout(() => setDizzy(0), 2200) : null;
    return () => {
      clearTimeout(happyTimer);
      clearTimeout(dizzyTimer);
    };
  }, [petting, dizzy, compact, paused, blocked]);
  return { petting, dizzy, petHead };
}
