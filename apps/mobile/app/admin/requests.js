import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '../../services/api';
import { AdminShell, AnimatedCard, SectionTitle, adminColors, EmptyState } from '../../components/admin/AdminUI';

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
}

function buildRequestAnalytics(items) {
  const keyCounts = {};
  const keyValueCounts = {};
  for (const item of items) {
    const payload = item?.payload || {};
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null || String(value).trim() === '') return;
      keyCounts[key] = (keyCounts[key] || 0) + 1;
      const pair = `${key}: ${String(value).trim()}`;
      keyValueCounts[pair] = (keyValueCounts[pair] || 0) + 1;
    });
  }

  const topFields = Object.entries(keyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([field, count]) => ({ field, count }));

  const topRequests = Object.entries(keyValueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([item, count]) => ({ item, count }));

  return { topFields, topRequests };
}

export default function AdminRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  async function load() {
    try {
      setLoading(true);
      const response = await apiRequest('/admin/profile-edit-requests');
      setItems(Array.isArray(response) ? response : []);
    } catch (error) {
      Alert.alert('Requests', error.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pending = useMemo(
    () => items.filter((x) => String(x.status || '').toLowerCase() === 'pending'),
    [items]
  );
  const archived = useMemo(
    () => items.filter((x) => ['approved', 'declined'].includes(String(x.status || '').toLowerCase())),
    [items]
  );
  const analytics = useMemo(() => buildRequestAnalytics(archived), [archived]);

  return (
    <AdminShell title="Requests & Archive" subtitle="Review active requests and archive history to track what users request most.">
      <AnimatedCard delay={40}>
        <View style={styles.headerRow}>
          <SectionTitle>Request Center</SectionTitle>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/admin/edit-requests')}>
            <Text style={styles.actionBtnText}>Open Approval Queue</Text>
          </Pressable>
        </View>
        <View style={styles.metricRow}>
          <View style={styles.metricBox}>
            <Text style={[styles.metricValue, { color: '#2563eb' }]}>{pending.length}</Text>
            <Text style={styles.metricLabel}>Pending</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricValue, { color: '#0f766e' }]}>{archived.length}</Text>
            <Text style={styles.metricLabel}>Archived</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricValue, { color: '#7c3aed' }]}>{items.length}</Text>
            <Text style={styles.metricLabel}>Total</Text>
          </View>
        </View>
      </AnimatedCard>

      <AnimatedCard delay={80}>
        <SectionTitle>Most Requested Fields (Archive)</SectionTitle>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={adminColors.accent} />
            <Text style={styles.loadingText}>Loading archive insights...</Text>
          </View>
        ) : analytics.topFields.length ? (
          analytics.topFields.map((row) => (
            <View key={row.field} style={styles.line}>
              <Text style={styles.lineLabel}>{row.field}</Text>
              <Text style={styles.lineValue}>{row.count}</Text>
            </View>
          ))
        ) : (
          <EmptyState message="No archived requests yet." />
        )}
      </AnimatedCard>

      <AnimatedCard delay={120}>
        <SectionTitle>Most Repeated Request Values</SectionTitle>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : analytics.topRequests.length ? (
          analytics.topRequests.map((row) => (
            <View key={row.item} style={styles.line}>
              <Text style={styles.lineLabel} numberOfLines={1}>
                {row.item}
              </Text>
              <Text style={styles.lineValue}>{row.count}</Text>
            </View>
          ))
        ) : (
          <EmptyState message="No repeated value trends yet." />
        )}
      </AnimatedCard>

      <AnimatedCard delay={160}>
        <SectionTitle>Archive File</SectionTitle>
        {loading ? (
          <Text style={styles.loadingText}>Loading archived requests...</Text>
        ) : archived.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.archiveList}>
              {archived.slice(0, 200).map((item) => (
                <View key={String(item.id)} style={styles.archiveCard}>
                  <Text style={styles.archiveTitle}>{item.user?.fullName || 'Unknown user'}</Text>
                  <Text style={styles.archiveMeta}>
                    {item.status?.toUpperCase()} | {item.user?.role || '-'}
                  </Text>
                  <Text style={styles.archiveMeta}>{formatDate(item.createdAt)}</Text>
                  <Text style={styles.archiveReason} numberOfLines={2}>
                    {item.reviewReason || 'No review reason recorded.'}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <EmptyState message="Archive is empty." />
        )}
      </AnimatedCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionBtnText: {
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  metricValue: {
    fontWeight: '900',
    fontSize: 22,
  },
  metricLabel: {
    marginTop: 2,
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  loadingText: {
    color: adminColors.body,
    fontWeight: '600',
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9eef9',
    paddingVertical: 8,
    gap: 10,
  },
  lineLabel: {
    flex: 1,
    color: '#334155',
    fontWeight: '700',
  },
  lineValue: {
    color: '#1e293b',
    fontWeight: '900',
  },
  archiveList: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  archiveCard: {
    width: 260,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 10,
    gap: 4,
  },
  archiveTitle: {
    color: '#0f172a',
    fontWeight: '800',
  },
  archiveMeta: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  archiveReason: {
    color: '#334155',
    fontSize: 12,
  },
});
