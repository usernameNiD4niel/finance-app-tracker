import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from 'react-native-paper';
import type { AppTheme } from '../../theme';

export function GlassBackground() {
  const theme = useTheme<AppTheme>();
  const { bgGradientStart, bgGradientEnd, blob1, blob2, blob3 } = theme.custom;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[bgGradientStart, bgGradientEnd]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />
      {/* Top-right — large primary blob */}
      <View style={[styles.blob, styles.blobTopRight, { backgroundColor: blob1 }]} />
      {/* Middle-left — accent blob */}
      <View style={[styles.blob, styles.blobMidLeft, { backgroundColor: blob2 }]} />
      {/* Bottom-right — small cyan accent */}
      <View style={[styles.blob, styles.blobBottomRight, { backgroundColor: blob3 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.3,
  },
  blobTopRight: {
    width: 320,
    height: 320,
    top: -100,
    right: -80,
  },
  blobMidLeft: {
    width: 260,
    height: 260,
    top: '35%',
    left: -100,
  },
  blobBottomRight: {
    width: 180,
    height: 180,
    bottom: 80,
    right: -40,
  },
});
