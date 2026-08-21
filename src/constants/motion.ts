// ============================================================
// جرب حظك — Motion Utilities (Dark Luxe)
// ثوابت الموشن + كاشف reduced-motion (إتاحة إلزامية)
// ============================================================

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { ANIMATION } from './theme';

/** تتابع توزيع الأوراق والعناصر */
export const STAGGER = ANIMATION.deal;
/** مدة دخول العناصر عند فتح الشاشة */
export const ENTER = ANIMATION.enter;

/**
 * هل يفضّل المستخدم تقليل الحركة؟
 * يجب تعطيل/تبسيط كل الأنيميشن عند true (إتاحة إلزامية).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
