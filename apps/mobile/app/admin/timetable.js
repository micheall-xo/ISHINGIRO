import { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../../services/api';
import SelectField from '../../components/SelectField';
import { AdminShell, AnimatedCard, SectionTitle, LoadingButton, adminFieldStyles, adminColors } from '../../components/admin/AdminUI';

const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function AdminTimetablePage() {
  const [options, setOptions] = useState({ classes: [], teachers: [], lessonDetails: [] });
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [periodsPerDay, setPeriodsPerDay] = useState('6');
  const [startHour, setStartHour] = useState('8');
  const [entryForm, setEntryForm] = useState({
    day: 'Monday',
    period: '1',
    className: '',
    subject: '',
    teacherId: '',
    startTime: '08:00',
    endTime: '09:00',
  });
  const [manualEntries, setManualEntries] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishingManual, setPublishingManual] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const [opts, active] = await Promise.all([
        apiRequest('/admin/options'),
        apiRequest('/admin/timetable/current'),
      ]);
      setOptions({
        classes: Array.isArray(opts?.classes) ? opts.classes : [],
        teachers: Array.isArray(opts?.teachers) ? opts.teachers : [],
        lessonDetails: Array.isArray(opts?.lessonDetails) ? opts.lessonDetails : [],
      });
      setCurrent(active);
    } catch (error) {
      Alert.alert('Load failed', error.message);
    } finally {
      setLoading(false);
    }
  }

  function addManualEntry() {
    if (!entryForm.className || !entryForm.subject || !entryForm.teacherId || !entryForm.day) {
      return Alert.alert('Missing fields', 'Pick class, lesson, teacher, day and time.');
    }
    setManualEntries((prev) => [
      ...prev,
      {
        day: entryForm.day,
        period: Number(entryForm.period || 1),
        className: entryForm.className,
        subject: entryForm.subject,
        teacher: entryForm.teacherId,
        startTime: entryForm.startTime,
        endTime: entryForm.endTime,
      },
    ]);
  }

  async function publishManual() {
    if (!manualEntries.length) return Alert.alert('No entries', 'Add timetable entries first.');
    setPublishingManual(true);
    try {
      await apiRequest('/admin/timetable/manual', {
        method: 'POST',
        body: {
          title: 'Manual Class Timetable',
          entries: manualEntries,
        },
      });
      setManualEntries([]);
      await load();
      Alert.alert('Success', 'Manual timetable published.');
    } catch (error) {
      Alert.alert('Publish failed', error.message);
    } finally {
      setPublishingManual(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleClass(name) {
    setSelectedClasses((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  }

  async function generate() {
    setGenerating(true);
    try {
      await apiRequest('/admin/timetable/generate', {
        method: 'POST',
        body: {
          classes: selectedClasses,
          days,
          periodsPerDay: Number(periodsPerDay || 6),
          startHour: Number(startHour || 8),
        },
      });
      Alert.alert('Success', 'Timetable generated and shared');
      await load();
    } catch (error) {
      Alert.alert('Generate failed', error.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AdminShell title="AI Timetable" subtitle="Generate, publish, and monitor the active timetable version.">
      <AnimatedCard delay={50}>
        <SectionTitle>Generate Timetable</SectionTitle>
        <Text style={adminFieldStyles.label}>Classes</Text>
        <View style={adminFieldStyles.chips}>
          {options.classes.map((c) => {
            const active = selectedClasses.includes(c.name);
            return (
              <Pressable key={String(c.id)} style={[adminFieldStyles.chip, active && adminFieldStyles.chipActive]} onPress={() => toggleClass(c.name)}>
                <Text style={[adminFieldStyles.chipText, active && adminFieldStyles.chipTextActive]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          style={adminFieldStyles.input}
          placeholder="Days CSV"
          value={days.join(',')}
          onChangeText={(v) => setDays(v.split(',').map((x) => x.trim()).filter(Boolean))}
        />
        <TextInput style={adminFieldStyles.input} placeholder="Periods per day" keyboardType="number-pad" value={periodsPerDay} onChangeText={setPeriodsPerDay} />
        <TextInput style={adminFieldStyles.input} placeholder="Start hour" keyboardType="number-pad" value={startHour} onChangeText={setStartHour} />

        <LoadingButton label="Generate & Publish" busyLabel="Generating timetable..." loading={generating} onPress={generate} disabled={loading} color="#4f46e5" />
      </AnimatedCard>

      <AnimatedCard delay={120}>
        <SectionTitle>Manual Class Timetable</SectionTitle>
        <SelectField
          label="Day"
          value={entryForm.day}
          options={DEFAULT_DAYS.map((d) => ({ value: d, label: d }))}
          onChange={(value) => setEntryForm((prev) => ({ ...prev, day: String(value) }))}
        />
        <TextInput style={adminFieldStyles.input} placeholder="Period" keyboardType="number-pad" value={entryForm.period} onChangeText={(v) => setEntryForm((prev) => ({ ...prev, period: v }))} />
        <SelectField
          label="Class"
          value={entryForm.className}
          options={options.classes.map((c) => ({ value: c.name, label: c.name }))}
          onChange={(value) => setEntryForm((prev) => ({ ...prev, className: String(value) }))}
        />
        <SelectField
          label="Lesson"
          value={entryForm.subject}
          options={options.lessonDetails.map((l) => ({ value: l.name, label: l.name }))}
          onChange={(value) => setEntryForm((prev) => ({ ...prev, subject: String(value) }))}
        />
        <SelectField
          label="Teacher"
          value={options.teachers.find((t) => String(t.id) === String(entryForm.teacherId))?.fullName || ''}
          options={options.teachers.map((t) => ({ value: String(t.id), label: t.fullName }))}
          onChange={(value) => setEntryForm((prev) => ({ ...prev, teacherId: String(value) }))}
        />
        <TextInput style={adminFieldStyles.input} placeholder="Start time HH:mm" value={entryForm.startTime} onChangeText={(v) => setEntryForm((prev) => ({ ...prev, startTime: v }))} />
        <TextInput style={adminFieldStyles.input} placeholder="End time HH:mm" value={entryForm.endTime} onChangeText={(v) => setEntryForm((prev) => ({ ...prev, endTime: v }))} />
        <Pressable style={styles.addBtn} onPress={addManualEntry}>
          <Text style={styles.addBtnText}>Add Entry</Text>
        </Pressable>
        {manualEntries.map((entry, index) => (
          <View key={`${entry.day}-${entry.className}-${entry.period}-${index}`} style={styles.entryRow}>
            <Text style={styles.info}>{entry.className} | {entry.day} P{entry.period}</Text>
            <Text style={styles.info}>{entry.subject} | {entry.startTime}-{entry.endTime}</Text>
          </View>
        ))}
        <LoadingButton
          label="Publish Manual Timetable"
          busyLabel="Publishing..."
          loading={publishingManual}
          onPress={publishManual}
          disabled={generating || loading}
          color="#0f766e"
        />
      </AnimatedCard>

      <AnimatedCard delay={160}>
        <SectionTitle>Current Timetable</SectionTitle>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={adminColors.accent} />
            <Text style={styles.loadingText}>Loading current timetable...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.info}>Version: {current?.version || 'N/A'}</Text>
            <Text style={styles.info}>Entries: {Array.isArray(current?.entries) ? current.entries.length : 0}</Text>
            <Text style={styles.info}>Title: {current?.title || '-'}</Text>
            {Array.isArray(current?.entries)
              ? current.entries.slice(0, 10).map((entry, index) => (
                  <Text key={`${entry.day}-${entry.className}-${index}`} style={styles.info}>
                    {entry.className} {entry.day} P{entry.period} | {entry.subject} | {entry.teacherInitials || '--'}
                  </Text>
                ))
              : null}
          </>
        )}
      </AnimatedCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  loadingText: {
    color: adminColors.body,
    fontWeight: '600',
  },
  info: {
    color: '#334155',
    fontWeight: '600',
  },
  addBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
  entryRow: {
    borderWidth: 1,
    borderColor: '#dbe3f0',
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#f8fafc',
    gap: 2,
  },
});
