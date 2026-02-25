import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert  } from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '../services/api';
import { confirmLogout } from '../services/logoutConfirm';
import { AuthContext } from './_layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

function typeColor(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('notice')) return '#2563eb';
  if (t.includes('message')) return '#0f766e';
  if (t.includes('profile')) return '#7c3aed';
  if (t.includes('attendance')) return '#dc2626';
  return '#475569';
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [markingAll, setMarkingAll] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/notifications?limit=80');
      setNotifications(Array.isArray(response?.notifications) ? response.notifications : []);
    } catch (error) {
      Alert.alert('Notifications', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function markOneAsRead(id) {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => (String(n._id) === String(id) ? { ...n, isRead: true } : n)));
    } catch (error) {
      Alert.alert('Notifications', error.message);
    }
  }

  async function markAllAsRead() {
    setMarkingAll(true);
    try {
      await apiRequest('/notifications/read-all', { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      Alert.alert('Notifications', error.message);
    } finally {
      setMarkingAll(false);
    }
  }

  function onLogout() {
    confirmLogout({
      title: 'Logout',
      message: 'Do you want to end your session?',
      webMessage: 'Do you want to end your session?',
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

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((item) => !item.isRead);
    return notifications.filter((item) => item.isRead);
  }, [filter, notifications]);

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(16, insets.top + 8), paddingBottom: Math.max(16, insets.bottom + 8) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.glowA} />
          <View style={styles.glowB} />
          <View style={styles.heroTop}>
            <Pressable style={styles.heroBtn} onPress={() => router.back()}>
              <Text style={styles.heroBtnText}>Back</Text>
            </Pressable>
            <View style={styles.heroActions}>
              <Pressable style={styles.heroBtn} onPress={markAllAsRead} disabled={markingAll}>
                <Text style={styles.heroBtnText}>{markingAll ? 'Marking...' : 'Read all'}</Text>
              </Pressable>
              <Pressable style={[styles.heroBtn, styles.logoutBtn]} onPress={onLogout} disabled={loggingOut}>
                <Text style={styles.heroBtnText}>{loggingOut ? 'Signing out...' : 'Logout'}</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.heroTitle}>Notifications</Text>
          <Text style={styles.heroSubtitle}>Stay updated with notices, profile requests, and class alerts.</Text>
          <View style={styles.heroStats}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{notifications.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{unreadCount}</Text>
              <Text style={styles.statLabel}>Unread</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'read', label: 'Read' },
          ].map((f) => (
            <Pressable key={f.id} style={[styles.filterChip, filter === f.id && styles.filterChipActive]} onPress={() => setFilter(f.id)}>
              <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.refreshChip} onPress={loadNotifications}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>All clear</Text>
            <Text style={styles.emptyBody}>No notifications in this view.</Text>
          </View>
        ) : (
          filtered.map((item) => {
            const accent = typeColor(item.type);
            return (
              <Pressable
                key={String(item._id)}
                style={[styles.card, !item.isRead && styles.cardUnread, { borderLeftColor: accent }]}
                onPress={() => !item.isRead && markOneAsRead(item._id)}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{item.title || 'Notification'}</Text>
                  <View style={[styles.typePill, { backgroundColor: `${accent}20` }]}>
                    <Text style={[styles.typeText, { color: accent }]}>{String(item.type || 'system').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.cardBody}>{item.body || ''}</Text>
                <View style={styles.cardBottom}>
                  <Text style={styles.cardMeta}>{formatDate(item.createdAt)}</Text>
                  {!item.isRead ? <Text style={styles.newBadge}>NEW</Text> : <Text style={styles.readBadge}>READ</Text>}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#edf2ff',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  hero: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#1e1b4b',
    borderWidth: 1,
    borderColor: '#3730a3',
    overflow: 'hidden',
  },
  glowA: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(37,99,235,0.26)',
    right: -35,
    top: -60,
  },
  glowB: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(16,185,129,0.2)',
    left: -24,
    bottom: -44,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.24)',
    borderColor: 'rgba(254,202,202,0.7)',
  },
  heroBtnText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 12,
  },
  heroTitle: {
    marginTop: 10,
    color: '#fff',
    fontWeight: '900',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  heroStats: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    minWidth: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statValue: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 22,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.86)',
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  filterText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 12,
  },
  filterTextActive: {
    color: '#fff',
  },
  refreshChip: {
    marginLeft: 'auto',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
  loadingWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#64748b',
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    backgroundColor: '#fff',
    padding: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 18,
  },
  emptyBody: {
    marginTop: 4,
    color: '#64748b',
    fontWeight: '600',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    borderLeftWidth: 5,
    backgroundColor: '#fff',
    padding: 12,
    gap: 7,
    shadowColor: '#1e293b',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardUnread: {
    backgroundColor: '#f8faff',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 16,
  },
  typePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  cardBody: {
    color: '#334155',
    fontWeight: '600',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  newBadge: {
    color: '#2563eb',
    fontWeight: '900',
    fontSize: 11,
  },
  readBadge: {
    color: '#94a3b8',
    fontWeight: '800',
    fontSize: 11,
  },
});
