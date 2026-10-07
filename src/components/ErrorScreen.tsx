/** Error gate — WebView load failure / render process crash. */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

export function ErrorScreen({ detail, onRetry }: { detail?: string; onRetry: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>Something went wrong</Text>
        <Text style={[styles.body, { color: colors.subtext }]}>
          The page failed to load or the engine restarted. Your session is kept — tap retry to
          reload.
        </Text>
        {detail ? <Text style={[styles.detail, { color: colors.subtext }]}>{detail}</Text> : null}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading"
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { alignItems: 'center', maxWidth: 340 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 12 },
  detail: { fontSize: 12, marginBottom: 12, textAlign: 'center' },
  button: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 40, minHeight: 44 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
