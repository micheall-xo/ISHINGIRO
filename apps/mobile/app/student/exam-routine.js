import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../../services/api';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function StudentExamRoutine() {
  const [loading, setLoading] = useState(true);
  const [routine, setRoutine] = useState({ timetable: null, entries: [], lessons: [], selectedClassName: '' });
  const [strategies, setStrategies] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [routineRes, strategyRes] = await Promise.all([
        apiRequest('/teacher-content/exam-routine'),
        apiRequest('/teacher-content/exam-strategies'),
      ]);
      setRoutine({
        timetable: routineRes?.timetable || null,
        entries: Array.isArray(routineRes?.entries) ? routineRes.entries : [],
        lessons: Array.isArray(routineRes?.lessons) ? routineRes.lessons : [],
        selectedClassName: String(routineRes?.selectedClassName || ''),
      });
      setStrategies(Array.isArray(strategyRes?.items) ? strategyRes.items : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const dayColumns = useMemo(() => {
    const found = [...new Set(routine.entries.map((entry) => entry.day).filter(Boolean))];
    return DAY_ORDER.filter((day) => found.includes(day));
  }, [routine.entries]);

  const periods = useMemo(() => {
    const found = [...new Set(routine.entries.map((entry) => Number(entry.period)).filter(Number.isFinite))];
    return found.sort((a, b) => a - b);
  }, [routine.entries]);

  const cellMap = useMemo(() => {
    const map = new Map();
    routine.entries.forEach((entry) => map.set(`${entry.day}:${entry.period}`, entry));
    return map;
  }, [routine.entries]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor="#b91c1c" />
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Exam Routine</Text>
        <Text style={styles.heroSubtitle}>Class: {routine.selectedClassName || 'N/A'}</Text>
        <Text style={styles.heroMeta}>
          {routine.timetable ? `Timetable v${routine.timetable.version}` : 'No active timetable'}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.headRow}>
          <Text style={styles.sectionTitle}>Timetable Table</Text>
          <Pressable style={styles.refreshBtn} onPress={loadData}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#b91c1c" />
        ) : dayColumns.length && periods.length ? (
          <ScrollView horizontal>
            <View>
              <View style={styles.tableRow}>
                <View style={[styles.periodCell, styles.headCell]}>
                  <Text style={styles.headText}>Period</Text>
                </View>
                {dayColumns.map((day) => (
                  <View key={day} style={[styles.dayCell, styles.headCell]}>
                    <Text style={styles.headText}>{day}</Text>
                  </View>
                ))}
              </View>
              {periods.map((period) => (
                <View key={period} style={styles.tableRow}>
                  <View style={styles.periodCell}>
                    <Text style={styles.periodText}>P{period}</Text>
                  </View>
                  {dayColumns.map((day) => {
                    const entry = cellMap.get(`${day}:${period}`);
                    return (
                      <View key={`${day}:${period}`} style={styles.dayCell}>
                        {entry ? (
                          <>
                            <Text style={styles.subject}>{entry.subject}</Text>
                            <Text style={styles.meta}>{entry.startTime} - {entry.endTime}</Text>
                          </>
                        ) : (
                          <Text style={styles.empty}>-</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text style={styles.muted}>No timetable entries available.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Lessons From Admin + Teachers</Text>
        <View style={styles.lessonsWrap}>
          {routine.lessons.length ? (
            routine.lessons.map((lesson) => (
              <View key={lesson} style={styles.lessonChip}>
                <Text style={styles.lessonText}>{lesson}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No lessons available.</Text>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>My Study Strategy</Text>
        {strategies.length ? (
          strategies.map((item) => (
            <View key={item.id} style={styles.strategyCard}>
              <Text style={styles.strategyTitle}>{item.strategyTitle}</Text>
              <Text style={styles.strategyMeta}>{item.subject} | Exam: {item.targetExamDate}</Text>
              <Text style={styles.strategyBody}>{item.strategyDetails}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No strategy added yet by your teacher.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 30, gap: 12 },
  hero: { backgroundColor: '#b91c1c', borderRadius: 18, padding: 16 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  heroSubtitle: { color: 'rgba(255,255,255,0.92)', marginTop: 4, fontWeight: '600' },
  heroMeta: { color: 'rgba(255,255,255,0.86)', marginTop: 8, fontWeight: '700', fontSize: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe3f0', padding: 12, gap: 8 },
  sectionTitle: { color: '#0f172a', fontSize: 19, fontWeight: '900' },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refreshBtn: { backgroundColor: '#dc2626', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  refreshText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  tableRow: { flexDirection: 'row' },
  periodCell: { width: 86, minHeight: 60, borderWidth: 1, borderColor: '#cbd5e1', padding: 6, justifyContent: 'center' },
  dayCell: { width: 142, minHeight: 60, borderWidth: 1, borderColor: '#cbd5e1', padding: 6, justifyContent: 'center' },
  headCell: { backgroundColor: '#e2e8f0' },
  headText: { color: '#1e293b', fontWeight: '800', textAlign: 'center' },
  periodText: { color: '#0f172a', fontWeight: '800', textAlign: 'center' },
  subject: { color: '#0f172a', fontWeight: '800', fontSize: 12 },
  meta: { color: '#475569', fontWeight: '600', fontSize: 11, marginTop: 2 },
  empty: { color: '#94a3b8', textAlign: 'center', fontWeight: '700' },
  lessonsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lessonChip: { borderRadius: 999, backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 6 },
  lessonText: { color: '#991b1b', fontWeight: '700', fontSize: 12 },
  strategyCard: { borderWidth: 1, borderColor: '#dbe3f0', borderRadius: 10, padding: 10, gap: 5, backgroundColor: '#f8fafc' },
  strategyTitle: { color: '#0f172a', fontWeight: '800' },
  strategyMeta: { color: '#64748b', fontWeight: '700', fontSize: 12 },
  strategyBody: { color: '#334155', fontWeight: '600' },
  muted: { color: '#64748b', fontWeight: '600' },
});
