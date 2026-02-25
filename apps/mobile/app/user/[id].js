import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../../services/api';

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString();
}

function initials(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

export default function MessageUserProfilePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function run() {
      if (!id) return;
      try {
        setLoading(true);
        setError('');
        const data = await apiRequest(`/messages/profile/${id}`);
        if (active) setProfile(data || null);
      } catch (e) {
        if (active) setError(e.message || 'Failed to load profile');
      } finally {
        if (active) setLoading(false);
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [id]);

  const name = useMemo(() => profile?.fullName || 'Profile', [profile]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: Math.max(14, insets.top + 8), paddingBottom: Math.max(16, insets.bottom + 12) }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>User Profile</Text>
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color="#2563eb" />
          <Text style={styles.stateText}>Loading profile...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            {profile?.profilePicture ? (
              <Image source={{ uri: profile.profilePicture }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{initials(name)}</Text>
              </View>
            )}
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.role}>{String(profile?.role || '').toUpperCase()}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Info</Text>
            <InfoRow label="Username" value={profile?.username} />
            <InfoRow label="Email" value={profile?.email} />
            <InfoRow label="Phone" value={profile?.phoneNumber} />
          </View>

          {profile?.teacherInfo ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Teacher Details</Text>
              <InfoRow label="Classes" value={(profile.teacherInfo.classes || []).join(', ')} />
              <InfoRow label="Lessons" value={(profile.teacherInfo.subjects || []).join(', ')} />
            </View>
          ) : null}

          {Array.isArray(profile?.children) ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assigned Kids</Text>
              {!profile.children.length ? <Text style={styles.emptyText}>No assigned children.</Text> : null}
              {profile.children.map((child) => (
                <View key={String(child.id || child.studentId)} style={styles.childCard}>
                  <Text style={styles.childName}>{child.fullName}</Text>
                  <Text style={styles.childMeta}>
                    {child.studentId ? `${child.studentId} - ` : ''}
                    {child.grade || '-'} {child.section || ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {profile?.studentInfo ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Student Details</Text>
                <InfoRow label="Student ID" value={profile.studentInfo.studentId} />
                <InfoRow label="Class" value={`${profile.studentInfo.grade || '-'} ${profile.studentInfo.section || ''}`} />
                <InfoRow label="Date of Birth" value={formatDate(profile.studentInfo.dateOfBirth)} />
                <InfoRow label="Gender" value={profile.studentInfo.gender} />
                <InfoRow label="Blood Group" value={profile.studentInfo.bloodGroup} />
                <InfoRow label="Academic Year" value={profile.studentInfo.academicYear} />
                <InfoRow label="GPA" value={String(profile.studentInfo.performance?.gpa ?? '-')} />
                <InfoRow label="Overall Grade" value={profile.studentInfo.performance?.overallGrade} />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Parents</Text>
                {!profile.studentInfo.parents?.length ? <Text style={styles.emptyText}>No parent linked.</Text> : null}
                {(profile.studentInfo.parents || []).map((entry, idx) => (
                  <View key={`${entry?.parent?.id || idx}`} style={styles.childCard}>
                    <Text style={styles.childName}>{entry?.parent?.fullName || '-'}</Text>
                    <Text style={styles.childMeta}>
                      {entry?.relationship || 'guardian'} - {entry?.parent?.phoneNumber || '-'}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef3ff',
    paddingHorizontal: 14,
  },
  header: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  backBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  stateBox: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  stateText: {
    color: '#334155',
    fontWeight: '600',
  },
  errorText: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  card: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe7ff',
    padding: 14,
    alignItems: 'center',
  },
  avatarImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#c7d2fe',
  },
  avatarFallback: {
    width: 82,
    height: 82,
    borderRadius: 41,
    marginBottom: 8,
    backgroundColor: '#e2e8f0',
    borderWidth: 2,
    borderColor: '#c7d2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 24,
  },
  name: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 22,
    textAlign: 'center',
  },
  role: {
    marginTop: 2,
    color: '#475569',
    fontWeight: '700',
  },
  section: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe7ff',
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  infoRow: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fbff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  infoLabel: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 12,
  },
  infoValue: {
    color: '#0f172a',
    fontWeight: '700',
    marginTop: 2,
  },
  childCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fbff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  childName: {
    color: '#0f172a',
    fontWeight: '800',
  },
  childMeta: {
    color: '#475569',
    marginTop: 2,
    fontSize: 12,
  },
  emptyText: {
    color: '#64748b',
    fontWeight: '600',
  },
});
