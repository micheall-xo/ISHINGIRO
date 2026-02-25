import { useEffect, useMemo, useState } from 'react';
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

const DEFAULT_EXAM = 'First Terminal';
const DEFAULT_SUBJECT = 'Mathematics';

export default function TeacherAddMarks() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [exam, setExam] = useState(DEFAULT_EXAM);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [payload, setPayload] = useState({ students: [], classes: [], exams: [], subjects: [] });
  const [draft, setDraft] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set('search', search.trim());
      if (selectedClass.trim()) query.set('className', selectedClass.trim());
      if (exam.trim()) query.set('exam', exam.trim());
      if (subject.trim()) query.set('subject', subject.trim());
      const response = await apiRequest(`/teacher-content/results?${query.toString()}`);
      const students = Array.isArray(response?.students) ? response.students : [];
      const nextDraft = {};
      students.forEach((item) => {
        nextDraft[item.id] = {
          score: item.report?.score !== undefined ? String(item.report.score) : '',
          remarks: item.report?.remarks || '',
        };
      });
      setDraft(nextDraft);
      setPayload({
        students,
        classes: Array.isArray(response?.classes) ? response.classes : [],
        exams: Array.isArray(response?.exams) ? response.exams : [],
        subjects: Array.isArray(response?.subjects) ? response.subjects : [],
      });
      if (!selectedClass && response?.classes?.length) setSelectedClass(response.classes[0]);
    } catch (error) {
      Alert.alert('Marks', error.message || 'Failed to load marks data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedClass, exam, subject]);

  const stats = useMemo(() => {
    const scores = payload.students
      .map((item) => Number(item.report?.score))
      .filter((value) => Number.isFinite(value));
    const average = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
    return {
      total: payload.students.length,
      graded: scores.length,
      pending: Math.max(0, payload.students.length - scores.length),
      average,
    };
  }, [payload.students]);

  const onSave = async (student) => {
    const item = draft[student.id] || {};
    const score = Number(item.score);
    if (!Number.isFinite(score)) {
      Alert.alert('Marks', 'Enter a valid numeric score.');
      return;
    }

    setSavingId(student.id);
    try {
      await apiRequest(`/teacher-content/results/student/${student.id}`, 'PUT', {
        exam,
        subject,
        score,
        remarks: item.remarks || '',
      });
      await loadData();
    } catch (error) {
      Alert.alert('Marks', error.message || 'Failed to update mark');
    } finally {
      setSavingId('');
    }
  };

  const onSendParents = async () => {
    try {
      const response = await apiRequest('/teacher-content/results/send-to-parents', 'POST', {
        className: selectedClass || undefined,
        exam,
        subject,
      });
      Alert.alert('Report updates', `Sent ${response?.sent || 0} parent notifications.`);
    } catch (error) {
      Alert.alert('Report updates', error.message || 'Failed to send report updates');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor="#c2410c" />
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Marks Management</Text>
        <Text style={styles.heroSubtitle}>Save student marks and update report cards instantly.</Text>
        <View style={styles.statRow}>
          <Stat label="Students" value={String(stats.total)} />
          <Stat label="Graded" value={String(stats.graded)} />
          <Stat label="Pending" value={String(stats.pending)} />
          <Stat label="Average" value={`${stats.average}%`} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Class</Text>
        <TextInput style={styles.input} value={selectedClass} onChangeText={setSelectedClass} placeholder="Class (e.g. 10A)" placeholderTextColor="#94a3b8" />
        <Text style={styles.label}>Subject</Text>
        <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="Subject" placeholderTextColor="#94a3b8" />
        <Text style={styles.label}>Exam</Text>
        <TextInput style={styles.input} value={exam} onChangeText={setExam} placeholder="Exam" placeholderTextColor="#94a3b8" />
        <Text style={styles.label}>Search</Text>
        <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Name or student ID" placeholderTextColor="#94a3b8" />
        <View style={styles.quickRow}>
          <Pressable style={styles.primaryBtn} onPress={loadData}>
            <Text style={styles.primaryBtnText}>Refresh</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={onSendParents}>
            <Text style={styles.primaryBtnText}>Send Reports</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Marks Entry</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#c2410c" />
      ) : payload.students.length ? (
        payload.students.map((student) => {
          const item = draft[student.id] || { score: '', remarks: '' };
          return (
            <View key={student.id} style={styles.studentCard}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.meta}>{student.studentId}  {student.className}</Text>
                </View>
                <Text style={styles.grade}>{student.report?.grade || 'N/A'}</Text>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.smallLabel}>Score</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={item.score}
                    onChangeText={(text) =>
                      setDraft((prev) => ({
                        ...prev,
                        [student.id]: { ...prev[student.id], score: text.replace(/[^0-9]/g, '') },
                      }))
                    }
                    placeholder="0 - 100"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.smallLabel}>Remarks</Text>
                  <TextInput
                    style={styles.input}
                    value={item.remarks}
                    onChangeText={(text) =>
                      setDraft((prev) => ({
                        ...prev,
                        [student.id]: { ...prev[student.id], remarks: text },
                      }))
                    }
                    placeholder="Remarks"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <Pressable style={styles.saveBtn} onPress={() => onSave(student)} disabled={Boolean(savingId)}>
                {savingId === student.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Save Mark</Text>}
              </Pressable>
            </View>
          );
        })
      ) : (
        <Text style={styles.empty}>No students found.</Text>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  hero: { backgroundColor: '#c2410c', borderRadius: 20, padding: 16 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '600' },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  stat: { flex: 1, minWidth: '23%', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 },
  statValue: { color: '#fff', fontWeight: '900', fontSize: 17 },
  statLabel: { color: '#fff', fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe3f0', padding: 12, gap: 8 },
  label: { color: '#334155', fontWeight: '700' },
  smallLabel: { color: '#334155', fontWeight: '700', fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, color: '#0f172a' },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  primaryBtn: { flex: 1, backgroundColor: '#c2410c', borderRadius: 10, alignItems: 'center', paddingVertical: 11 },
  secondaryBtn: { flex: 1, backgroundColor: '#0f766e', borderRadius: 10, alignItems: 'center', paddingVertical: 11 },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  sectionTitle: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  studentCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe3f0', padding: 12, gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  studentName: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  meta: { color: '#64748b', fontWeight: '600', marginTop: 2 },
  grade: { color: '#0369a1', fontWeight: '900' },
  inputRow: { flexDirection: 'row', gap: 8 },
  inputCol: { flex: 1, gap: 4 },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  empty: { color: '#64748b', fontWeight: '600', textAlign: 'center' },
});
