/** Top-level crash boundary: captures to Sentry and offers a clean restart. */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureError } from '../services/Analytics';
import { useTheme } from '../theme/ThemeProvider';

interface State {
  error: Error | null;
}

export class CrashBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    captureError(error, { componentStack: info.componentStack ?? '' });
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return <CrashFallback onReset={() => this.setState({ error: null })} />;
  }
}

function CrashFallback({ onReset }: { onReset: () => void }) {
  const colors = {
    background: '#0B0F14',
    text: '#EDEFF2',
    subtext: '#9AA3AF',
    accent: '#60A5FA',
  };
  return (
    <View style={styles.root}>
      <Text style={[styles.title, { color: colors.text }]}>The app hit an unexpected error</Text>
      <Text style={[styles.body, { color: colors.subtext }]}>
        The issue was reported (if crash reporting is enabled). Restart the app to continue.
      </Text>
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={onReset}>
        <Text style={styles.buttonText}>Restart</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0B0F14' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 21, marginBottom: 18, textAlign: 'center' },
  button: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 40, minHeight: 44 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
