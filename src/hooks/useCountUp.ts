// ============================================================
// جرب حظك — useCountUp
// عدّاد يتدحرج نحو الهدف (أرصدة، مجموع رهان، أرباح).
// يحترم reduced-motion (يقفز مباشرة للقيمة).
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useReducedMotion } from '../constants/motion';

export function useCountUp(target: number, duration = 550): number {
  const [display, setDisplay] = useState(target);
  const anim = useRef(new Animated.Value(target)).current;
  const prev = useRef(target);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setDisplay(target);
      prev.current = target;
      return;
    }
    if (target === prev.current) return;
    anim.stopAnimation();
    anim.setValue(prev.current);
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    Animated.timing(anim, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      prev.current = target;
      anim.removeListener(id);
    });
    return () => anim.removeListener(id);
  }, [target, duration, reduced, anim]);

  return display;
}
