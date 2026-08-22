// ============================================================
// جرب حظك — Avatar
// حرف على تدرّج مشتق من الاسم + حلقة ذهبية نابضة عند الدور
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Image, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AVATAR_OVERLAYS, AVATAR_PALETTES, COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { MicIcon, MicOffIcon } from '../icons/GameIcons';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  /** حلقة ذهبية ثابتة */
  showBorder?: boolean;
  /** دور اللاعب الآن — حلقة نابضة */
  isActive?: boolean;
  showMuteBadge?: boolean;
  isMuted?: boolean;
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export default function Avatar({
  uri,
  name = '',
  size = SIZES.avatarMd,
  showBorder = false,
  isActive = false,
  showMuteBadge = false,
  isMuted = false,
}: AvatarProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isActive]);

  const palette = AVATAR_PALETTES[hash(name || '?') % AVATAR_PALETTES.length];
  const initial = name ? name.trim().charAt(0).toUpperCase() : '؟';
  const ring = size * 0.055;
  const badge = Math.max(16, size * 0.34);

  return (
    <View style={{ width: size, height: size }}>
      {/* حلقة الدور النابضة */}
      {isActive && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: Math.max(2, ring),
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.15] }),
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.32] }) },
              ],
            },
          ]}
        />
      )}

      <View
        style={[
          styles.frame,
          { width: size, height: size, borderRadius: size / 2 },
          (showBorder || isActive) && {
            borderWidth: Math.max(1.5, ring),
            borderColor: isActive ? COLORS.gold : COLORS.hairlineGold,
          },
          isActive && SHADOWS.goldSoft,
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.fill} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={palette}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[styles.fill, styles.center]}
          >
            <Text
              style={[
                styles.initial,
                { fontSize: size * 0.42, lineHeight: size * 0.56 },
              ]}
            >
              {initial}
            </Text>
          </LinearGradient>
        )}
      </View>

      {showMuteBadge && (
        <View
          style={[
            styles.badge,
            {
              width: badge,
              height: badge,
              borderRadius: badge / 2,
              backgroundColor: isMuted ? AVATAR_OVERLAYS.muted : AVATAR_OVERLAYS.speaking,
              borderColor: isMuted ? COLORS.crimson : COLORS.emerald,
            },
          ]}
        >
          {isMuted ? (
            <MicOffIcon size={badge * 0.68} color={COLORS.crimson} />
          ) : (
            <MicIcon size={badge * 0.68} color={COLORS.emerald} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceRaised,
  },
  pulseRing: {
    position: 'absolute',
    borderColor: COLORS.gold,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: FONTS.ar.bold,
    color: COLORS.text,
    includeFontPadding: false,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
