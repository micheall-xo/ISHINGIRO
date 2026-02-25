import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View  } from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '../../services/api';
import { usePageData } from '../../services/usePageData';
import { confirmLogout } from '../../services/logoutConfirm';
import { AuthContext } from '../_layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function toMoney(value) {
  return Number(value || 0).toFixed(2);
}

function toDateLabel(value) {
  if (!value) return '-';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function GuestDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useContext(AuthContext);
  const { data } = usePageData('guest-dashboard');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState([]);

  async function load(withRefresh = false) {
    try {
      if (withRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const rows = await apiRequest('/pocket-money/parent-summary');
      setSummary(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error('Guest dashboard load failed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 45000);
    return () => clearInterval(timer);
  }, []);

  const computed = useMemo(() => {
    const totalChildren = summary.length;
    const totalBalance = summary.reduce((acc, item) => acc + Number(item?.pocketMoney?.balance || 0), 0);
    const totalTopUps = summary.reduce((acc, item) => acc + Number(item?.pocketMoney?.totalTopUps || 0), 0);
    const totalSpent = summary.reduce((acc, item) => acc + Number(item?.pocketMoney?.totalSpent || 0), 0);
    const lowBalanceChildren = summary
      .filter((item) => Number(item?.pocketMoney?.balance || 0) < 15)
      .map((item) => item?.name)
      .filter(Boolean);

    const recentTransactions = summary
      .flatMap((student) =>
        (student?.pocketMoney?.recentTransactions || []).map((tx) => ({
          id: String(tx?._id || `${student?.studentId}-${tx?.date}`),
          studentName: student?.name || 'Student',
          date: tx?.date,
          description: tx?.description || tx?.type || 'Transaction',
          amount: tx?.type === 'spent' ? -Math.abs(Number(tx?.amount || 0)) : Math.abs(Number(tx?.amount || 0)),
        }))
      )
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 6);

    return {
      totalChildren,
      totalBalance,
      totalTopUps,
      totalSpent,
      lowBalanceChildren,
      recentTransactions,
    };
  }, [summary]);

  const events = Array.isArray(data?.upcomingEvents) ? data.upcomingEvents : [];
  const alertsFromDb = Array.isArray(data?.recentAlerts) ? data.recentAlerts : [];

  const finalAlerts = alertsFromDb.length
    ? alertsFromDb
    : computed.lowBalanceChildren.map((name) => ({
        type: 'low_balance',
        priority: 'medium',
        message: `${name} has low pocket money balance`,
      }));

  const quickActions = [
    { id: 'children', title: 'Manage Kids', icon: '👨‍👩‍👧‍👦', route: '/guest/manage-kids' },
    { id: 'messages', title: 'Messages', icon: '💬', route: '/guest/messages' },
    { id: 'calendar', title: 'Calendar', icon: '📅', route: '/guest/calendar' },
    { id: 'reports', title: 'Reports', icon: '📊', route: '/guest/reports' },
  ];

  function handleLogout() {
    confirmLogout({
      title: 'Logout',
      message: 'Do you want to end your session?',
      webMessage: 'Do you want to end your session?',
      onConfirm: async () => {
        await signOut();
        router.replace('/choose');
      },
    });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Math.max(20, insets.bottom + 10) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />

      <View style={[styles.hero, { paddingTop: Math.max(20, insets.top + 8) }]}>
        <View style={styles.heroBg1} />
        <View style={styles.heroBg2} />
        <View style={[styles.heroActions, { top: Math.max(12, insets.top + 4) }]}>
          <Pressable style={styles.heroActionBtn} onPress={() => router.push('/notifications')}>
            <Text style={styles.heroActionText}>🔔</Text>
          </Pressable>
          <Pressable style={styles.heroActionBtn} onPress={handleLogout}>
            <Text style={styles.heroActionText}>🚪</Text>
          </Pressable>
        </View>
        <Text style={styles.heroTitle}>Parent Dashboard</Text>
        <Text style={styles.heroSub}>Live family overview from your school database</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <>
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, styles.metricCardPrimary]}>
              <Text style={styles.metricLabel}>Children</Text>
              <Text style={styles.metricValue}>{computed.totalChildren}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Balance</Text>
              <Text style={styles.metricValue}>${toMoney(computed.totalBalance)}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Top-ups</Text>
              <Text style={[styles.metricValue, { color: '#16a34a' }]}>${toMoney(computed.totalTopUps)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Spent</Text>
              <Text style={[styles.metricValue, { color: '#dc2626' }]}>${toMoney(computed.totalSpent)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            {finalAlerts.length ? (
              finalAlerts.slice(0, 5).map((alert, index) => (
                <View key={`${alert.type}-${index}`} style={styles.alertCard}>
                  <Text style={styles.alertIcon}>{alert.type === 'low_balance' ? '💰' : '🔔'}</Text>
                  <View style={styles.alertBody}>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    <Text style={styles.alertPriority}>
                      {String(alert.priority || 'info').toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No alerts right now.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {computed.recentTransactions.length ? (
              computed.recentTransactions.map((tx) => (
                <View key={tx.id} style={styles.txCard}>
                  <View style={styles.txLeft}>
                    <Text style={styles.txTitle}>{tx.studentName}</Text>
                    <Text style={styles.txSubtitle}>{tx.description}</Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={[styles.txAmount, tx.amount >= 0 ? styles.plus : styles.minus]}>
                      {tx.amount >= 0 ? '+' : '-'}${toMoney(Math.abs(tx.amount))}
                    </Text>
                    <Text style={styles.txDate}>{toDateLabel(tx.date)}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No transactions yet.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            {events.length ? (
              events.slice(0, 5).map((event, index) => (
                <View key={`event-${index}`} style={styles.eventCard}>
                  <Text style={styles.eventDate}>{toDateLabel(event?.date)}</Text>
                  <View style={styles.eventBody}>
                    <Text style={styles.eventTitle}>{String(event?.event || 'School Event')}</Text>
                    <Text style={styles.eventMeta}>{String(event?.child || 'All students')}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No upcoming events configured.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {quickActions.map((item) => (
                <Pressable key={item.id} style={styles.actionCard} onPress={() => router.push(item.route)}>
                  <Text style={styles.actionIcon}>{item.icon}</Text>
                  <Text style={styles.actionTitle}>{item.title}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7ff',
  },
  hero: {
    margin: 16,
    marginTop: 14,
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#4f46e5',
    overflow: 'hidden',
  },
  heroBg1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -40,
    right: -60,
  },
  heroBg2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
    bottom: -50,
    left: -30,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '900',
  },
  heroActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  heroActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroActionText: {
    fontSize: 16,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.92)',
    marginTop: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingWrap: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#475569',
    fontWeight: '600',
  },
  metricsRow: {
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e7ecff',
    padding: 14,
  },
  metricCardPrimary: {
    backgroundColor: '#eef2ff',
    borderColor: '#d7ddff',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    color: '#1f2937',
    fontSize: 24,
    fontWeight: '900',
  },
  section: {
    marginTop: 10,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e7ecff',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#1e293b',
    fontWeight: '800',
    marginBottom: 10,
  },
  alertCard: {
    borderRadius: 12,
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#e8eeff',
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 10,
  },
  alertIcon: {
    fontSize: 18,
  },
  alertBody: {
    flex: 1,
  },
  alertMessage: {
    color: '#334155',
    fontWeight: '600',
    marginBottom: 2,
  },
  alertPriority: {
    color: '#7c3aed',
    fontSize: 11,
    fontWeight: '800',
  },
  txCard: {
    borderRadius: 12,
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#e8eeff',
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txLeft: {
    flex: 1,
    marginRight: 8,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txTitle: {
    color: '#1e293b',
    fontWeight: '700',
  },
  txSubtitle: {
    color: '#64748b',
    marginTop: 2,
    fontSize: 12,
  },
  txAmount: {
    fontWeight: '800',
    fontSize: 13,
  },
  plus: {
    color: '#16a34a',
  },
  minus: {
    color: '#dc2626',
  },
  txDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  eventCard: {
    borderRadius: 12,
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#e8eeff',
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventDate: {
    minWidth: 62,
    textAlign: 'center',
    color: '#4f46e5',
    fontWeight: '800',
    fontSize: 12,
  },
  eventBody: {
    flex: 1,
  },
  eventTitle: {
    color: '#1e293b',
    fontWeight: '700',
  },
  eventMeta: {
    color: '#64748b',
    marginTop: 2,
    fontSize: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionCard: {
    width: '48%',
    borderRadius: 12,
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#e8eeff',
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  actionTitle: {
    color: '#1e293b',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  bottomPad: {
    height: 20,
  },
});
