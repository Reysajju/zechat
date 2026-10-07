/**
 * SettingsSheet — native app settings (makes it a real app, not just a page).
 * Bottom-sheet modal covering: about, theme, biometric lock, auth strategy,
 * zoom, remote config refresh, clear browsing data, and compliance notices.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTheme, LIGHT, DARK } from '../theme/ThemeProvider';
import { useRemoteConfig } from '../services/RemoteConfig';
import { useUi } from '../services/UiProvider';
import { DEEP_LINK_SCHEME } from '../constants';
import { strategyLabel } from '../services/AuthHandler';
import type { AuthStrategy } from '../types';

export function SettingsSheet({
  onClose,
  onClearData,
  authStrategyOverride,
  setAuthStrategyOverride,
  biometric,
}: {
  onClose: () => void;
  onClearData: () => void;
  authStrategyOverride: AuthStrategy | null;
  setAuthStrategyOverride: (s: AuthStrategy | null) => void;
  biometric: {
    enabled: boolean;
    setEnabled: (v: boolean) => Promise<void>;
    hardwareAvailable: boolean;
  };
}) {
  const { colors, mode, setMode, scheme } = useTheme();
  const { config, refresh, lastFetchedAt } = useRemoteConfig();
  const { toast } = useUi();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const effectiveStrategy = authStrategyOverride ?? config.authStrategy;

  const cycleTheme = () => setMode(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system');

  const doRefresh = async () => {
    setRefreshing(true);
    const ok = await refresh();
    setRefreshing(false);
    toast(ok ? 'Remote config refreshed' : 'No remote config URL configured');
  };

  const clearData = () => {
    Alert.alert(
      'Clear browsing data?',
      'Removes cached files. To fully sign out, log out of the site or reinstall — cookies are kept so your session survives restarts.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: onClearData },
      ],
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.scrim, { backgroundColor: 'rgba(0,0,0,0.45)' }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 12, borderColor: colors.border }]}>
        <View style={styles.grabber}>
          <View style={[styles.grabberBar, { backgroundColor: colors.border }]} />
        </View>
        <ScrollView style={styles.body} bounces={false}>
          <Text style={[styles.h, { color: colors.text }]}>Settings</Text>

          <Row label="Version" value={`${Constants.expoConfig?.version ?? '1.0.0'} (${Platform.OS})`} colors={colors} />
          <Row label="Hosted site" value="chat.z.ai" colors={colors} />
          <Row label="Auth strategy" value={strategyLabel(effectiveStrategy)} colors={colors} />
          <Row
            label="Remote config"
            value={lastFetchedAt ? new Date(lastFetchedAt).toLocaleString() : 'not configured'}
            colors={colors}
          />

          <Text style={[styles.section, { color: colors.subtext }]}>Appearance</Text>
          <ActionRow label={`Theme: ${mode}`} colors={colors} onPress={cycleTheme} />

          <Text style={[styles.section, { color: colors.subtext }]}>Security</Text>
          <View style={styles.rowWrap}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Biometric app lock</Text>
            <Switch
              value={biometric.enabled}
              disabled={!biometric.hardwareAvailable}
              onValueChange={(v) => void biometric.setEnabled(v)}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
          {!biometric.hardwareAvailable ? (
            <Text style={[styles.hint, { color: colors.subtext }]}>
              No biometrics enrolled on this device.
            </Text>
          ) : null}

          <Text style={[styles.section, { color: colors.subtext }]}>Sign-in</Text>
          {( ['modal', 'external', 'same'] as AuthStrategy[] ).map((s) => (
            <ActionRow
              key={s}
              label={`${strategyLabel(s)}${effectiveStrategy === s ? '  ✓' : ''}`}
              colors={colors}
              onPress={() => {
                setAuthStrategyOverride(s);
                toast(`Auth strategy: ${strategyLabel(s)}`);
              }}
            />
          ))}
          <Text style={[styles.hint, { color: colors.subtext }]}>
            The in-app window is the default. The system browser route is the most conservative
            for provider policies (see docs/DECISIONS.md).
          </Text>

          <Text style={[styles.section, { color: colors.subtext }]}>Advanced</Text>
          <ActionRow label="Refresh remote config" colors={colors} onPress={() => void doRefresh()} />
          <ActionRow label="Clear browsing data (cache)" colors={colors} onPress={clearData} />
          <ActionRow
            label="Open chat.z.ai in system browser"
            colors={colors}
            onPress={() => void Linking.openURL('https://chat.z.ai')}
          />
          <ActionRow
            label="Privacy policy"
            colors={colors}
            onPress={() => void Linking.openURL(`https://zedchat.app/privacy?src=${DEEP_LINK_SCHEME}`)}
          />

          <Text style={[styles.section, { color: colors.subtext }]}>About</Text>
          <Text style={[styles.about, { color: colors.subtext }]}>
            Zed Chat is an independent, unofficial mobile client that hosts the chat.z.ai web app
            in a native shell. Not affiliated with or endorsed by Z.ai. All model responses,
            branding and account services belong to their respective owners.
          </Text>
          <Text style={[styles.hint, { color: colors.subtext }]}>
            Current scheme: {scheme} · Tap the theme row to cycle System → Light → Dark.
          </Text>
          <Text style={[styles.paletteNote, { color: colors.subtext }]}>
            Palette: {JSON.stringify({ light: LIGHT.webBackground, dark: DARK.webBackground })}
          </Text>
        </ScrollView>
        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.accent }]} onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
      {refreshing ? <ActivityIndicator style={styles.spinner} color={colors.accent} /> : null}
    </Modal>
  );
}

function Row({ label, value, colors }: { label: string; value: string; colors: { text: string; subtext: string } }) {
  return (
    <View style={styles.rowWrap}>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.subtext }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ActionRow({ label, colors, onPress }: { label: string; colors: { text: string }; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(128,128,128,0.2)' }}
      style={(state: { pressed: boolean }) => [
        styles.rowWrap,
        styles.actionRow,
        state.pressed ? styles.rowPressed : null,
      ]}
    >
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
  },
  grabber: { alignItems: 'center', paddingTop: 10 },
  grabberBar: { width: 44, height: 4, borderRadius: 2 },
  body: { marginTop: 8 },
  h: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  section: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 4 },
  rowWrap: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  actionRow: { borderRadius: 10, paddingHorizontal: 6 },
  rowPressed: { backgroundColor: 'rgba(128,128,128,0.12)' },
  rowLabel: { fontSize: 15 },
  rowValue: { fontSize: 13, flexShrink: 1 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 6, marginBottom: 4 },
  about: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  paletteNote: { fontSize: 10, marginTop: 8 },
  closeBtn: { borderRadius: 12, alignItems: 'center', paddingVertical: 13, marginTop: 12, minHeight: 46 },
  closeText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  spinner: { position: 'absolute', bottom: 70, alignSelf: 'center' },
});
