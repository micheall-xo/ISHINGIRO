import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../../services/api';
import { AdminShell, AnimatedCard, SectionTitle, StatTile, adminColors } from '../../components/admin/AdminUI';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await apiRequest('/admin/dashboard');
        setData(response);
      } catch (error) {
        console.error('Dashboard load error:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const topEndpoints = Array.isArray(data?.traffic?.topEndpoints) ? data.traffic.topEndpoints : [];

  return (
    <AdminShell title="System Dashboard" subtitle="Live operations snapshot for the whole school.">
      <AnimatedCard delay={50}>
        <SectionTitle>Core Metrics</SectionTitle>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={adminColors.accent} />
            <Text style={styles.loadingText}>Fetching analytics...</Text>
          </View>
        ) : (
          <>
            <View style={styles.row}>
              <StatTile label="Total Users" value={String(data?.users?.total || 0)} color="#4f46e5" />
              <StatTile label="Teachers" value={String(data?.users?.byRole?.teacher || 0)} color="#2563eb" />
            </View>
            <View style={styles.row}>
              <StatTile label="Parents" value={String(data?.users?.byRole?.parent || 0)} color="#0f766e" />
              <StatTile label="Students" value={String(data?.studentAssignments?.totalStudents || 0)} color="#7c3aed" />
            </View>
            <View style={styles.row}>
              <StatTile label="Requests (24h)" value={String(data?.traffic?.totalRequests || 0)} color="#0891b2" />
              <StatTile label="Unread Messages" value={String(data?.unreadMessageCount || 0)} color="#dc2626" />
            </View>
          </>
        )}
      </AnimatedCard>

      <AnimatedCard delay={120}>
        <SectionTitle>Top Endpoints</SectionTitle>
        {loading ? (
          <Text style={styles.muted}>Loading endpoint activity...</Text>
        ) : topEndpoints.length ? (
          topEndpoints.map((item, index) => (
            <View key={`${item.method}-${item.endpoint}-${index}`} style={styles.line}>
              <Text style={styles.label}>{item.method} {item.endpoint}</Text>
              <Text style={styles.value}>{item.count}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No traffic data yet.</Text>
        )}
      </AnimatedCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  loadingWrap: {
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  loadingText: {
    color: adminColors.body,
    fontWeight: '600',
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2fb',
    paddingVertical: 8,
  },
  label: {
    color: '#344054',
    flex: 1,
    marginRight: 8,
    fontWeight: '600',
  },
  value: {
    color: '#1e293b',
    fontWeight: '800',
  },
  muted: {
    color: adminColors.body,
  },
});
