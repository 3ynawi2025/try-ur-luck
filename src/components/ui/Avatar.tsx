// ============================================================
// جرب حظك — Avatar
// صورة دائرية مع إمكانية حافة ذهبية وbadge
// ============================================================

import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '../../constants/theme';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  showBorder?: boolean;
  isActive?: boolean;
  showMuteBadge?: boolean;
  isMuted?: boolean;
}

const DEFAULT_AVATARS = [
  '🦁', '🦊', '🐯', '🐺', '🦅', '🐉', '🦚', '🐆',
];

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function getFallbackEmoji(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return DEFAULT_AVATARS[Math.abs(hash) % DEFAULT_AVATARS.length];
}

export default function Avatar({
  uri,
  name,
  size = SIZES.avatarMd,
  showBorder = false,
  isActive = false,
  showMuteBadge = false,
  isMuted = false,
}: AvatarProps) {
  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          showBorder && styles.border,
          isActive && styles.activeBorder,
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          />
        ) : (
          <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[styles.fallbackText, { fontSize: size * 0.45, color: COLORS.textPrimary }]}>
              {name ? getInitial(name) : '؟'}
            </Text>
          </View>
        )}
      </View>

      {showMuteBadge && (
        <View style={[styles.badge, isMuted ? styles.mutedBadge : styles.unmutedBadge]}>
          <Text style={styles.badgeText}>{isMuted ? '🔇' : '🎤'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  container: {
    overflow: 'hidden',
  },
  border: {
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  activeBorder: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    backgroundColor: COLORS.bgSurfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
  },
  fallbackText: {
    textAlign: 'center',
    fontFamily: FONTS.arabic.bold,
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.bgPrimary,
  },
  mutedBadge: {
    backgroundColor: COLORS.danger,
  },
  unmutedBadge: {
    backgroundColor: COLORS.success,
  },
  badgeText: {
    fontSize: 10,
  },
});
