import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../../services/api';

function fmtMoney(value) {
  return Number(value || 0).toFixed(2);
}

export default function ManageKidsScreen() {
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [searching, setSearching] = useState(false);
  const [children, setChildren] = useState([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [manualStudentId, setManualStudentId] = useState('');
  const [topUpStudentId, setTopUpStudentId] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');

  async function loadChildren() {
    try {
      setLoading(true);
      const data = await apiRequest('/students/parent/children');
      const rows = Array.isArray(data) ? data : [];

      const pocket = await apiRequest('/pocket-money/parent-summary');
      const summary = Array.isArray(pocket) ? pocket : [];
      const balanceMap = new Map(summary.map((s) => [String(s.studentId), Number(s?.pocketMoney?.balance || 0)]));

      setChildren(
        rows.map((row) => ({
          ...row,
          fullName: `${row?.user?.firstName || ''} ${row?.user?.lastName || ''}`.trim() || 'Student',
          balance: balanceMap.get(String(row.studentId)) || 0,
        }))
      );
    } catch (error) {
      Alert.alert('Manage kids', error.message || 'Failed to load children.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChildren();
  }, []);

  const topUpTarget = useMemo(
    () => children.find((c) => String(c.studentId) === String(topUpStudentId)),
    [children, topUpStudentId]
  );

  async function onSearch() {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const data = await apiRequest(`/students/parent/search?q=${encodeURIComponent(query.trim())}`);
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert('Search failed', error.message || 'Could not search students.');
    } finally {
      setSearching(false);
    }
  }

  async function linkStudent(studentId) {
    try {
      setLinking(true);
      await apiRequest('/students/parent/link', {
        method: 'POST',
        body: { studentId },
      });
      Alert.alert('Success', 'Student linked to your account.');
      setManualStudentId('');
      setSearchResults([]);
      setQuery('');
      await loadChildren();
    } catch (error) {
      Alert.alert('Link failed', error.message || 'Could not link student.');
    } finally {
      setLinking(false);
    }
  }

  async function onManualLink() {
    const studentId = String(manualStudentId || '').trim();
    if (!studentId) return Alert.alert('Student ID required');
    await linkStudent(studentId);
  }

  async function onTopUp() {
    const amount = Number(topUpAmount);
    if (!topUpTarget?.studentId) return Alert.alert('Pick a child first.');
    if (!Number.isFinite(amount) || amount <= 0) return Alert.alert('Enter a valid amount.');
    try {
      await apiRequest('/pocket-money/topup', {
        method: 'POST',
        body: {
          studentId: topUpTarget.studentId,
          amount,
          description: 'Parent top-up from manage kids',
        },
      });
      setTopUpAmount('');
      Alert.alert('Success', `Added $${fmtMoney(amount)} to ${topUpTarget.fullName}`);
      await loadChildren();
    } catch (error) {
      Alert.alert('Top-up failed', error.message || 'Could not top up pocket money.');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Manage Kids</Text>
      <Text style={styles.subtitle}>Link children by student card ID or by searching their names.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add by Student ID (Card)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. ST001"
          value={manualStudentId}
          onChangeText={setManualStudentId}
          autoCapitalize="characters"
        />
        <Pressable style={[styles.button, linking && styles.disabled]} onPress={onManualLink} disabled={linking}>
          <Text style={styles.buttonText}>{linking ? 'Linking...' : 'Link Student'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Search by Name or Student ID</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.rowInput]}
            placeholder="Search student..."
            value={query}
            onChangeText={setQuery}
          />
          <Pressable style={[styles.searchBtn, searching && styles.disabled]} onPress={onSearch} disabled={searching}>
            <Text style={styles.searchText}>{searching ? '...' : 'Search'}</Text>
          </Pressable>
        </View>

        {searchResults.map((student) => (
          <View key={String(student.id)} style={styles.resultRow}>
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{student.fullName}</Text>
              <Text style={styles.resultMeta}>
                {student.studentId} • {student.className || '-'}
              </Text>
            </View>
            <Pressable
              style={[styles.resultAction, (student.hasParent && !student.isAssignedToMe) && styles.resultDisabled]}
              onPress={() => linkStudent(student.studentId)}
              disabled={student.hasParent && !student.isAssignedToMe}
            >
              <Text style={styles.resultActionText}>
                {student.isAssignedToMe ? 'Linked' : student.hasParent ? 'Unavailable' : 'Link'}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assigned Children</Text>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.muted}>Loading children...</Text>
          </View>
        ) : children.length ? (
          children.map((child) => (
            <Pressable
              key={String(child.id)}
              style={[styles.childRow, String(topUpStudentId) === String(child.studentId) && styles.childRowActive]}
              onPress={() => setTopUpStudentId(String(child.studentId))}
            >
              <View>
                <Text style={styles.childName}>{child.fullName}</Text>
                <Text style={styles.childMeta}>{child.studentId} • {child.grade}{child.section || ''}</Text>
              </View>
              <Text style={styles.balance}>${fmtMoney(child.balance)}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.muted}>No children linked yet.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top-up Child Pocket Money</Text>
        <Text style={styles.muted}>
          Selected: {topUpTarget ? `${topUpTarget.fullName} (${topUpTarget.studentId})` : 'None'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Amount"
          keyboardType="decimal-pad"
          value={topUpAmount}
          onChangeText={setTopUpAmount}
        />
        <Pressable style={styles.button} onPress={onTopUp}>
          <Text style={styles.buttonText}>Add Money</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#475569' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 10,
  },
  cardTitle: { fontWeight: '800', color: '#1e293b' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rowInput: { flex: 1 },
  searchBtn: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  searchText: { color: '#fff', fontWeight: '700' },
  resultRow: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultInfo: { flex: 1, marginRight: 8 },
  resultName: { fontWeight: '700', color: '#0f172a' },
  resultMeta: { color: '#64748b', marginTop: 2, fontSize: 12 },
  resultAction: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  resultDisabled: { backgroundColor: '#94a3b8' },
  resultActionText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  muted: { color: '#64748b' },
  childRow: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  childRowActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  childName: { color: '#0f172a', fontWeight: '700' },
  childMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  balance: { color: '#16a34a', fontWeight: '800' },
});
