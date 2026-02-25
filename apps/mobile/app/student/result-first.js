import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { apiRequest } from '../../services/api';
import { exportTermReport } from '../../services/reportExport';

export default function ResultFirst() {
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState(null);
  const [yearly, setYearly] = useState({});
  const [student, setStudent] = useState({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await apiRequest('/teacher-content/student/report-card');
        const terms = Array.isArray(response?.terms) ? response.terms : [];
        const first = terms.find((t) => String(t.term || '').toLowerCase().includes('first')) || terms[0] || null;
        setTerm(first);
        setYearly(response?.yearly || {});
        setStudent(response?.student || {});
      } catch (error) {
        Alert.alert('First Term', error.message || 'Failed to load first term result');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const description = useMemo(() => {
    if (!term) return 'No first-term report found in the database.';
    return `Overall ${term.overallGrade || 'N/A'} (${Number(term.overallScore || 0).toFixed(2)}%). Yearly status: ${yearly.status || 'N/A'}, GPA: ${Number(yearly.gpa || 0).toFixed(2)}.`;
  }, [term, yearly]);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>RESULT</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Term : First</Text>
          <Text style={styles.metaText}>Date: {term?.date || new Date().toLocaleDateString()}</Text>
        </View>
      </View>
      <Text style={styles.label}>Description</Text>
      <Text style={styles.blurb}>{loading ? 'Loading from database...' : description}</Text>
      <View style={styles.placeholder}>
        {loading ? (
          <ActivityIndicator size="small" color="#1d4ed8" />
        ) : (
          (term?.subjects || []).slice(0, 5).map((s) => (
            <Text key={s.name} style={styles.subjectLine}>
              {s.name}: Formative {s.formativeScore ?? '-'} | Exam {s.examScore ?? '-'} | Final {Number(s.score || 0).toFixed(1)}%
            </Text>
          ))
        )}
      </View>
      <Pressable
        style={styles.button}
        onPress={async () => {
          try {
            await exportTermReport({ student, yearly, terms: term ? [term] : [] }, term);
          } catch (error) {
            Alert.alert('Download', error.message || 'Failed to generate report');
          }
        }}
      >
        <Text style={styles.buttonText}>Download your result</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16, gap: 12 },
  headerCard: { backgroundColor: '#0b5eff', padding: 16, borderRadius: 8 },
  headerTitle: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
  metaRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { color: '#eff6ff' },
  label: { color: '#111827' },
  blurb: { color: '#6b7280' },
  placeholder: { minHeight: 120, borderRadius: 8, backgroundColor: '#e5e7eb', padding: 10, gap: 6, justifyContent: 'center' },
  subjectLine: { color: '#374151', fontSize: 12, fontWeight: '600' },
  button: { backgroundColor: '#1d4ed8', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
