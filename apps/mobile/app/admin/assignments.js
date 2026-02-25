import { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../../services/api';
import SelectField from '../../components/SelectField';
import { AdminShell, AnimatedCard, SectionTitle, LoadingButton, adminFieldStyles, adminColors } from '../../components/admin/AdminUI';

export default function AdminAssignmentsPage() {
  const [options, setOptions] = useState({ teachers: [], classes: [], lessons: [], parents: [], students: [] });
  const [teacherId, setTeacherId] = useState('');
  const [teacherClassNames, setTeacherClassNames] = useState([]);
  const [teacherLessons, setTeacherLessons] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [classStudentId, setClassStudentId] = useState('');
  const [className, setClassName] = useState('');
  const [parentId, setParentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [assigningClass, setAssigningClass] = useState(false);
  const [assigningParent, setAssigningParent] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await apiRequest('/admin/options');
      setOptions({
        teachers: Array.isArray(data?.teachers) ? data.teachers : [],
        classes: Array.isArray(data?.classes) ? data.classes : [],
        lessons: Array.isArray(data?.lessons) ? data.lessons : [],
        parents: Array.isArray(data?.parents) ? data.parents : [],
        students: Array.isArray(data?.students) ? data.students : [],
      });
    } catch (error) {
      Alert.alert('Load options failed', error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedTeacher = useMemo(
    () => options.teachers.find((t) => String(t.id) === String(teacherId)) || null,
    [options.teachers, teacherId]
  );

  function toggle(list, value) {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  async function saveTeacherAssignment() {
    if (!teacherId) return Alert.alert('Choose teacher');
    setSavingTeacher(true);
    try {
      await apiRequest(`/admin/teachers/${teacherId}/assignment`, {
        method: 'PUT',
        body: { classes: teacherClassNames, subjects: teacherLessons },
      });
      Alert.alert('Success', 'Teacher assignment updated');
      await load();
    } catch (error) {
      Alert.alert('Assignment failed', error.message);
    } finally {
      setSavingTeacher(false);
    }
  }

  async function assignParentToStudent() {
    if (!studentId || !parentId) return Alert.alert('Choose student and parent');
    setAssigningParent(true);
    try {
      await apiRequest(`/admin/students/${studentId}/assign-parent`, {
        method: 'POST',
        body: { parentUserId: parentId, relationship: 'guardian' },
      });
      Alert.alert('Success', 'Parent assigned to student');
      await load();
    } catch (error) {
      Alert.alert('Assign failed', error.message);
    } finally {
      setAssigningParent(false);
    }
  }

  async function assignStudentToClass() {
    if (!classStudentId || !className) return Alert.alert('Choose student and class');
    setAssigningClass(true);
    try {
      await apiRequest(`/admin/students/${classStudentId}/assign-class`, {
        method: 'POST',
        body: { className },
      });
      Alert.alert('Success', 'Student assigned to class');
      await load();
    } catch (error) {
      Alert.alert('Assign class failed', error.message);
    } finally {
      setAssigningClass(false);
    }
  }

  return (
    <AdminShell title="Assignments" subtitle="Map teachers to classes/lessons and assign each student to one parent.">
      <AnimatedCard delay={50}>
        <SectionTitle>Teacher Assignment</SectionTitle>

        <SelectField
          label="Teacher"
          value={selectedTeacher?.fullName || ''}
          options={options.teachers.map((t) => ({ value: String(t.id), label: t.fullName }))}
          onChange={(value) => {
            const next = options.teachers.find((t) => String(t.id) === String(value));
            setTeacherId(String(value));
            setTeacherClassNames(Array.isArray(next?.classes) ? next.classes : []);
            setTeacherLessons(Array.isArray(next?.subjects) ? next.subjects : []);
          }}
        />

        <Text style={adminFieldStyles.label}>Classes</Text>
        <View style={adminFieldStyles.chips}>
          {options.classes.map((c) => {
            const active = teacherClassNames.includes(c.name);
            return (
              <Pressable key={String(c.id)} style={[adminFieldStyles.chip, active && adminFieldStyles.chipActive]} onPress={() => setTeacherClassNames((prev) => toggle(prev, c.name))}>
                <Text style={[adminFieldStyles.chipText, active && adminFieldStyles.chipTextActive]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={adminFieldStyles.label}>Lessons</Text>
        <View style={adminFieldStyles.chips}>
          {options.lessons.map((lesson) => {
            const active = teacherLessons.includes(lesson);
            return (
              <Pressable key={lesson} style={[adminFieldStyles.chip, active && adminFieldStyles.chipActive]} onPress={() => setTeacherLessons((prev) => toggle(prev, lesson))}>
                <Text style={[adminFieldStyles.chipText, active && adminFieldStyles.chipTextActive]}>{lesson}</Text>
              </Pressable>
            );
          })}
        </View>

        <LoadingButton label="Save Teacher Assignment" busyLabel="Saving assignment..." loading={savingTeacher} onPress={saveTeacherAssignment} disabled={assigningParent || loading} color="#4f46e5" />
      </AnimatedCard>

      <AnimatedCard delay={120}>
        <SectionTitle>Student to Class</SectionTitle>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={adminColors.accent} />
            <Text style={styles.loadingText}>Loading data options...</Text>
          </View>
        ) : null}
        <SelectField
          label="Student"
          value={options.students.find((s) => String(s.id) === String(classStudentId))?.name || ''}
          options={options.students.map((s) => ({
            value: String(s.id),
            label: `${s.name} (${s.className})`,
            keywords: [s.studentId, s.userId, s.id, s.name, s.className],
          }))}
          onChange={(value) => setClassStudentId(String(value))}
        />
        <SelectField
          label="Class"
          value={className}
          options={options.classes.map((c) => ({ value: String(c.name), label: c.name }))}
          onChange={(value) => setClassName(String(value))}
        />
        <LoadingButton
          label="Assign Class"
          busyLabel="Assigning class..."
          loading={assigningClass}
          onPress={assignStudentToClass}
          disabled={savingTeacher || assigningParent || loading}
          color="#7c3aed"
        />
      </AnimatedCard>

      <AnimatedCard delay={170}>
        <SectionTitle>Parent to Student</SectionTitle>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={adminColors.accent} />
            <Text style={styles.loadingText}>Loading data options...</Text>
          </View>
        ) : null}
        <SelectField
          label="Student"
          value={options.students.find((s) => String(s.id) === String(studentId))?.name || ''}
          options={options.students.map((s) => ({
            value: String(s.id),
            label: `${s.name} (${s.className})`,
            keywords: [s.studentId, s.userId, s.id, s.name, s.className],
          }))}
          onChange={(value) => setStudentId(String(value))}
        />
        <SelectField
          label="Parent"
          value={options.parents.find((p) => String(p.id) === String(parentId))?.fullName || ''}
          options={options.parents.map((p) => ({ value: String(p.id), label: p.fullName }))}
          onChange={(value) => setParentId(String(value))}
        />
        <LoadingButton label="Assign Parent" busyLabel="Assigning parent..." loading={assigningParent} onPress={assignParentToStudent} disabled={savingTeacher || assigningClass || loading} color="#0891b2" />
      </AnimatedCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: 6,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  loadingText: {
    color: adminColors.body,
    fontWeight: '600',
  },
});
