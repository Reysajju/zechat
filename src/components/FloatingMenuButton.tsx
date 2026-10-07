/**
 * FloatingMenuButton — the small draggable native affordance that opens app
 * Settings (theme, biometric lock, auth strategy, clear data, remote config).
 * Subtle by design: semi-transparent dot, hides while the keyboard is open,
 * can be disabled via remote config or by dragging it anywhere.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, PanResponder, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KEYS, loadJson, saveJson } from '../utils/storage';

interface Pos {
  x: number;
  y: number;
}

const SIZE = 40;

export function FloatingMenuButton({
  onPress,
  hidden,
}: {
  onPress: () => void;
  hidden: boolean;
}) {
  const insets = useSafeAreaInsets();
  const screen = Dimensions.get('window');
  const initial = useRef<Pos>({ x: screen.width - 56, y: screen.height - 220 });
  const [pos, setPos] = useState<Pos>(initial.current);
  const dragOrigin = useRef<Pos>(initial.current);
  const moved = useRef(false);

  useEffect(() => {
    loadJson<Pos>(KEYS.floatingMenuPos).then((p) => {
      if (p && typeof p.x === 'number' && typeof p.y === 'number') {
        setPos(p);
        initial.current = p;
      }
    });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        moved.current = false;
        dragOrigin.current = pos;
      },
      onPanResponderMove: (_e, g) => {
        moved.current = moved.current || Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6;
        setPos(clamp({ x: dragOrigin.current.x + g.dx, y: dragOrigin.current.y + g.dy }, screen, insets));
      },
      onPanResponderRelease: () => {
        const final = clamp(pos, screen, insets);
        setPos(final);
        void saveJson(KEYS.floatingMenuPos, final);
        if (!moved.current) onPress();
      },
    }),
  ).current;

  if (hidden) return null;

  return (
    <View
      pointerEvents="auto"
      {...panResponder.panHandlers}
      style={[styles.dot, { transform: [{ translateX: pos.x }, { translateY: pos.y }] }]}
    >
      <Text style={styles.gear}>⋯</Text>
    </View>
  );
}

function clamp(p: Pos, screen: { width: number; height: number }, insets: { top: number; bottom: number }): Pos {
  return {
    x: Math.min(Math.max(p.x, 8), screen.width - SIZE - 8),
    y: Math.min(Math.max(p.y, insets.top + 8), screen.height - insets.bottom - SIZE - 8),
  };
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: 'rgba(90,100,115,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
    elevation: 6,
  },
  gear: { color: '#fff', fontSize: 20, lineHeight: 24, opacity: 0.9 },
});
