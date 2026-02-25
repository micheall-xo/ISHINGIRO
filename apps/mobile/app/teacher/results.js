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

export default function TeacherResults() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [exam, setExam] = useState('First Terminal');
  const [subject, setSubject] = useState('Mathematics');
  const [payload, setPayload] = useState({ students: [], classes: [] });

  const loadData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set('search', search.trim());
      if (selectedClass.trim()) query.set('className', selectedClass.trim());
      if (exam.trim()) query.set('exam', exam.trim());
      if (subject.trim()) query.set('subject', subject.trim());
      const response = await apiRequest(`/teacher-content/results?${query.toString()}`);
      setPayload({
        students: Array.isArray(response?.students) ? response.students : [],
        classes: Array.isArray(response?.classes) ? response.classes : [],
      });
    } catch (error) {
      Alert.alert('Results', error.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedClass, exam, subject]);

  const stats = useMemo(() => {
    const scored = payload.students
      .map((item) => Number(item.report?.score))
      .filter((value) => Number.isFinite(value));
    const average = scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10 : 0;
    return {
      total: payload.students.length,
      graded: scored.length,
      average,
    };
  }, [payload.students]);

  const sendParents = async () => {
    try {
      const response = await apiRequest('/teacher-content/results/send-to-parents', 'POST', {
        className: selectedClass || undefined,
        exam,
        subject,
      });
      Alert.alert('Results', `Sent ${response?.sent || 0} parent updates.`);
    } catch (error) {
      Alert.alert('Results', error.message || 'Failed to send parent updates');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor="#a16207" />
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Results</Text>
        <Text style={styles.heroSubtitle}>View, filter, and share student reports from the database.</Text>
        <View style={styles.statRow}>
          <Metric label="Students" value={String(stats.total)} />
          <Metric label="Graded" value={String(stats.graded)} />
          <Metric label="Average" value={`${stats.average}%`} />
        </View>
      </View>

      <View style={styles.filters}>
        <Text style={styles.label}>Class</Text>
        <TextInput style={styles.input} value={selectedClass} onChangeText={setSelectedClass} placeholder="Class (e.g. 10A)" placeholderTextColor="#94a3b8" />
        <Text style={styles.label}>Subject</Text>
        <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="Subject" placeholderTextColor="#94a3b8" />
        <Text style={styles.label}>Exam</Text>
        <TextInput style={styles.input} value={exam} onChangeText={setExam} placeholder="Exam" placeholderTextColor="#94a3b8" />
        <Text style={styles.label}>Search</Text>
        <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Name or student ID" placeholderTextColor="#94a3b8" />
        <View style={styles.quickRow}>
          <Pressable style={styles.btnPrimary} onPress={loadData}>
            <Text style={styles.btnText}>Refresh</Text>
          </Pressable>
          <Pressable style={styles.btnSecondary} onPress={sendParents}>
            <Text style={styles.btnText}>Send to Parents</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Student Results</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#a16207" />
      ) : payload.students.length ? (
        payload.students.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.studentId}  {item.className}</Text>
              </View>
              <Text style={styles.grade}>{item.report?.grade || 'N/A'}</Text>
            </View>
            <View style={styles.valuesRow}>
              <ValueBlock label="Score" value={item.report?.score !== undefined ? `${item.report.score}%` : 'N/A'} />
              <ValueBlock label="Overall Grade" value={item.performance?.overallGrade || 'N/A'} />
              <ValueBlock label="GPA" value={String(item.performance?.gpa ?? 0)} />
            </View>
            <Text style={styles.remarks}>Remarks: {item.report?.remarks || 'No remarks yet.'}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>No results found for this filter.</Text>
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

function ValueBlock({ label, value }) {
  return (
    <View style={styles.valueBlock}>
      <Text style={styles.valueLabel}>{label}</Text>
      <Text style={styles.valueValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  hero: { backgroundColor: '#a16207', borderRadius: 20, padding: 16 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metric: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 },
  metricValue: { color: '#fff', fontWeight: '900', fontSize: 17 },
  metricLabel: { color: '#fff', fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  filters: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe3f0', padding: 12, gap: 8 },
  label: { color: '#334155', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, color: '#0f172a' },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  btnPrimary: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center', backgroundColor: '#a16207' },
  btnSecondary: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center', backgroundColor: '#0f766e' },
  btnText: { color: '#fff', fontWeight: '800' },
  sectionTitle: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe3f0', padding: 12, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
  meta: { color: '#64748b', fontWeight: '600', marginTop: 2 },
  grade: { color: '#0369a1', fontWeight: '900' },
  valuesRow: { flexDirection: 'row', gap: 8 },
  valueBlock: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 8, backgroundColor: '#f8fafc' },
  valueLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  valueValue: { color: '#0f172a', marginTop: 3, fontWeight: '800' },
  remarks: { color: '#475569', fontWeight: '600' },
  empty: { color: '#64748b', textAlign: 'center', fontWeight: '600' },
});
