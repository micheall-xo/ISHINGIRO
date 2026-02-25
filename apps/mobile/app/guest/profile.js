import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '../../services/api';

export default function ParentProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest('/auth/profile');
        setProfile(data);
      } catch (error) {
        console.error('Failed to load parent profile:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const initials = useMemo(() => {
    const first = String(profile?.firstName || '').slice(0, 1);
    const last = String(profile?.lastName || '').slice(0, 1);
    return (first + last).toUpperCase() || 'PR';
  }, [profile]);

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
        <View style={styles.avatar}>
          {profile?.profilePicture ? (
            <Image source={{ uri: profile.profilePicture }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        <Text style={styles.name}>{profile?.fullName || 'Parent'}</Text>
        <Text style={styles.meta}>{profile?.email || '-'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Details</Text>
        <Line label="Username" value={profile?.username} />
        <Line label="Phone" value={profile?.phoneNumber} />
        <Line label="Role" value={profile?.role} />
      </View>

      <Pressable style={styles.button} onPress={() => router.push('/profile-edit')}>
        <Text style={styles.buttonText}>Edit Profile</Text>
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
  hero: { backgroundColor: '#0f766e', borderRadius: 14, padding: 16, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#115e59', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  name: { color: '#fff', fontWeight: '800', fontSize: 20 },
  meta: { color: '#ccfbf1', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, gap: 8 },
  cardTitle: { fontWeight: '800', fontSize: 16, color: '#0f172a' },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { color: '#475569', fontWeight: '600' },
  value: { color: '#0f172a', marginTop: 2 },
  button: { backgroundColor: '#0f766e', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: '#64748b' },
});
