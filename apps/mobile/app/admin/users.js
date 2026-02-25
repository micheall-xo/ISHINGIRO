import { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiRequest } from '../../services/api';
import { AdminShell, AnimatedCard, SectionTitle, LoadingButton, adminFieldStyles, adminColors, EmptyState } from '../../components/admin/AdminUI';

const EMPTY = {
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  profilePicture: '',
  className: '',
  studentId: '',
  grade: '',
  section: '',
  gender: '',
  dateOfBirth: '',
};

function initialsFromName(firstName, lastName, username) {
  const first = String(firstName || '').trim().charAt(0);
  const last = String(lastName || '').trim().charAt(0);
  const combined = `${first}${last}`.toUpperCase();
  if (combined.trim()) return combined;
  return String(username || 'U').trim().charAt(0).toUpperCase();
}

function toDateOnly(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function looksLikeSecret(value) {
  const v = String(value || '').trim();
  if (!v) return false;
  // bcrypt/argon/scrypt style prefixes or JWT-like token.
  if (/^\$2[aby]\$\d{2}\$/.test(v)) return true;
  if (/^\$argon2/i.test(v)) return true;
  if (/^\$s\d+\$/.test(v)) return true;
  if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(v)) return true;
  return false;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState('teacher');
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    profilePicture: '',
    password: '',
    teacherClasses: '',
    teacherSubjects: '',
    className: '',
    studentId: '',
    grade: '',
    section: '',
    gender: '',
    dateOfBirth: '',
  });

  async function load() {
    try {
      setLoading(true);
      const roleFilter = String(params.role || '').trim().toLowerCase();
      const path = ['teacher', 'parent', 'student', 'admin'].includes(roleFilter)
        ? `/admin/users?role=${roleFilter}`
        : '/admin/users';
      const list = await apiRequest(path);
      setUsers(Array.isArray(list) ? list : []);
    } catch (error) {
      Alert.alert('Load users failed', error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [params.role]);

  const roleFilterTitle = useMemo(() => {
    const roleFilter = String(params.role || '').trim().toLowerCase();
    if (!['teacher', 'parent', 'student', 'admin'].includes(roleFilter)) return 'All Users';
    return `${roleFilter.charAt(0).toUpperCase()}${roleFilter.slice(1)}s`;
  }, [params.role]);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [users]
  );
  const isSmallScreen = width < 430 || height < 820;
  const maxVisibleUsers = isSmallScreen ? 8 : 200;

  const filteredUsers = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return sortedUsers;
    return sortedUsers.filter((u) => {
      const fields = [
        u.firstName,
        u.lastName,
        u.username,
        u.email,
        u.role,
        u._id,
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ');
      return fields.includes(q);
    });
  }, [query, sortedUsers]);
  const visibleUsers = useMemo(() => filteredUsers.slice(0, maxVisibleUsers), [filteredUsers, maxVisibleUsers]);

  async function createUser() {
    const required = ['username', 'email', 'password', 'firstName', 'lastName'];
    for (const key of required) {
      if (!String(form[key] || '').trim()) return Alert.alert('Missing field', key);
    }

    if (role === 'student' && !String(form.className || '').trim() && !String(form.grade || '').trim()) {
      return Alert.alert('Missing field', 'Class name or grade is required for student');
    }

    setCreating(true);
    try {
      await apiRequest('/admin/users', {
        method: 'POST',
        body: { ...form, role },
      });
      setForm(EMPTY);
      await load();
      Alert.alert('Success', `${role} created`);
    } catch (error) {
      Alert.alert('Create failed', error.message);
    } finally {
      setCreating(false);
    }
  }

  async function openUserDetails(userId) {
    try {
      setSelectedUserId(String(userId));
      setDetailLoading(true);
      const details = await apiRequest(`/admin/users/${userId}`);
      setDetailData(details);

      const teacherClasses = Array.isArray(details?.teacherDetails?.classes) ? details.teacherDetails.classes.join(',') : '';
      const teacherSubjects = Array.isArray(details?.teacherDetails?.subjects) ? details.teacherDetails.subjects.join(',') : '';
      setEditForm({
        username: details?.user?.username || '',
        email: details?.user?.email || '',
        firstName: details?.user?.firstName || '',
        lastName: details?.user?.lastName || '',
        phoneNumber: details?.user?.phoneNumber || '',
        profilePicture: looksLikeSecret(details?.user?.profilePicture) ? '' : (details?.user?.profilePicture || ''),
        password: '',
        teacherClasses,
        teacherSubjects,
        className: details?.studentDetails?.className || '',
        studentId: details?.studentDetails?.studentId || '',
        grade: details?.studentDetails?.grade || '',
        section: details?.studentDetails?.section || '',
        gender: details?.studentDetails?.gender || '',
        dateOfBirth: toDateOnly(details?.studentDetails?.dateOfBirth),
      });
    } catch (error) {
      Alert.alert('User details failed', error.message || 'Failed to fetch user details');
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveSelectedUser() {
    if (!selectedUserId || !detailData?.user) return;

    setSaving(true);
    try {
      const body = {
        username: editForm.username,
        email: editForm.email,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phoneNumber: editForm.phoneNumber,
        profilePicture: editForm.profilePicture,
        password: editForm.password,
      };

      if (detailData.user.role === 'teacher') {
        body.teacherClasses = String(editForm.teacherClasses || '')
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
        body.teacherSubjects = String(editForm.teacherSubjects || '')
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
      }

      if (detailData.user.role === 'student') {
        body.className = editForm.className;
        body.studentId = editForm.studentId;
        body.grade = editForm.grade;
        body.section = editForm.section;
        body.gender = editForm.gender;
        body.dateOfBirth = editForm.dateOfBirth;
      }

      await apiRequest(`/admin/users/${selectedUserId}`, {
        method: 'PUT',
        body,
      });

      await load();
      await openUserDetails(selectedUserId);
      Alert.alert('Success', 'User updated');
    } catch (error) {
      Alert.alert('Update failed', error.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  function closeEditor() {
    setSelectedUserId('');
    setDetailData(null);
    setDetailLoading(false);
  }

  const selectedRole = detailData?.user?.role || '';

  return (
    <AdminShell title="User Management" subtitle="Create, search, inspect and edit users from a clean card-based directory.">
      <AnimatedCard delay={50}>
        <View style={styles.headerRow}>
          <SectionTitle>Create User</SectionTitle>
          <Pressable style={styles.requestLinkBtn} onPress={() => router.push('/admin/edit-requests')}>
            <Text style={styles.requestLinkText}>Open Edit Requests</Text>
          </Pressable>
        </View>

        <View style={styles.roles}>
          {['teacher', 'parent', 'student', 'admin'].map((r) => (
            <Pressable key={r} style={[styles.roleBtn, role === r && styles.roleBtnActive]} onPress={() => setRole(r)}>
              <Text style={[styles.roleText, role === r && styles.roleTextActive]}>{r}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput style={adminFieldStyles.input} placeholder="Username" value={form.username} onChangeText={(v) => setForm((p) => ({ ...p, username: v }))} />
        <TextInput style={adminFieldStyles.input} placeholder="Email" autoCapitalize="none" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
        <TextInput style={adminFieldStyles.input} placeholder="First Name" value={form.firstName} onChangeText={(v) => setForm((p) => ({ ...p, firstName: v }))} />
        <TextInput style={adminFieldStyles.input} placeholder="Last Name" value={form.lastName} onChangeText={(v) => setForm((p) => ({ ...p, lastName: v }))} />
        <TextInput style={adminFieldStyles.input} placeholder="Phone Number" value={form.phoneNumber} onChangeText={(v) => setForm((p) => ({ ...p, phoneNumber: v }))} />
        <TextInput style={adminFieldStyles.input} placeholder="Profile Picture URL (optional)" value={form.profilePicture} onChangeText={(v) => setForm((p) => ({ ...p, profilePicture: v }))} />

        {role === 'student' ? (
          <>
            <TextInput style={adminFieldStyles.input} placeholder="Class Name (e.g. L5A)" value={form.className} onChangeText={(v) => setForm((p) => ({ ...p, className: v }))} />
            <TextInput style={adminFieldStyles.input} placeholder="Student ID (optional)" value={form.studentId} onChangeText={(v) => setForm((p) => ({ ...p, studentId: v }))} />
            <TextInput style={adminFieldStyles.input} placeholder="Grade (optional)" value={form.grade} onChangeText={(v) => setForm((p) => ({ ...p, grade: v }))} />
            <TextInput style={adminFieldStyles.input} placeholder="Section (optional)" value={form.section} onChangeText={(v) => setForm((p) => ({ ...p, section: v }))} />
            <TextInput style={adminFieldStyles.input} placeholder="Gender (male/female/other)" value={form.gender} onChangeText={(v) => setForm((p) => ({ ...p, gender: v }))} />
            <TextInput style={adminFieldStyles.input} placeholder="Date of Birth (YYYY-MM-DD)" value={form.dateOfBirth} onChangeText={(v) => setForm((p) => ({ ...p, dateOfBirth: v }))} />
          </>
        ) : null}

        <TextInput style={adminFieldStyles.input} placeholder="Password" secureTextEntry value={form.password} onChangeText={(v) => setForm((p) => ({ ...p, password: v }))} />
        <LoadingButton label={`Create ${role}`} busyLabel="Creating user..." loading={creating} onPress={createUser} color="#4f46e5" />
      </AnimatedCard>

      <AnimatedCard delay={120}>
        <View style={styles.directoryHeader}>
          <SectionTitle>{roleFilterTitle}</SectionTitle>
          <Pressable style={styles.clearFilterBtn} onPress={() => router.push('/admin/users')}>
            <Text style={styles.clearFilterText}>Show All</Text>
          </Pressable>
        </View>
        <TextInput
          style={[adminFieldStyles.input, styles.searchInput]}
          placeholder="Search by name, username, email, role, or id"
          value={query}
          onChangeText={setQuery}
        />
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={adminColors.accent} />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : filteredUsers.length ? (
          <View style={styles.cardGrid}>
            {visibleUsers.map((u) => (
              <Pressable
                key={String(u._id)}
                style={[styles.userCard, isSmallScreen && styles.userCardSmall, selectedUserId === String(u._id) && styles.userCardActive]}
                onPress={() => openUserDetails(u._id)}
              >
                <View style={styles.avatarWrap}>
                  {u.profilePicture ? (
                    <Image source={{ uri: u.profilePicture }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>
                        {initialsFromName(u.firstName, u.lastName, u.username)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.userName}>{u.firstName} {u.lastName}</Text>
                <Text style={styles.userMeta}>{u.role}</Text>
                <Text style={styles.userMeta}>{u.email}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState message="No users found." />
        )}
        {!loading && filteredUsers.length > maxVisibleUsers ? (
          <Text style={styles.listHint}>
            Showing first {maxVisibleUsers} users on this screen size. Use search to find others quickly.
          </Text>
        ) : null}
      </AnimatedCard>

      <Modal visible={Boolean(selectedUserId)} transparent animationType="fade" onRequestClose={closeEditor}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <Pressable style={styles.closeBtn} onPress={closeEditor}>
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>
            {detailLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={adminColors.accent} />
                <Text style={styles.loadingText}>Loading selected user...</Text>
              </View>
            ) : detailData?.user ? (
              <ScrollView style={styles.modalBody} contentContainerStyle={styles.detailWrap} showsVerticalScrollIndicator={false}>
                <Text style={styles.detailRole}>Role: {detailData.user.role}</Text>
                <TextInput style={adminFieldStyles.input} placeholder="Username" value={editForm.username} onChangeText={(v) => setEditForm((p) => ({ ...p, username: v }))} />
                <TextInput style={adminFieldStyles.input} placeholder="Email" value={editForm.email} onChangeText={(v) => setEditForm((p) => ({ ...p, email: v }))} />
              <TextInput style={adminFieldStyles.input} placeholder="First Name" value={editForm.firstName} onChangeText={(v) => setEditForm((p) => ({ ...p, firstName: v }))} />
              <TextInput style={adminFieldStyles.input} placeholder="Last Name" value={editForm.lastName} onChangeText={(v) => setEditForm((p) => ({ ...p, lastName: v }))} />
              <TextInput style={adminFieldStyles.input} placeholder="Phone Number" value={editForm.phoneNumber} onChangeText={(v) => setEditForm((p) => ({ ...p, phoneNumber: v }))} />
              <TextInput
                style={adminFieldStyles.input}
                placeholder="Profile Picture URL"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                value={editForm.profilePicture}
                onChangeText={(v) => setEditForm((p) => ({ ...p, profilePicture: v }))}
              />
              <TextInput
                style={adminFieldStyles.input}
                placeholder="New Password (optional)"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                value={editForm.password}
                onChangeText={(v) => setEditForm((p) => ({ ...p, password: v }))}
              />

                {selectedRole === 'teacher' ? (
                  <>
                    <TextInput style={adminFieldStyles.input} placeholder="Classes CSV (e.g. L4A,L4B)" value={editForm.teacherClasses} onChangeText={(v) => setEditForm((p) => ({ ...p, teacherClasses: v }))} />
                    <TextInput style={adminFieldStyles.input} placeholder="Subjects CSV (e.g. Math,Physics)" value={editForm.teacherSubjects} onChangeText={(v) => setEditForm((p) => ({ ...p, teacherSubjects: v }))} />
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoTitle}>Current Class (Now)</Text>
                      {detailData.teacherDetails?.currentClass ? (
                        <Text style={styles.infoText}>
                          {detailData.teacherDetails.currentClass.className} | {detailData.teacherDetails.currentClass.subject} | {detailData.teacherDetails.currentClass.startTime}-{detailData.teacherDetails.currentClass.endTime}
                        </Text>
                      ) : (
                        <Text style={styles.infoText}>No active class right now.</Text>
                      )}
                    </View>
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoTitle}>Lessons Taught</Text>
                      {(detailData.teacherDetails?.lessons || []).length ? (
                        detailData.teacherDetails.lessons.map((lesson) => (
                          <Text key={String(lesson.id)} style={styles.infoText}>
                            {lesson.name} | {Array.isArray(lesson.classNames) ? lesson.classNames.join(', ') : '-'}
                          </Text>
                        ))
                      ) : (
                        <Text style={styles.infoText}>No lesson assignments yet.</Text>
                      )}
                    </View>
                  </>
                ) : null}

                {selectedRole === 'student' ? (
                  <>
                    <TextInput style={adminFieldStyles.input} placeholder="Class Name (e.g. L5A)" value={editForm.className} onChangeText={(v) => setEditForm((p) => ({ ...p, className: v }))} />
                    <TextInput style={adminFieldStyles.input} placeholder="Student ID" value={editForm.studentId} onChangeText={(v) => setEditForm((p) => ({ ...p, studentId: v }))} />
                    <TextInput style={adminFieldStyles.input} placeholder="Grade" value={editForm.grade} onChangeText={(v) => setEditForm((p) => ({ ...p, grade: v }))} />
                    <TextInput style={adminFieldStyles.input} placeholder="Section" value={editForm.section} onChangeText={(v) => setEditForm((p) => ({ ...p, section: v }))} />
                    <TextInput style={adminFieldStyles.input} placeholder="Gender (male/female/other)" value={editForm.gender} onChangeText={(v) => setEditForm((p) => ({ ...p, gender: v }))} />
                    <TextInput style={adminFieldStyles.input} placeholder="Date of Birth (YYYY-MM-DD)" value={editForm.dateOfBirth} onChangeText={(v) => setEditForm((p) => ({ ...p, dateOfBirth: v }))} />
                  </>
                ) : null}

                {selectedRole === 'parent' ? (
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoTitle}>Assigned Kids</Text>
                    {(detailData.parentDetails?.children || []).length ? (
                      detailData.parentDetails.children.map((kid) => (
                        <Text key={String(kid.id)} style={styles.infoText}>
                          {kid.fullName} | {kid.className || 'Unassigned'} | {kid.studentId}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.infoText}>No students assigned yet.</Text>
                    )}
                  </View>
                ) : null}

                <LoadingButton label="Save User Changes" busyLabel="Saving..." loading={saving} onPress={saveSelectedUser} color="#2563eb" />
              </ScrollView>
            ) : (
              <EmptyState message="Select a user card to load full details." />
            )}
          </View>
        </View>
      </Modal>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  requestLinkBtn: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  requestLinkText: {
    color: '#3730a3',
    fontWeight: '700',
    fontSize: 12,
  },
  roles: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#cfd8ea',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  roleBtnActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#667eea',
  },
  roleText: {
    color: '#475569',
    textTransform: 'capitalize',
    fontWeight: '700',
  },
  roleTextActive: {
    color: '#4338ca',
  },
  searchInput: {
    marginBottom: 8,
  },
  directoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  clearFilterBtn: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearFilterText: {
    color: '#3730a3',
    fontWeight: '700',
    fontSize: 12,
  },
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
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  userCard: {
    width: '48%',
    minWidth: 150,
    maxWidth: 220,
    borderWidth: 1,
    borderColor: '#dbe3f0',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 5,
  },
  userCardSmall: {
    minWidth: 138,
    padding: 10,
  },
  userCardActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontWeight: '800',
    color: '#334155',
    fontSize: 20,
  },
  userName: {
    color: '#0f172a',
    fontWeight: '800',
    textAlign: 'center',
  },
  userMeta: {
    color: '#5b6474',
    fontSize: 12,
    textAlign: 'center',
  },
  detailWrap: {
    gap: 8,
    paddingBottom: 16,
  },
  detailRole: {
    color: '#1e293b',
    fontWeight: '800',
  },
  infoBlock: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#eff6ff',
    gap: 4,
  },
  infoTitle: {
    color: '#1e40af',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  infoText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  listHint: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    backgroundColor: '#ffffff',
    padding: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeBtnText: {
    color: '#3730a3',
    fontWeight: '800',
    fontSize: 12,
  },
  modalBody: {
    flexGrow: 0,
  },
});
