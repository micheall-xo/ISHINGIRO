import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '../../services/api';

export default function TeacherProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest('/auth/profile');
        setProfile(data);
      } catch (error) {
        console.error('Failed to load teacher profile:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const initials = useMemo(() => {
    const first = String(profile?.firstName || '').slice(0, 1);
    const last = String(profile?.lastName || '').slice(0, 1);
    return (first + last).toUpperCase() || 'TC';
  }, [profile]);

  const classList = Array.isArray(profile?.teacherProfile?.classes) ? profile.teacherProfile.classes : [];
  const subjectList = Array.isArray(profile?.teacherProfile?.subjects) ? profile.teacherProfile.subjects : [];

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        <Text style={styles.name}>{profile?.fullName || 'Teacher'}</Text>
        <Text style={styles.meta}>{profile?.email || '-'}</Text>
        <Text style={styles.meta}>{profile?.phoneNumber || '-'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Line label="Username" value={profile?.username} />
        <Line label="Role" value={profile?.role} />
        <Line label="Last Login" value={profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : '-'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Teaching Assignment</Text>
        <Line label="Classes" value={classList.length ? classList.join(', ') : 'None assigned'} />
        <Line label="Lessons" value={subjectList.length ? subjectList.join(', ') : 'None assigned'} />
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.button} onPress={() => router.push('/teacher/profile-edit')}>
          <Text style={styles.buttonText}>Edit Profile</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/notifications')}>
          <Text style={styles.secondaryButtonText}>Notifications</Text>
        </Pressable>
      </View>
      <Pressable
        style={styles.outlineButton}
        onPress={() => Alert.alert('Teacher Profile', 'Privacy and account settings can be expanded here next.')}
      >
        <Text style={styles.outlineButtonText}>Account Settings</Text>
      </Pressable>
    </ScrollView>
  );
}

function Line({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 12 },
  hero: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 22 },
  name: { color: '#fff', fontWeight: '800', fontSize: 20 },
  meta: { color: '#cbd5e1', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { color: '#475569', fontWeight: '600' },
  value: { color: '#0f172a', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8 },
  button: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800' },
  secondaryButton: { flex: 1, backgroundColor: '#0f766e', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#fff', fontWeight: '800' },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  outlineButtonText: { color: '#334155', fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  muted: { color: '#64748b' },
});
