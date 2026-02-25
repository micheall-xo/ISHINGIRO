import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '../../services/api';
import { AdminShell, AnimatedCard, SectionTitle, adminColors, EmptyState } from '../../components/admin/AdminUI';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function diffRows(payload = {}) {
  const rows = Object.entries(payload || {})
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .slice(0, 8);
  return rows;
}

export default function AdminEditRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [reasonById, setReasonById] = useState({});

  async function loadRequests() {
    try {
      setLoading(true);
      const list = await apiRequest('/admin/profile-edit-requests?status=pending');
      setRequests(Array.isArray(list) ? list : []);
    } catch (error) {
      Alert.alert('Edit requests', error.message || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const sorted = useMemo(
    () => [...requests].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [requests]
  );

  async function reviewRequest(requestId, action) {
    const reason = String(reasonById[requestId] || '').trim();
    if (action === 'decline' && !reason) {
      return Alert.alert('Reason required', 'Provide a reason before declining.');
    }

    try {
      setBusyId(requestId);
      await apiRequest(`/admin/profile-edit-requests/${requestId}/review`, {
        method: 'POST',
        body: { action, reviewReason: reason },
      });
      setRequests((prev) => prev.filter((item) => String(item.id) !== String(requestId)));
      Alert.alert('Success', `Request ${action}d`);
    } catch (error) {
      Alert.alert('Review failed', error.message || 'Failed to submit review');
    } finally {
      setBusyId('');
    }
  }

  return (
    <AdminShell title="Edit Requests" subtitle="Review and approve student profile updates in a dedicated moderation flow.">
      <AnimatedCard delay={40}>
        <View style={styles.headerRow}>
          <SectionTitle>Pending Requests</SectionTitle>
          <Pressable style={styles.backBtn} onPress={() => router.push('/admin/users')}>
            <Text style={styles.backBtnText}>Back to Users</Text>
          </Pressable>
        </View>
        <Text style={styles.helperText}>Requests shown here are waiting for admin decision.</Text>
      </AnimatedCard>

      <AnimatedCard delay={90}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={adminColors.accent} />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : sorted.length ? (
          <View style={styles.cardList}>
            {sorted.map((item) => {
              const previewRows = diffRows(item.payload);
              const isBusy = busyId === item.id;
              return (
                <View key={String(item.id)} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Pending</Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                  </View>

                  <Text style={styles.userName}>{item.user?.fullName || 'Unknown user'}</Text>
                  <Text style={styles.userMeta}>
                    {item.user?.role || '-'} | {item.user?.email || '-'}
                  </Text>

                  <View style={styles.previewBox}>
                    <Text style={styles.previewTitle}>Requested Changes</Text>
                    {previewRows.length ? (
                      previewRows.map(([key, value]) => (
                        <View key={`${item.id}-${key}`} style={styles.previewRow}>
                          <Text style={styles.previewKey}>{key}</Text>
                          <Text style={styles.previewValue} numberOfLines={2}>
                            {String(value)}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyPreview}>No fields submitted.</Text>
                    )}
                  </View>

                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Add reason (required for decline, optional for approve)"
                    value={reasonById[item.id] || ''}
                    onChangeText={(v) => setReasonById((prev) => ({ ...prev, [item.id]: v }))}
                    editable={!isBusy}
                  />

                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.actionBtn, styles.declineBtn, isBusy && styles.disabledBtn]}
                      onPress={() => reviewRequest(item.id, 'decline')}
                      disabled={isBusy}
                    >
                      <Text style={styles.actionText}>{isBusy ? 'Processing...' : 'Decline'}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, styles.approveBtn, isBusy && styles.disabledBtn]}
                      onPress={() => reviewRequest(item.id, 'approve')}
                      disabled={isBusy}
                    >
                      <Text style={styles.actionText}>{isBusy ? 'Processing...' : 'Approve'}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState message="No pending profile edit requests." />
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
  backBtn: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  backBtnText: {
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '700',
  },
  helperText: {
    marginTop: 6,
    color: '#5b6474',
    fontWeight: '600',
  },
  loadingWrap: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: adminColors.body,
    fontWeight: '600',
  },
  cardList: {
    gap: 10,
  },
  requestCard: {
    borderWidth: 1,
    borderColor: '#dbe4f3',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 8,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  badgeText: {
    color: '#92400e',
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  dateText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 12,
  },
  userName: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 16,
  },
  userMeta: {
    color: '#475569',
    fontWeight: '600',
  },
  previewBox: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    padding: 10,
    gap: 6,
  },
  previewTitle: {
    color: '#1e3a8a',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  previewKey: {
    color: '#334155',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  previewValue: {
    color: '#0f172a',
    flex: 1,
    textAlign: 'right',
  },
  emptyPreview: {
    color: '#64748b',
    fontStyle: 'italic',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#d2deed',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#fff',
    color: '#0f172a',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: '#2563eb',
  },
  declineBtn: {
    backgroundColor: '#ef4444',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  actionText: {
    color: '#fff',
    fontWeight: '800',
  },
});
