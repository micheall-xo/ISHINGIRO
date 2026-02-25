import { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { confirmLogout } from '../../services/logoutConfirm';
import { AuthContext } from '../../app/_layout';

export const adminColors = {
  pageBg: '#edf2ff',
  hero: '#1e1b4b',
  heroDark: '#312e81',
  surface: '#ffffff',
  border: '#d5def5',
  title: '#0f172a',
  body: '#475569',
  accent: '#2563eb',
  success: '#10b981',
};

export function AdminShell({ title, subtitle, children }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useContext(AuthContext);
  const [loggingOut, setLoggingOut] = useState(false);

  function onLogout() {
    confirmLogout({
      title: 'Logout',
      message: 'End this admin session?',
      webMessage: 'End this admin session?',
      onConfirm: async () => {
        setLoggingOut(true);
        try {
          await signOut();
          router.replace('/choose');
        } finally {
          setLoggingOut(false);
        }
      },
    });
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(14, insets.top + 8), paddingBottom: Math.max(24, insets.bottom + 12) }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroWrap, { paddingTop: Math.max(18, insets.top + 6) }]}>
        <View style={styles.heroGlowA} />
        <View style={styles.heroGlowB} />
        <View style={styles.heroGlowC} />
        <View style={styles.heroTopBar}>
          <Pressable style={styles.heroActionBtn} onPress={() => router.push('/notifications')}>
            <Text style={styles.heroActionText}>Notifications</Text>
          </Pressable>
          <Pressable style={[styles.heroActionBtn, styles.heroLogoutBtn]} onPress={onLogout} disabled={loggingOut}>
            <Text style={styles.heroActionText}>{loggingOut ? 'Signing out...' : 'Logout'}</Text>
          </Pressable>
        </View>
        <Text style={styles.heroTitle}>{title}</Text>
        {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

export function AnimatedCard({ children, style, delay = 0 }) {
  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 320,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [delay, fade, translate]);

  return (
    <Animated.View style={[styles.card, style, { opacity: fade, transform: [{ translateY: translate }] }]}>
      {children}
    </Animated.View>
  );
}

export function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function StatTile({ label, value, color = adminColors.title }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function LoadingButton({ label, busyLabel, loading, onPress, disabled, color = adminColors.accent }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!loading) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.97,
          duration: 450,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [loading, pulse]);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <Pressable
        style={[styles.button, { backgroundColor: color }, (disabled || loading) && styles.buttonDisabled]}
        onPress={onPress}
        disabled={disabled || loading}
      >
        {loading ? (
          <View style={styles.buttonRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.buttonText}>{busyLabel || 'Processing...'}</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function EmptyState({ message }) {
  return <Text style={styles.empty}>{message}</Text>;
}

export const adminFieldStyles = StyleSheet.create({
  label: {
    color: '#334155',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: adminColors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    color: adminColors.title,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#c9d4ea',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#667eea',
  },
  chipText: {
    color: '#46526a',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#3f4eb8',
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: adminColors.pageBg,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  heroWrap: {
    backgroundColor: adminColors.hero,
    borderRadius: 26,
    padding: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3730a3',
  },
  heroGlowA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(59,130,246,0.25)',
    right: -36,
    top: -70,
  },
  heroGlowB: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(168,85,247,0.24)',
    left: -22,
    bottom: -50,
  },
  heroGlowC: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16,185,129,0.2)',
    right: 76,
    bottom: -80,
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  heroActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  heroLogoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.22)',
    borderColor: 'rgba(254,202,202,0.6)',
  },
  heroActionText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 12,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    lineHeight: 20,
    fontWeight: '600',
  },
  card: {
    backgroundColor: adminColors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: adminColors.border,
    padding: 15,
    gap: 11,
    shadowColor: '#1e293b',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: adminColors.title,
    letterSpacing: -0.2,
  },
  metric: {
    flex: 1,
    backgroundColor: '#f5f8ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d7e1f5',
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  metricLabel: {
    color: adminColors.body,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },
  button: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  empty: {
    color: adminColors.body,
  },
});
