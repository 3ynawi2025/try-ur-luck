// ============================================================
// جرب حظك — useErrorToast
// توست خطأ موحد: يظهر بتروٍّ، يبقى لحظتين، يختفي بنعومة.
// يحترم reduced-motion (يظهر ثابتًا ثم يختفي بمؤقت).
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING, TYPE } from '../constants/theme';
import { useReducedMotion } from '../constants/motion';

export function useErrorToast() {
  const [error, setError] = useState<string | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!error) return;

    if (reduced) {
      // بلا حركة: أظهر فورًا ثم أخفِ بمؤقت
      anim.setValue(1);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setError(null), 2600);
      return;
    }

    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1900),
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setError(null);
    });
  }, [error, reduced, anim]);

  const showError = useCallback((message: string) => {
    if (message) setError(message);
  }, []);

  const errorNode = error ? (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.toastText}>{error}</Text>
    </Animated.View>
  ) : null;

  return { showError, errorNode };
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 84,
    left: SPACING.xl,
    right: SPACING.xl,
    zIndex: 50,
    alignItems: 'center',
  },
  toastText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.text,
    backgroundColor: 'rgba(92,15,22,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(232,169,160,0.4)',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    overflow: 'hidden',
    ...SHADOWS.e2,
  },
});
