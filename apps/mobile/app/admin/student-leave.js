import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import SelectField from '../../components/SelectField';
import {
  AdminShell,
  AnimatedCard,
  EmptyState,
  LoadingButton,
  SectionTitle,
  adminColors,
  adminFieldStyles,
} from '../../components/admin/AdminUI';
import { apiRequest } from '../../services/api';

const CATEGORY_OPTIONS = [
  { value: 'sickness', label: 'Sickness' },
  { value: 'family', label: 'Family' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'other', label: 'Other' },
];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminStudentLeavePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudentObjectId, setSelectedStudentObjectId] = useState('');
  const [form, setForm] = useState({
    startDate: todayString(),
    endDate: todayString(),
    category: 'sickness',
    reason: '',
    notes: '',
  });
  const [leaveDate, setLeaveDate] = useState(todayString());
  const [leaveRows, setLeaveRows] = useState([]);

  const loadOptions = async () => {
    const response = await apiRequest('/admin/options');
    setStudents(Array.isArray(response?.students) ? response.students : []);
    setClasses(Array.isArray(response?.classes) ? response.classes : []);
  };

  const loadLeaves = async () => {
    const query = new URLSearchParams();
    if (leaveDate.trim()) query.set('date', leaveDate.trim());
    if (selectedClass.trim()) query.set('className', selectedClass.trim());
    const response = await apiRequest(`/attendance/leaves?${query.toString()}`);
    setLeaveRows(Array.isArray(response?.leaves) ? response.leaves : []);
  };

  const bootstrap = async () => {
    setLoading(true);
    try {
      await Promise.all([loadOptions(), loadLeaves()]);
    } catch (error) {
      Alert.alert('Student Leave', error.message || 'Failed to load leave page data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    loadLeaves().catch((error) => Alert.alert('Student Leave', error.message || 'Failed to load leave records'));
  }, [leaveDate, selectedClass]);

  const studentOptions = useMemo(() => {
    return students.map((student) => ({
      value: student.id,
      label: `${student.name} (${student.className || 'No class'})`,
      keywords: [student.name, student.className, student.id],
    }));
  }, [students]);

  const classOptions = useMemo(() => {
    return (classes || []).map((item) => ({
      value: item.name,
      label: item.name,
    }));
  }, [classes]);

  const selectedStudent = useMemo(
    () => students.find((item) => String(item.id) === String(selectedStudentObjectId)),
    [students, selectedStudentObjectId]
  );

  const grantLeave = async () => {
    if (!selectedStudentObjectId) {
      Alert.alert('Student Leave', 'Please select a student');
      return;
    }
    if (!form.reason.trim()) {
      Alert.alert('Student Leave', 'Please provide a reason for leave');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/attendance/leaves', 'POST', {
        studentObjectId: selectedStudentObjectId,
        startDate: form.startDate,
        endDate: form.endDate,
        category: form.category,
        reason: form.reason,
        notes: form.notes,
      });
      setForm((prev) => ({ ...prev, reason: '', notes: '' }));
      await loadLeaves();
      Alert.alert('Student Leave', 'Leave granted successfully');
    } catch (error) {
      Alert.alert('Student Leave', error.message || 'Failed to grant leave');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell title="Student Leave Desk" subtitle="Grant temporary leave permission and keep teacher attendance aligned.">
      <AnimatedCard delay={40}>
        <SectionTitle>Grant Leave</SectionTitle>
        <SelectField
          label="Student"
          value={selectedStudent ? `${selectedStudent.name} (${selectedStudent.className || 'No class'})` : ''}
          options={studentOptions}
          placeholder="Select student"
          onChange={(value) => setSelectedStudentObjectId(value)}
        />
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={adminFieldStyles.label}>Start Date</Text>
            <TextInput
              style={adminFieldStyles.input}
              value={form.startDate}
              onChangeText={(value) => setForm((prev) => ({ ...prev, startDate: value }))}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View style={styles.col}>
            <Text style={adminFieldStyles.label}>End Date</Text>
            <TextInput
              style={adminFieldStyles.input}
              value={form.endDate}
              onChangeText={(value) => setForm((prev) => ({ ...prev, endDate: value }))}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>
        <SelectField
          label="Category"
          value={CATEGORY_OPTIONS.find((item) => item.value === form.category)?.label || 'Category'}
          options={CATEGORY_OPTIONS}
          placeholder="Leave category"
          onChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
        />
        <Text style={adminFieldStyles.label}>Reason</Text>
        <TextInput
          style={adminFieldStyles.input}
          value={form.reason}
          onChangeText={(value) => setForm((prev) => ({ ...prev, reason: value }))}
          placeholder="Sick, medical visit, family emergency, etc."
        />
        <Text style={adminFieldStyles.label}>Notes (Optional)</Text>
        <TextInput
          style={[adminFieldStyles.input, styles.multiline]}
          multiline
          value={form.notes}
          onChangeText={(value) => setForm((prev) => ({ ...prev, notes: value }))}
          placeholder="Internal admin notes"
        />
        <LoadingButton
          label="Grant Leave"
          busyLabel="Saving leave..."
          loading={saving}
          onPress={grantLeave}
          color="#0284c7"
        />
      </AnimatedCard>

      <AnimatedCard delay={110}>
        <SectionTitle>Leaves For Date</SectionTitle>
        <Text style={adminFieldStyles.label}>Date</Text>
        <TextInput
          style={adminFieldStyles.input}
          value={leaveDate}
          onChangeText={setLeaveDate}
          placeholder="YYYY-MM-DD"
        />
        <SelectField
          label="Class Filter"
          value={selectedClass || 'All classes'}
          options={classOptions}
          placeholder="All classes"
          onChange={(value) => setSelectedClass(value)}
        />
        <View style={styles.filterRow}>
          <Pressable style={styles.clearBtn} onPress={() => setSelectedClass('')}>
            <Text style={styles.clearText}>Clear Class Filter</Text>
          </Pressable>
          <Pressable style={styles.reloadBtn} onPress={() => loadLeaves()}>
            <Text style={styles.reloadText}>Refresh</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={adminColors.accent} />
            <Text style={styles.loadingText}>Loading leave records...</Text>
          </View>
        ) : leaveRows.length ? (
          <View style={styles.listWrap}>
            {leaveRows.map((row) => (
              <View key={row.id} style={styles.leaveCard}>
                <Text style={styles.leaveName}>{row.studentName}</Text>
                <Text style={styles.leaveMeta}>{row.studentId} - {row.className}</Text>
                <Text style={styles.leaveReason}>{String(row.category || '').toUpperCase()} - {row.reason}</Text>
                <Text style={styles.leaveMeta}>
                  {String(row.startDate || '').slice(0, 10)} to {String(row.endDate || '').slice(0, 10)}
                </Text>
                {row.approvedByName ? <Text style={styles.leaveMeta}>Approved by {row.approvedByName}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <EmptyState message="No leave records for this date." />
        )}
      </AnimatedCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  col: {
    flex: 1,
    gap: 6,
  },
  multiline: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  clearBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  clearText: {
    color: '#475569',
    fontWeight: '700',
  },
  reloadBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  reloadText: {
    color: '#fff',
    fontWeight: '800',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: adminColors.body,
    fontWeight: '600',
  },
  listWrap: {
    gap: 8,
  },
  leaveCard: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    padding: 10,
    gap: 2,
  },
  leaveName: {
    color: '#1e1b4b',
    fontWeight: '800',
    fontSize: 15,
  },
  leaveReason: {
    color: '#0f172a',
    fontWeight: '700',
  },
  leaveMeta: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 12,
  },
});
