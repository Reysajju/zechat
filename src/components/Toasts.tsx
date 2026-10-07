/** Minimal toast host driven by UiProvider.toast(). */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUi } from '../services/UiProvider';
import { useTheme } from '../theme/ThemeProvider';

export function ToastHost() {
  const { lastToast, toastSeq } = useUi();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!lastToast) {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [toastSeq, lastToast, opacity]);

  if (!lastToast) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { backgroundColor: colors.card, borderColor: colors.border, opacity, bottom: insets.bottom + 72 },
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>
        {lastToast}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '82%',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 120,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  text: { fontSize: 14 },
});
