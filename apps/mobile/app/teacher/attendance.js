import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiRequest } from '../../services/api';

const STATUS_OPTIONS = ['present', 'late', 'absent', 'excused'];

export default function TeacherAttendance() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [notifying, setNotifying] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [dateValue, setDateValue] = useState(new Date().toISOString().slice(0, 10));
  const [payload, setPayload] = useState({ students: [], classes: [], summary: {} });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set('search', search.trim());
      if (selectedClass.trim()) query.set('className', selectedClass.trim());
      if (dateValue.trim()) query.set('date', dateValue.trim());
      const response = await apiRequest(`/attendance/teacher/records?${query.toString()}`);
      setPayload({
        students: Array.isArray(response?.students) ? response.students : [],
        classes: Array.isArray(response?.classes) ? response.classes : [],
        summary: response?.summary || {},
      });
      if (!selectedClass && Array.isArray(response?.classes) && response.classes.length) {
        setSelectedClass(response.classes[0]);
      }
    } catch (error) {
      Alert.alert('Attendance', error.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [search, selectedClass, dateValue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rows = useMemo(() => payload.students || [], [payload.students]);

  const markStudent = async (row, status) => {
    setSavingId(`${row.id}:${status}`);
    try {
      const result = await apiRequest('/attendance', 'POST', {
        studentId: row.studentId,
        status,
        date: dateValue,
      });
      if (result?.autoNotifiedParent) {
        Alert.alert('Attendance', 'Student marked absent and parent was notified.');
      }
      await loadData();
    } catch (error) {
      Alert.alert('Attendance', error.message || 'Failed to save attendance');
    } finally {
      setSavingId('');
    }
  };

  const notifyAbsentParents = async () => {
    setNotifying(true);
    try {
      const response = await apiRequest('/attendance/notify-absent-parents', 'POST', {
        className: selectedClass || undefined,
        date: dateValue,
      });
      Alert.alert('Parent notification', `Sent ${response?.sent || 0} parent notifications.`);
    } catch (error) {
      Alert.alert('Parent notification', error.message || 'Failed to notify parents');
    } finally {
      setNotifying(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor="#1d4ed8" />
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Attendance</Text>
        <Text style={styles.heroSubtitle}>Daily student attendance with parent alerts for absence.</Text>
        <View style={styles.summaryRow}>
          <Metric label="Total" value={String(payload.summary?.total || 0)} />
          <Metric label="Present" value={String(payload.summary?.present || 0)} />
          <Metric label="Absent" value={String(payload.summary?.absent || 0)} />
          <Metric label="Late" value={String(payload.summary?.late || 0)} />
          <Metric label="Excused" value={String(payload.summary?.excused || 0)} />
          <Metric label="On Leave" value={String(payload.summary?.onLeave || 0)} />
        </View>
      </View>

      <View style={styles.filtersCard}>
        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          value={dateValue}
          onChangeText={setDateValue}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94a3b8"
        />
        <Text style={styles.label}>Search Student</Text>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Name or student ID"
          placeholderTextColor="#94a3b8"
        />
        <Text style={styles.label}>Class</Text>
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.chip, !selectedClass && styles.chipActive]}
            onPress={() => setSelectedClass('')}
          >
            <Text style={[styles.chipText, !selectedClass && styles.chipTextActive]}>All</Text>
          </Pressable>
          {(payload.classes || []).map((className) => {
            const active = selectedClass === className;
            return (
              <Pressable key={className} style={[styles.chip, active && styles.chipActive]} onPress={() => setSelectedClass(className)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{className}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.actionRow}>
          <Pressable style={styles.primaryBtn} onPress={loadData}>
            <Text style={styles.primaryBtnText}>Refresh</Text>
          </Pressable>
          <Pressable style={styles.warnBtn} disabled={notifying} onPress={notifyAbsentParents}>
            {notifying ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Notify Absent Parents</Text>}
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Students</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#1d4ed8" />
      ) : rows.length ? (
        rows.map((row) => (
          <View key={row.id} style={styles.studentCard}>
            <View style={styles.studentTop}>
              <View>
                <Text style={styles.studentName}>{row.name}</Text>
                <Text style={styles.studentMeta}>{row.studentId}  {row.className}</Text>
                <Text style={styles.studentMeta}>Parent: {row.parentName || 'Unassigned'}</Text>
              </View>
              <Text style={[styles.status, statusStyle(row.status)]}>{row.status.toUpperCase()}</Text>
            </View>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((status) => {
                const busy = savingId === `${row.id}:${status}`;
                return (
                  <Pressable
                    key={status}
                    style={[styles.statusBtn, buttonStyle(status)]}
                    onPress={() => markStudent(row, status)}
                    disabled={Boolean(savingId)}
                  >
                    {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.statusBtnText}>{status}</Text>}
                  </Pressable>
                );
              })}
            </View>
            {row.leave ? (
              <View style={styles.leaveBox}>
                <Text style={styles.leaveTitle}>Approved leave</Text>
                <Text style={styles.leaveText}>
                  {String(row.leave.category || 'other').toUpperCase()} - {row.leave.reason || 'No reason provided'}
                </Text>
                <Text style={styles.leaveMeta}>
                  {String(row.leave.startDate || '').slice(0, 10)} to {String(row.leave.endDate || '').slice(0, 10)}
                </Text>
                {row.leave.approvedByName ? <Text style={styles.leaveMeta}>Approved by {row.leave.approvedByName}</Text> : null}
              </View>
            ) : null}
          </View>
        ))
      ) : (
        <Text style={styles.empty}>No students found for this filter.</Text>
      )}
    </ScrollView>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function statusStyle(status) {
  if (status === 'present') return { color: '#16a34a' };
  if (status === 'late') return { color: '#d97706' };
  if (status === 'absent') return { color: '#dc2626' };
  if (status === 'excused') return { color: '#2563eb' };
  return { color: '#64748b' };
}

function buttonStyle(status) {
  if (status === 'present') return { backgroundColor: '#16a34a' };
  if (status === 'late') return { backgroundColor: '#d97706' };
  if (status === 'excused') return { backgroundColor: '#2563eb' };
  return { backgroundColor: '#dc2626' };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  hero: { backgroundColor: '#1d4ed8', borderRadius: 20, padding: 16 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '500' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  metric: {
    flex: 1,
    minWidth: '23%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  metricValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  metricLabel: { color: 'rgba(255,255,255,0.95)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  filtersCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe3f0', padding: 12, gap: 8 },
  label: { color: '#334155', fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: '#dbeafe', borderColor: '#1d4ed8' },
  chipText: { color: '#334155', fontWeight: '600' },
  chipTextActive: { color: '#1d4ed8', fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  primaryBtn: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center', paddingVertical: 11 },
  warnBtn: { flex: 1, backgroundColor: '#b91c1c', borderRadius: 10, alignItems: 'center', paddingVertical: 11 },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  sectionTitle: { color: '#0f172a', fontSize: 20, fontWeight: '900', marginTop: 2 },
  studentCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe3f0', padding: 12, gap: 10 },
  studentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  studentName: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  studentMeta: { color: '#64748b', fontWeight: '600', marginTop: 2 },
  status: { fontWeight: '900', fontSize: 11 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  statusBtnText: { color: '#fff', fontWeight: '800', textTransform: 'capitalize' },
  leaveBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    padding: 10,
    gap: 3,
  },
  leaveTitle: {
    color: '#1d4ed8',
    fontWeight: '800',
    textTransform: 'uppercase',
    fontSize: 11,
  },
  leaveText: { color: '#1e293b', fontWeight: '700' },
  leaveMeta: { color: '#475569', fontSize: 12, fontWeight: '600' },
  empty: { color: '#64748b', fontWeight: '600', textAlign: 'center', marginTop: 12 },
});
