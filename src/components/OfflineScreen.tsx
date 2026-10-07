/** Offline gate — shown when the network drops before/without a loaded page. */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

export function OfflineScreen({ retrying }: { retrying: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>You're offline</Text>
        <Text style={[styles.body, { color: colors.subtext }]}>
          Zed Chat needs a connection to reach the AI service. Check Wi-Fi or mobile data —
          we'll reconnect automatically and keep your session.
        </Text>
        {retrying ? (
          <View style={styles.row}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.retry, { color: colors.accent }]}> Reconnecting…</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { alignItems: 'center', maxWidth: 320 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  retry: { fontSize: 14 },
});
