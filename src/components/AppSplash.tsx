/** Splash shown while boot tasks run (theme hydrate, remote config race). */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function AppSplash() {
  const { colors } = useTheme();
  return <View style={[styles.root, { backgroundColor: colors.webBackground }]} />;
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const,
});
