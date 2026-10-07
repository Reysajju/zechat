/** Lock screen shown when the biometric app lock is enabled. */
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../theme/ThemeProvider';

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { colors } = useTheme();
  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().catch(() => {});
  }, []);
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.logo, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.z, { color: colors.accent }]}>Z</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Zed Chat is locked</Text>
      <Text style={[styles.body, { color: colors.subtext }]}>
        Authenticate to continue to your chats.
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={onUnlock}
        accessibilityRole="button"
        accessibilityLabel="Unlock with biometrics"
      >
        <Text style={styles.buttonText}>Unlock</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { width: 88, height: 88, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  z: { fontSize: 44, fontWeight: '800' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  body: { fontSize: 15, marginBottom: 22, textAlign: 'center' },
  button: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 46, minHeight: 44 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
