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

  // مستمع دائم: القيمة تُحدَّث من رد نداء خارجي (لا من جسم الـ effect)
  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    return () => anim.removeListener(id);
  }, [anim]);

  useEffect(() => {
    if (reduced || target === prev.current) return;
    anim.stopAnimation();
    anim.setValue(prev.current);
    Animated.timing(anim, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      prev.current = target;
    });
  }, [target, duration, reduced, anim]);

  // عند تقليل الحركة: القيمة النهائية مباشرة دون تحديث حالة
  return reduced ? target : display;
}
