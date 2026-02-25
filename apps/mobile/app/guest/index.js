import { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePageData } from '../../services/usePageData';
import { apiRequest } from '../../services/api';
import { confirmLogout } from '../../services/logoutConfirm';
import { AuthContext } from '../_layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_QUICK_ACCESS = [
  { id: 'manage-kids', title: 'Manage Kids', description: 'Link children by ID or name', icon: 'MK', color: '#2563eb', route: '/guest/manage-kids' },
  { id: 'calendar', title: 'Calendar', description: 'School events and dates', icon: 'CL', color: '#3b82f6', route: '/guest/calendar' },
  { id: 'messages', title: 'Messages', description: 'Talk with teachers', icon: 'MS', color: '#10b981', route: '/guest/messages' },
  { id: 'reports', title: 'Reports', description: 'Academic progress', icon: 'RP', color: '#f59e0b', route: '/guest/reports' },
  { id: 'dashboard', title: 'Dashboard', description: 'Parent dashboard', icon: 'DB', color: '#8b5cf6', route: '/guest/dashboard' },
  { id: 'profile', title: 'Profile', description: 'Update your details', icon: '👤', color: '#0f766e', route: '/guest/profile' },
];

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

export default function GuestGateway() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useContext(AuthContext);
  const { data, loading: pageLoading } = usePageData('guest-index');

  const [children, setChildren] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: true,
    smsAlerts: false,
    spendingAlerts: true,
  });

  const [topUpModal, setTopUpModal] = useState({
    visible: false,
    studentId: '',
    childName: '',
  });
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpDescription, setTopUpDescription] = useState('');
  const [toppingUp, setToppingUp] = useState(false);

  const crossGatewayFeatures = Array.isArray(data?.crossGatewayFeatures) ? data.crossGatewayFeatures : [];
  const quickAccess = useMemo(() => {
    if (Array.isArray(data?.quickAccess) && data.quickAccess.length) {
      return data.quickAccess
        .filter((item) => item && typeof item === 'object' && item.route)
        .map((item, index) => ({
          id: String(item.id || `qa-${index}`),
          title: String(item.title || 'Quick Link'),
          description: String(item.description || ''),
          icon: String(item.icon || '•'),
          color: String(item.color || '#3b82f6'),
          route: String(item.route),
        }));
    }
    return DEFAULT_QUICK_ACCESS;
  }, [data]);

  async function fetchParentSummary(withRefresh = false) {
    try {
      if (withRefresh) {
        setRefreshing(true);
      } else {
        setLoadingChildren(true);
      }

      const summary = await apiRequest('/pocket-money/parent-summary');
      const rows = Array.isArray(summary) ? summary : [];

      const mappedChildren = rows.map((student) => ({
        id: String(student.id || student.studentId || ''),
        studentId: String(student.studentId || ''),
        name: String(student.name || 'Student'),
        grade: `${student.grade || ''}${student.section || ''}`,
        pocketMoney: Number(student.pocketMoney?.balance || 0),
        totalTopUps: Number(student.pocketMoney?.totalTopUps || 0),
        totalSpent: Number(student.pocketMoney?.totalSpent || 0),
        recentTransactions: Array.isArray(student.pocketMoney?.recentTransactions)
          ? student.pocketMoney.recentTransactions.slice(0, 4).map((tx, index) => ({
              id: String(tx._id || `${student.studentId}-${index}`),
              amount: tx.type === 'spent' ? -Math.abs(Number(tx.amount || 0)) : Math.abs(Number(tx.amount || 0)),
              description: String(tx.description || tx.type || 'Transaction'),
              date: tx.date ? new Date(tx.date).toISOString().slice(0, 10) : '-',
            }))
          : [],
      }));

      setChildren(mappedChildren);
    } catch (error) {
      console.error('Failed to fetch parent summary:', error);
      Alert.alert('Load failed', error.message || 'Could not load your children data.');
    } finally {
      setLoadingChildren(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchParentSummary();
    const interval = setInterval(() => fetchParentSummary(true), 30000);
    return () => clearInterval(interval);
  }, []);

  function handleFeaturePress(feature) {
    if (!feature?.route) return;
    router.push(feature.route);
  }

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

  function openTopUp(child) {
    setTopUpAmount('');
    setTopUpDescription('');
    setTopUpModal({
      visible: true,
      studentId: String(child.studentId || ''),
      childName: String(child.name || 'Student'),
    });
  }

  async function submitTopUp() {
    const amount = Number(topUpAmount);
    if (!topUpModal.studentId) {
      return Alert.alert('Error', 'No child selected.');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
    }

    setToppingUp(true);
    try {
      await apiRequest('/pocket-money/topup', {
        method: 'POST',
        body: {
          studentId: topUpModal.studentId,
          amount,
          description: topUpDescription.trim() || 'Parent top-up',
        },
      });
      setTopUpModal({ visible: false, studentId: '', childName: '' });
      setTopUpAmount('');
      setTopUpDescription('');
      await fetchParentSummary(true);
      Alert.alert('Success', `Added $${formatMoney(amount)} to ${topUpModal.childName}'s card.`);
    } catch (error) {
      Alert.alert('Top-up failed', error.message || 'Please try again.');
    } finally {
      setToppingUp(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 12) }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor="#8b5cf6" />

      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <View style={[styles.headerContent, { paddingTop: Math.max(56, insets.top + 16) }]}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>👨‍👩‍👧‍👦 Parents</Text>
            <Text style={styles.headerSubtitle}>Data synced from school system</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={() => router.push('/notifications')}>
              <Text style={styles.iconButtonText}>🔔</Text>
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => setShowSettingsModal(true)}>
              <Text style={styles.iconButtonText}>⚙️</Text>
            </Pressable>
            <Pressable style={styles.iconButton} onPress={handleLogout}>
              <Text style={styles.iconButtonText}>🚪</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {!!crossGatewayFeatures.length && (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Gateway Connections</Text>
          <View style={styles.featureGrid}>
            {crossGatewayFeatures.map((feature, index) => (
              <Pressable
                key={`cg-${index}`}
                style={styles.featureCard}
                onPress={() => {
                  if (feature?.route) {
                    router.push(String(feature.route));
                    return;
                  }
                  if (feature?.title) Alert.alert(feature.title, feature.description || 'No action configured.');
                }}
              >
                <Text style={styles.featureIcon}>{String(feature?.icon || '🔗')}</Text>
                <Text style={styles.featureTitle}>{String(feature?.title || 'Feature')}</Text>
                <Text style={styles.featureDescription}>{String(feature?.description || '')}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.featureGrid}>
          {quickAccess.map((feature) => (
            <Pressable key={feature.id} style={styles.featureCard} onPress={() => handleFeaturePress(feature)}>
              <View style={[styles.featureIconContainer, { backgroundColor: `${feature.color}20` }]}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Children</Text>
          <View style={styles.sectionActions}>
            <Pressable style={styles.manageButton} onPress={() => router.push('/guest/manage-kids')}>
              <Text style={styles.manageButtonText}>Manage Kids</Text>
            </Pressable>
            <Pressable style={styles.refreshButton} onPress={() => fetchParentSummary(true)} disabled={refreshing}>
              <Text style={styles.refreshButtonText}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text>
            </Pressable>
          </View>
        </View>

        {loadingChildren ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#8b5cf6" />
            <Text style={styles.loadingText}>Loading children data from database...</Text>
          </View>
        ) : children.length ? (
          children.map((child) => (
            <View key={child.id} style={styles.childCard}>
              <View style={styles.childHeader}>
                <View style={styles.childInfo}>
                  <Text style={styles.childAvatar}>ST</Text>
                  <View>
                    <Text style={styles.childName}>{child.name}</Text>
                    <Text style={styles.childMeta}>
                      {child.grade || 'Class -'} | ID: {child.studentId || '-'}
                    </Text>
                  </View>
                </View>
                <Pressable style={styles.viewButton} onPress={() => router.push(`/guest/child/${child.studentId}`)}>
                  <Text style={styles.viewButtonText}>👁️ View</Text>
                </Pressable>
              </View>

              <View style={styles.moneyRow}>
                <View style={styles.moneyTile}>
                  <Text style={styles.moneyLabel}>Balance</Text>
                  <Text style={styles.moneyValue}>${formatMoney(child.pocketMoney)}</Text>
                </View>
                <View style={styles.moneyTile}>
                  <Text style={styles.moneyLabel}>Top-ups</Text>
                  <Text style={[styles.moneyValue, styles.positive]}>${formatMoney(child.totalTopUps)}</Text>
                </View>
                <View style={styles.moneyTile}>
                  <Text style={styles.moneyLabel}>Spent</Text>
                  <Text style={[styles.moneyValue, styles.negative]}>${formatMoney(child.totalSpent)}</Text>
                </View>
              </View>

              <View style={styles.transactionsWrap}>
                <Text style={styles.transactionsTitle}>Recent Transactions</Text>
                {child.recentTransactions.length ? (
                  child.recentTransactions.map((tx) => (
                    <View key={tx.id} style={styles.transactionItem}>
                      <Text style={styles.transactionDescription}>{tx.description}</Text>
                      <Text style={[styles.transactionAmount, tx.amount >= 0 ? styles.positive : styles.negative]}>
                        {tx.amount >= 0 ? '+' : ''}${formatMoney(Math.abs(tx.amount))}
                      </Text>
                      <Text style={styles.transactionDate}>{tx.date}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noTransactions}>No transactions yet.</Text>
                )}
              </View>

              <View style={styles.childActions}>
                <Pressable style={styles.topUpButton} onPress={() => openTopUp(child)}>
                  <Text style={styles.topUpButtonText}>💰 Add Money</Text>
                </Pressable>
                <Pressable style={styles.messageButton} onPress={() => router.push('/guest/messages')}>
                  <Text style={styles.messageButtonText}>💬 Message</Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No linked students found.</Text>
            <Text style={styles.emptyText}>Ask admin to assign your parent account to your child profile.</Text>
          </View>
        )}
      </View>

      <Modal visible={topUpModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Pocket Money</Text>
            <Text style={styles.modalSubtitle}>Child: {topUpModal.childName || '-'}</Text>

            <TextInput
              style={styles.input}
              placeholder="Amount (e.g. 25)"
              keyboardType="decimal-pad"
              value={topUpAmount}
              onChangeText={setTopUpAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={topUpDescription}
              onChangeText={setTopUpDescription}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                disabled={toppingUp}
                onPress={() => setTopUpModal({ visible: false, studentId: '', childName: '' })}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.saveButton]} disabled={toppingUp} onPress={submitTopUp}>
                <Text style={styles.saveButtonText}>{toppingUp ? 'Adding...' : 'Add Money'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Notification Settings</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Switch value={settings.notifications} onValueChange={(value) => setSettings((prev) => ({ ...prev, notifications: value }))} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Email Updates</Text>
              <Switch value={settings.emailUpdates} onValueChange={(value) => setSettings((prev) => ({ ...prev, emailUpdates: value }))} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>SMS Alerts</Text>
              <Switch value={settings.smsAlerts} onValueChange={(value) => setSettings((prev) => ({ ...prev, smsAlerts: value }))} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Spending Alerts</Text>
              <Switch value={settings.spendingAlerts} onValueChange={(value) => setSettings((prev) => ({ ...prev, spendingAlerts: value }))} />
            </View>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowSettingsModal(false)}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {!pageLoading && <View style={styles.bottomSpacing} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    position: 'relative',
    height: 210,
    marginBottom: 20,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 56,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  iconButtonText: {
    fontSize: 18,
  },
  sectionWrap: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  manageButton: {
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  manageButtonText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1e293b',
  },
  refreshButton: {
    backgroundColor: '#e9d5ff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  refreshButtonText: {
    color: '#6d28d9',
    fontWeight: '700',
    fontSize: 12,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  featureCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef2ff',
  },
  featureIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    fontSize: 18,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 11,
    color: '#64748b',
  },
  loadingBox: {
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  loadingText: {
    color: '#475569',
    fontWeight: '600',
  },
  childCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eef2ff',
  },
  childHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  childInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  childAvatar: {
    fontSize: 16,
    fontWeight: '800',
    color: '#312e81',
    width: 38,
    height: 38,
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: 19,
    backgroundColor: '#e0e7ff',
    marginRight: 10,
    overflow: 'hidden',
  },
  childName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  childMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  viewButton: {
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  viewButtonText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
  moneyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  moneyTile: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
  },
  moneyLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '600',
  },
  moneyValue: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '800',
  },
  positive: {
    color: '#16a34a',
  },
  negative: {
    color: '#dc2626',
  },
  transactionsWrap: {
    marginBottom: 10,
  },
  transactionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  transactionDescription: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
  },
  transactionAmount: {
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  transactionDate: {
    fontSize: 11,
    color: '#64748b',
  },
  noTransactions: {
    fontSize: 12,
    color: '#94a3b8',
  },
  childActions: {
    flexDirection: 'row',
    gap: 8,
  },
  topUpButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  topUpButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  messageButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eef2ff',
    padding: 16,
  },
  emptyTitle: {
    color: '#334155',
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    color: '#1e293b',
    fontWeight: '800',
    fontSize: 20,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: '#1e293b',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 11,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  cancelButtonText: {
    color: '#475569',
    fontWeight: '700',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLabel: {
    color: '#1e293b',
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 24,
  },
});
