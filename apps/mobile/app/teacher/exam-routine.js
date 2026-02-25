import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiRequest } from '../../services/api';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EMPTY_STRATEGY = {
  id: '',
  studentObjectId: '',
  strategyTitle: '',
  strategyDetails: '',
  subject: '',
  targetExamDate: '',
  attachment: null,
};

export default function TeacherExamRoutine() {
  const [loading, setLoading] = useState(true);
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchStrategy, setSearchStrategy] = useState('');
  const [routine, setRoutine] = useState({
    timetable: null,
    entries: [],
    classes: [],
    lessons: [],
  });
  const [students, setStudents] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [strategyForm, setStrategyForm] = useState(EMPTY_STRATEGY);

  const loadData = async (classNameArg = selectedClass) => {
    setLoading(true);
    try {
      const className = classNameArg || '';
      const query = className ? `?className=${encodeURIComponent(className)}` : '';
      const [routineRes, strategyRes, studentRes] = await Promise.all([
        apiRequest(`/teacher-content/exam-routine${query}`),
        apiRequest(`/teacher-content/exam-strategies${query}`),
        apiRequest(`/teacher-content/results${query}`),
      ]);

      setRoutine({
        timetable: routineRes?.timetable || null,
        entries: Array.isArray(routineRes?.entries) ? routineRes.entries : [],
        classes: Array.isArray(routineRes?.classes) ? routineRes.classes : [],
        lessons: Array.isArray(routineRes?.lessons) ? routineRes.lessons : [],
      });
      setStrategies(Array.isArray(strategyRes?.items) ? strategyRes.items : []);
      setStudents(Array.isArray(studentRes?.students) ? studentRes.students : []);

      if (!selectedClass && routineRes?.classes?.length) {
        setSelectedClass(routineRes.classes[0]);
      }
    } catch (error) {
      Alert.alert('Exam routine', error.message || 'Failed to load exam routine data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    loadData(selectedClass);
  }, [selectedClass]);

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
    routine.entries.forEach((entry) => {
      map.set(`${entry.day}:${entry.period}`, entry);
    });
    return map;
  }, [routine.entries]);

  const filteredStrategies = useMemo(() => {
    const q = searchStrategy.trim().toLowerCase();
    if (!q) return strategies;
    return strategies.filter(
      (item) =>
        String(item.studentName || '').toLowerCase().includes(q) ||
        String(item.subject || '').toLowerCase().includes(q) ||
        String(item.strategyTitle || '').toLowerCase().includes(q)
    );
  }, [strategies, searchStrategy]);

  const onSaveStrategy = async () => {
    if (
      !strategyForm.studentObjectId ||
      !strategyForm.strategyTitle.trim() ||
      !strategyForm.strategyDetails.trim() ||
      !strategyForm.subject.trim() ||
      !strategyForm.targetExamDate.trim()
    ) {
      Alert.alert('Study strategy', 'Please complete all strategy fields.');
      return;
    }

    setSavingStrategy(true);
    try {
      if (strategyForm.id) {
        await apiRequest(`/teacher-content/exam-strategies/${strategyForm.id}`, 'PUT', {
          ...strategyForm,
          className: selectedClass,
        });
      } else {
        await apiRequest('/teacher-content/exam-strategies', 'POST', {
          ...strategyForm,
          className: selectedClass,
        });
      }
      setStrategyForm(EMPTY_STRATEGY);
      await loadData(selectedClass);
    } catch (error) {
      Alert.alert('Study strategy', error.message || 'Failed to save strategy');
    } finally {
      setSavingStrategy(false);
    }
  };

  const onPickStrategyFile = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Upload', 'File upload picker is available on web in this build.');
      return;
    }
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx,.txt';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          setStrategyForm((prev) => ({
            ...prev,
            attachment: {
              name: file.name || 'file',
              mimeType: file.type || '',
              dataUrl: String(reader.result || ''),
            },
          }));
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } catch (error) {
      Alert.alert('Upload failed', 'Could not open file picker.');
    }
  };

  const onEditStrategy = (item) => {
    setStrategyForm({
      id: item.id,
      studentObjectId: item.studentObjectId,
      strategyTitle: item.strategyTitle || '',
      strategyDetails: item.strategyDetails || '',
      subject: item.subject || '',
      targetExamDate: item.targetExamDate || '',
      attachment: item.attachment || null,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Exam Routine</Text>
        <Text style={styles.heroSubtitle}>Timetable in table format + study strategy planner per student.</Text>
        <Text style={styles.heroMeta}>
          {routine.timetable ? `Timetable v${routine.timetable.version} | ${routine.timetable.title}` : 'No active timetable'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Class Filter</Text>
        <View style={styles.chipsRow}>
          <Pressable style={[styles.chip, !selectedClass && styles.chipActive]} onPress={() => setSelectedClass('')}>
            <Text style={[styles.chipText, !selectedClass && styles.chipTextActive]}>All</Text>
          </Pressable>
          {routine.classes.map((className) => {
            const active = selectedClass === className;
            return (
              <Pressable key={className} style={[styles.chip, active && styles.chipActive]} onPress={() => setSelectedClass(className)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{className}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Lessons From Admin + Teachers</Text>
        <View style={styles.lessonWrap}>
          {routine.lessons.length ? (
            routine.lessons.map((lesson) => (
              <View key={lesson} style={styles.lessonChip}>
                <Text style={styles.lessonText}>{lesson}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No lessons available yet.</Text>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.sectionTitle}>Timetable Table</Text>
          <Pressable style={styles.refreshBtn} onPress={() => loadData(selectedClass)}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#1e3a8a" />
        ) : dayColumns.length && periods.length ? (
          <ScrollView horizontal>
            <View>
              <View style={styles.tableRow}>
                <View style={[styles.periodCell, styles.tableHead]}>
                  <Text style={styles.tableHeadText}>Period</Text>
                </View>
                {dayColumns.map((day) => (
                  <View key={day} style={[styles.dayCell, styles.tableHead]}>
                    <Text style={styles.tableHeadText}>{day}</Text>
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
                            <Text style={styles.cellSubject}>{entry.subject}</Text>
                            <Text style={styles.cellMeta}>{entry.className}</Text>
                            <Text style={styles.cellMeta}>Teacher: {entry.teacherInitials || '-'}</Text>
                            <Text style={styles.cellMeta}>{entry.startTime} - {entry.endTime}</Text>
                          </>
                        ) : (
                          <Text style={styles.emptyCell}>-</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text style={styles.muted}>No timetable entries for this class.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{strategyForm.id ? 'Edit Study Strategy' : 'Add Study Strategy'}</Text>
        <Text style={styles.fieldLabel}>Student</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.studentPickerRow}>
          {students.map((student) => {
            const active = strategyForm.studentObjectId === student.id;
            return (
              <Pressable
                key={student.id}
                style={[styles.studentPick, active && styles.studentPickActive]}
                onPress={() => setStrategyForm((prev) => ({ ...prev, studentObjectId: student.id }))}
              >
                <Text style={[styles.studentPickText, active && styles.studentPickTextActive]}>{student.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <TextInput
          style={styles.input}
          placeholder="Strategy title"
          placeholderTextColor="#94a3b8"
          value={strategyForm.strategyTitle}
          onChangeText={(value) => setStrategyForm((prev) => ({ ...prev, strategyTitle: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Subject"
          placeholderTextColor="#94a3b8"
          value={strategyForm.subject}
          onChangeText={(value) => setStrategyForm((prev) => ({ ...prev, subject: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Target exam date (YYYY-MM-DD)"
          placeholderTextColor="#94a3b8"
          value={strategyForm.targetExamDate}
          onChangeText={(value) => setStrategyForm((prev) => ({ ...prev, targetExamDate: value }))}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Strategy details"
          placeholderTextColor="#94a3b8"
          multiline
          value={strategyForm.strategyDetails}
          onChangeText={(value) => setStrategyForm((prev) => ({ ...prev, strategyDetails: value }))}
        />
        <Pressable style={styles.uploadBtn} onPress={onPickStrategyFile}>
          <Text style={styles.btnText}>Upload Study File</Text>
        </Pressable>
        {strategyForm.attachment?.name ? (
          <Text style={styles.attachmentMeta}>Attached: {strategyForm.attachment.name}</Text>
        ) : null}
        {strategyForm.attachment?.dataUrl?.startsWith('data:image') ? (
          <Image source={{ uri: strategyForm.attachment.dataUrl }} style={styles.attachmentPreview} />
        ) : null}
        <View style={styles.actionRow}>
          <Pressable style={styles.primaryBtn} onPress={onSaveStrategy} disabled={savingStrategy}>
            {savingStrategy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>{strategyForm.id ? 'Update Strategy' : 'Add Strategy'}</Text>}
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => setStrategyForm(EMPTY_STRATEGY)}>
            <Text style={styles.btnText}>Clear</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Saved Study Strategies</Text>
        <TextInput
          style={styles.input}
          placeholder="Search strategies"
          placeholderTextColor="#94a3b8"
          value={searchStrategy}
          onChangeText={setSearchStrategy}
        />
        {filteredStrategies.length ? (
          filteredStrategies.map((item) => (
            <View key={item.id} style={styles.strategyCard}>
              <View style={styles.strategyTop}>
                <Text style={styles.strategyTitle}>{item.strategyTitle}</Text>
                <Pressable style={styles.smallEditBtn} onPress={() => onEditStrategy(item)}>
                  <Text style={styles.smallEditText}>Edit</Text>
                </Pressable>
              </View>
              <Text style={styles.strategyMeta}>
                {item.studentName} | {item.subject} | Exam: {item.targetExamDate}
              </Text>
              <Text style={styles.strategyBody}>{item.strategyDetails}</Text>
              {item.attachment?.name ? <Text style={styles.strategyFile}>File: {item.attachment.name}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No study strategies yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 14, paddingBottom: 34, gap: 12 },
  hero: { backgroundColor: '#1e3a8a', borderRadius: 18, padding: 16 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '600' },
  heroMeta: { color: 'rgba(255,255,255,0.85)', marginTop: 8, fontWeight: '700', fontSize: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe3f0', padding: 12, gap: 8 },
  sectionTitle: { color: '#0f172a', fontSize: 19, fontWeight: '900' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  chipActive: { borderColor: '#1d4ed8', backgroundColor: '#dbeafe' },
  chipText: { color: '#334155', fontWeight: '600' },
  chipTextActive: { color: '#1d4ed8', fontWeight: '800' },
  lessonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lessonChip: { borderRadius: 999, backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 6 },
  lessonText: { color: '#3730a3', fontWeight: '700', fontSize: 12 },
  tableHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refreshBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  refreshText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  tableRow: { flexDirection: 'row' },
  tableHead: { backgroundColor: '#e2e8f0' },
  periodCell: {
    width: 86,
    minHeight: 64,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 6,
    justifyContent: 'center',
  },
  dayCell: {
    width: 146,
    minHeight: 64,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 6,
    justifyContent: 'center',
  },
  tableHeadText: { color: '#1e293b', fontWeight: '800', textAlign: 'center' },
  periodText: { color: '#0f172a', fontWeight: '800', textAlign: 'center' },
  cellSubject: { color: '#0f172a', fontWeight: '800', fontSize: 12 },
  cellMeta: { color: '#475569', fontWeight: '600', fontSize: 11, marginTop: 2 },
  emptyCell: { textAlign: 'center', color: '#94a3b8', fontWeight: '700' },
  fieldLabel: { color: '#334155', fontWeight: '700' },
  studentPickerRow: { gap: 8, paddingVertical: 2 },
  studentPick: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  studentPickActive: { borderColor: '#059669', backgroundColor: '#d1fae5' },
  studentPickText: { color: '#334155', fontWeight: '600' },
  studentPickTextActive: { color: '#065f46', fontWeight: '800' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, color: '#0f172a', backgroundColor: '#fff' },
  textArea: { minHeight: 82, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', gap: 8 },
  primaryBtn: { flex: 1, backgroundColor: '#1d4ed8', borderRadius: 10, alignItems: 'center', paddingVertical: 11 },
  secondaryBtn: { flex: 1, backgroundColor: '#475569', borderRadius: 10, alignItems: 'center', paddingVertical: 11 },
  uploadBtn: { backgroundColor: '#0f766e', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  btnText: { color: '#fff', fontWeight: '800' },
  attachmentMeta: { color: '#0f172a', fontWeight: '700', fontSize: 12 },
  attachmentPreview: { width: 84, height: 84, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  strategyCard: { borderWidth: 1, borderColor: '#dbe3f0', borderRadius: 10, padding: 10, gap: 6, backgroundColor: '#f8fafc' },
  strategyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  strategyTitle: { color: '#0f172a', fontWeight: '800', flex: 1 },
  strategyMeta: { color: '#64748b', fontWeight: '700', fontSize: 12 },
  strategyBody: { color: '#334155', fontWeight: '600' },
  strategyFile: { color: '#0f766e', fontWeight: '700', fontSize: 12 },
  smallEditBtn: { backgroundColor: '#2563eb', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 6 },
  smallEditText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  muted: { color: '#64748b', fontWeight: '600' },
});
