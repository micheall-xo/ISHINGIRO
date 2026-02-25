import { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../../services/api';
import SelectField from '../../components/SelectField';
import { AdminShell, AnimatedCard, SectionTitle, LoadingButton, adminFieldStyles, adminColors, EmptyState } from '../../components/admin/AdminUI';

export default function AdminClassesPage() {
  const [classes, setClasses] = useState([]);
  const [options, setOptions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [name, setName] = useState('');
  const [selectedLessons, setSelectedLessons] = useState([]);
  const [lessonName, setLessonName] = useState('');
  const [lessonClasses, setLessonClasses] = useState([]);
  const [lessonTeachers, setLessonTeachers] = useState([]);
  const [editingClassId, setEditingClassId] = useState('');
  const [editingClassName, setEditingClassName] = useState('');
  const [editingLessons, setEditingLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingLesson, setCreatingLesson] = useState(false);
  const [saving, setSaving] = useState(false);

  const editingClass = useMemo(
    () => classes.find((c) => String(c._id) === String(editingClassId)) || null,
    [classes, editingClassId]
  );

  async function load() {
    try {
      setLoading(true);
      const [classList, adminOptions, lessonList] = await Promise.all([
        apiRequest('/admin/classes'),
        apiRequest('/admin/options'),
        apiRequest('/admin/lessons'),
      ]);
      setClasses(Array.isArray(classList) ? classList : []);
      setOptions(Array.isArray(adminOptions?.lessons) ? adminOptions.lessons : []);
      setTeachers(Array.isArray(adminOptions?.teachers) ? adminOptions.teachers : []);
      setLessons(Array.isArray(lessonList) ? lessonList : []);
    } catch (error) {
      Alert.alert('Load failed', error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleLesson(list, lesson) {
    return list.includes(lesson) ? list.filter((x) => x !== lesson) : [...list, lesson];
  }

  async function createClass() {
    if (!name.trim()) return Alert.alert('Class name required');
    setCreating(true);
    try {
      await apiRequest('/admin/classes', {
        method: 'POST',
        body: { name: name.trim(), lessons: selectedLessons },
      });
      setName('');
      setSelectedLessons([]);
      await load();
      Alert.alert('Success', 'Class created');
    } catch (error) {
      Alert.alert('Create failed', error.message);
    } finally {
      setCreating(false);
    }
  }

  async function createLesson() {
    if (!lessonName.trim()) return Alert.alert('Lesson name required');
    setCreatingLesson(true);
    try {
      await apiRequest('/admin/lessons', {
        method: 'POST',
        body: {
          name: lessonName.trim(),
          classNames: lessonClasses,
          teacherIds: lessonTeachers,
        },
      });
      setLessonName('');
      setLessonClasses([]);
      setLessonTeachers([]);
      await load();
      Alert.alert('Success', 'Lesson created and assigned');
    } catch (error) {
      Alert.alert('Create lesson failed', error.message);
    } finally {
      setCreatingLesson(false);
    }
  }

  async function updateClass() {
    if (!editingClassId) return Alert.alert('Select a class to update');
    setSaving(true);
    try {
      await apiRequest(`/admin/classes/${editingClassId}`, {
        method: 'PUT',
        body: {
          name: editingClassName.trim() || editingClass?.name,
          lessons: editingLessons,
        },
      });
      await load();
      Alert.alert('Success', 'Class updated');
    } catch (error) {
      Alert.alert('Update failed', error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Classes & Lessons" subtitle="Create classes, define lessons, and keep structure clean.">
      <AnimatedCard delay={50}>
        <SectionTitle>Create Lesson</SectionTitle>
        <TextInput style={adminFieldStyles.input} placeholder="Lesson name (e.g. Mathematics)" value={lessonName} onChangeText={setLessonName} />
        <Text style={adminFieldStyles.label}>Assign to Classes</Text>
        <View style={adminFieldStyles.chips}>
          {classes.map((classDoc) => {
            const active = lessonClasses.includes(classDoc.name);
            return (
              <Pressable key={`lesson-class-${classDoc._id}`} style={[adminFieldStyles.chip, active && adminFieldStyles.chipActive]} onPress={() => setLessonClasses((prev) => toggleLesson(prev, classDoc.name))}>
                <Text style={[adminFieldStyles.chipText, active && adminFieldStyles.chipTextActive]}>{classDoc.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={adminFieldStyles.label}>Assign to Teachers</Text>
        <View style={adminFieldStyles.chips}>
          {teachers.map((teacher) => {
            const active = lessonTeachers.includes(String(teacher.id));
            return (
              <Pressable
                key={`lesson-teacher-${teacher.id}`}
                style={[adminFieldStyles.chip, active && adminFieldStyles.chipActive]}
                onPress={() => setLessonTeachers((prev) => (active ? prev.filter((x) => x !== String(teacher.id)) : [...prev, String(teacher.id)]))}
              >
                <Text style={[adminFieldStyles.chipText, active && adminFieldStyles.chipTextActive]}>{teacher.fullName}</Text>
              </Pressable>
            );
          })}
        </View>
        <LoadingButton label="Create Lesson" busyLabel="Creating lesson..." loading={creatingLesson} onPress={createLesson} disabled={creating || saving} color="#0f766e" />
      </AnimatedCard>

      <AnimatedCard delay={90}>
        <SectionTitle>Create Class</SectionTitle>
        <TextInput style={adminFieldStyles.input} placeholder="Class name (e.g. 10A)" value={name} onChangeText={setName} />
        <Text style={adminFieldStyles.label}>Lessons</Text>
        <View style={adminFieldStyles.chips}>
          {options.map((lesson) => {
            const active = selectedLessons.includes(lesson);
            return (
              <Pressable key={lesson} style={[adminFieldStyles.chip, active && adminFieldStyles.chipActive]} onPress={() => setSelectedLessons((prev) => toggleLesson(prev, lesson))}>
                <Text style={[adminFieldStyles.chipText, active && adminFieldStyles.chipTextActive]}>{lesson}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          style={adminFieldStyles.input}
          placeholder="Add lesson manually and press Enter"
          onSubmitEditing={(e) => {
            const lesson = e.nativeEvent.text.trim();
            if (!lesson) return;
            if (!options.includes(lesson)) setOptions((prev) => [...prev, lesson]);
            setSelectedLessons((prev) => (prev.includes(lesson) ? prev : [...prev, lesson]));
          }}
        />
        <LoadingButton label="Create Class" busyLabel="Creating class..." loading={creating} onPress={createClass} disabled={saving} color="#4f46e5" />
      </AnimatedCard>

      <AnimatedCard delay={130}>
        <SectionTitle>Update Existing Class</SectionTitle>
        <SelectField
          label="Class"
          value={editingClass?.name || ''}
          options={classes.map((c) => ({ value: String(c._id), label: c.name }))}
          onChange={(val) => {
            const picked = classes.find((c) => String(c._id) === String(val));
            setEditingClassId(String(val));
            setEditingClassName(picked?.name || '');
            setEditingLessons(Array.isArray(picked?.lessons) ? picked.lessons : []);
          }}
        />
        <TextInput style={adminFieldStyles.input} placeholder="Class name" value={editingClassName} onChangeText={setEditingClassName} />
        <Text style={adminFieldStyles.label}>Lessons</Text>
        <View style={adminFieldStyles.chips}>
          {options.map((lesson) => {
            const active = editingLessons.includes(lesson);
            return (
              <Pressable key={`edit-${lesson}`} style={[adminFieldStyles.chip, active && adminFieldStyles.chipActive]} onPress={() => setEditingLessons((prev) => toggleLesson(prev, lesson))}>
                <Text style={[adminFieldStyles.chipText, active && adminFieldStyles.chipTextActive]}>{lesson}</Text>
              </Pressable>
            );
          })}
        </View>
        <LoadingButton label="Save Class" busyLabel="Saving class..." loading={saving} onPress={updateClass} disabled={creating} color="#2563eb" />
      </AnimatedCard>

      <AnimatedCard delay={170}>
        <SectionTitle>Current Lessons</SectionTitle>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={adminColors.accent} />
            <Text style={styles.loadingText}>Loading lessons...</Text>
          </View>
        ) : lessons.length ? (
          lessons.map((lesson) => (
            <View key={String(lesson.id)} style={styles.row}>
              <Text style={styles.rowTitle}>{lesson.name}</Text>
              <Text style={styles.rowMeta}>Classes: {(lesson.classNames || []).join(', ') || '-'}</Text>
              <Text style={styles.rowMeta}>Teachers: {(lesson.teachers || []).map((t) => t.fullName).join(', ') || '-'}</Text>
            </View>
          ))
        ) : (
          <EmptyState message="No lessons yet. Create lessons above." />
        )}
      </AnimatedCard>

      <AnimatedCard delay={210}>
        <SectionTitle>Current Classes</SectionTitle>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={adminColors.accent} />
            <Text style={styles.loadingText}>Loading classes...</Text>
          </View>
        ) : classes.length ? (
          classes.map((c) => (
            <View key={String(c._id)} style={styles.row}>
              <Text style={styles.rowTitle}>{c.name}</Text>
              <Text style={styles.rowMeta}>{Array.isArray(c.lessons) ? c.lessons.join(', ') : ''}</Text>
            </View>
          ))
        ) : (
          <EmptyState message="No classes yet. Create your first class above." />
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
  row: {
    borderBottomWidth: 1,
    borderBottomColor: '#edf2fb',
    paddingVertical: 9,
  },
  rowTitle: {
    color: '#1e293b',
    fontWeight: '800',
  },
  rowMeta: {
    color: '#5b6474',
    marginTop: 3,
    fontSize: 12,
  },
});
