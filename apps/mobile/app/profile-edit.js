import { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '../services/api';
import { AuthContext } from './_layout';

export default function ProfileEditScreen() {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState('');
  const [requestStatus, setRequestStatus] = useState(null);
  const [form, setForm] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    profilePicture: '',
    grade: '',
    section: '',
    gender: '',
    bloodGroup: '',
    academicYear: '',
    dateOfBirth: '',
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressZipCode: '',
    addressCountry: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    emergencyEmail: '',
    currentPassword: '',
    newPassword: '',
  });

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    (async () => {
      try {
        const [profile, latestRequest] = await Promise.all([
          apiRequest('/auth/profile'),
          apiRequest('/auth/profile-edit-request'),
        ]);
        const info = profile?.studentInfo || {};
        const addr = info.address || {};
        const emergency = info.emergencyContact || {};
        setRole(profile?.role || '');
        setRequestStatus(latestRequest?.request || profile?.pendingProfileEditRequest || null);
        setForm((p) => ({
          ...p,
          username: profile?.username || '',
          email: profile?.email || '',
          firstName: profile?.firstName || '',
          lastName: profile?.lastName || '',
          phoneNumber: profile?.phoneNumber || '',
          profilePicture: profile?.profilePicture || '',
          grade: info?.grade || '',
          section: info?.section || '',
          gender: info?.gender || '',
          bloodGroup: info?.bloodGroup || '',
          academicYear: info?.academicYear || '',
          dateOfBirth: info?.dateOfBirth ? String(info.dateOfBirth).slice(0, 10) : '',
          addressStreet: addr.street || '',
          addressCity: addr.city || '',
          addressState: addr.state || '',
          addressZipCode: addr.zipCode || '',
          addressCountry: addr.country || '',
          emergencyName: emergency.name || '',
          emergencyRelationship: emergency.relationship || '',
          emergencyPhone: emergency.phone || '',
          emergencyEmail: emergency.email || '',
        }));
      } catch (error) {
        Alert.alert('Load profile failed', error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      const payload = {
        username: form.username,
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
        profilePicture: form.profilePicture,
      };

      if (role === 'student') {
        payload.studentInfo = {
          grade: form.grade,
          section: form.section,
          gender: form.gender,
          bloodGroup: form.bloodGroup,
          academicYear: form.academicYear,
          dateOfBirth: form.dateOfBirth || null,
          address: {
            street: form.addressStreet,
            city: form.addressCity,
            state: form.addressState,
            zipCode: form.addressZipCode,
            country: form.addressCountry,
          },
          emergencyContact: {
            name: form.emergencyName,
            relationship: form.emergencyRelationship,
            phone: form.emergencyPhone,
            email: form.emergencyEmail,
          },
        };
      }

      if (role === 'student') {
        await apiRequest('/auth/profile-edit-request', { method: 'POST', body: payload });
      } else {
        await apiRequest('/auth/profile', { method: 'PUT', body: payload });
      }

      if (form.currentPassword && form.newPassword) {
        await apiRequest('/auth/change-password', {
          method: 'PUT',
          body: {
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
          },
        });
      }

      await auth?.refreshProfile?.();
      Alert.alert('Success', role === 'student' ? 'Edit request sent to admin for approval' : 'Profile updated');
      router.back();
    } catch (error) {
      Alert.alert('Save failed', error.message);
    } finally {
      setSaving(false);
    }
  }

  async function onPickDateWeb() {
    if (Platform.OS !== 'web') {
      Alert.alert('Date of birth', 'Use YYYY-MM-DD format in this build.');
      return;
    }
    try {
      const input = document.createElement('input');
      input.type = 'date';
      input.value = form.dateOfBirth || '';
      input.onchange = () => {
        if (input.value) setField('dateOfBirth', input.value);
      };
      input.click();
    } catch (error) {
      Alert.alert('Date picker', 'Could not open date picker.');
    }
  }

  async function onPickImageWeb() {
    if (Platform.OS !== 'web') {
      Alert.alert('Image upload', 'Direct upload picker is available on web in this build. On mobile, paste image URL for now.');
      return;
    }

    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          setField('profilePicture', result);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } catch (error) {
      Alert.alert('Image upload failed', 'Could not open image picker.');
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Edit Profile</Text>
      {requestStatus ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Latest Edit Request</Text>
          <Text style={styles.statusValue}>Status: {String(requestStatus.status || '').toUpperCase()}</Text>
          {requestStatus.reviewReason ? <Text style={styles.statusReason}>{requestStatus.reviewReason}</Text> : null}
        </View>
      ) : null}
      <TextInput style={styles.input} placeholder="Username" value={form.username} onChangeText={(v) => setField('username', v)} />
      <TextInput style={styles.input} placeholder="Email" value={form.email} autoCapitalize="none" onChangeText={(v) => setField('email', v)} />
      <TextInput style={styles.input} placeholder="First Name" value={form.firstName} onChangeText={(v) => setField('firstName', v)} />
      <TextInput style={styles.input} placeholder="Last Name" value={form.lastName} onChangeText={(v) => setField('lastName', v)} />
      <TextInput style={styles.input} placeholder="Phone Number" value={form.phoneNumber} onChangeText={(v) => setField('phoneNumber', v)} />
      <Pressable style={styles.uploadArea} onPress={onPickImageWeb}>
        {form.profilePicture ? (
          <Image source={{ uri: form.profilePicture }} style={styles.uploadPreviewLarge} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Text style={styles.uploadIcon}>📷</Text>
            <Text style={styles.uploadTitle}>Upload Profile Picture</Text>
            <Text style={styles.uploadHint}>Tap to choose an image file</Text>
          </View>
        )}
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={onPickImageWeb}>
        <Text style={styles.secondaryButtonText}>Choose Image</Text>
      </Pressable>
      {form.profilePicture ? (
        <Image source={{ uri: form.profilePicture }} style={styles.previewImage} />
      ) : (
        <Text style={styles.hint}>No profile image selected</Text>
      )}

      {role === 'student' && (
        <>
          <Text style={styles.section}>Student Details</Text>
          <TextInput style={styles.input} placeholder="Grade" value={form.grade} onChangeText={(v) => setField('grade', v)} />
          <TextInput style={styles.input} placeholder="Section" value={form.section} onChangeText={(v) => setField('section', v)} />
          <TextInput style={styles.input} placeholder="Gender" value={form.gender} onChangeText={(v) => setField('gender', v)} />
          <TextInput style={styles.input} placeholder="Blood Group" value={form.bloodGroup} onChangeText={(v) => setField('bloodGroup', v)} />
          <TextInput style={styles.input} placeholder="Academic Year" value={form.academicYear} onChangeText={(v) => setField('academicYear', v)} />
          <TextInput style={styles.input} placeholder="Date of Birth (YYYY-MM-DD)" value={form.dateOfBirth} onChangeText={(v) => setField('dateOfBirth', v)} />
          <Pressable style={styles.secondaryButton} onPress={onPickDateWeb}>
            <Text style={styles.secondaryButtonText}>Pick Date of Birth</Text>
          </Pressable>
          <TextInput style={styles.input} placeholder="Street" value={form.addressStreet} onChangeText={(v) => setField('addressStreet', v)} />
          <TextInput style={styles.input} placeholder="City" value={form.addressCity} onChangeText={(v) => setField('addressCity', v)} />
          <TextInput style={styles.input} placeholder="State" value={form.addressState} onChangeText={(v) => setField('addressState', v)} />
          <TextInput style={styles.input} placeholder="Zip Code" value={form.addressZipCode} onChangeText={(v) => setField('addressZipCode', v)} />
          <TextInput style={styles.input} placeholder="Country" value={form.addressCountry} onChangeText={(v) => setField('addressCountry', v)} />
          <TextInput style={styles.input} placeholder="Emergency Contact Name" value={form.emergencyName} onChangeText={(v) => setField('emergencyName', v)} />
          <TextInput style={styles.input} placeholder="Emergency Relationship" value={form.emergencyRelationship} onChangeText={(v) => setField('emergencyRelationship', v)} />
          <TextInput style={styles.input} placeholder="Emergency Phone" value={form.emergencyPhone} onChangeText={(v) => setField('emergencyPhone', v)} />
          <TextInput style={styles.input} placeholder="Emergency Email" value={form.emergencyEmail} onChangeText={(v) => setField('emergencyEmail', v)} />
        </>
      )}

      <Text style={styles.section}>Change Password (optional)</Text>
      <TextInput style={styles.input} placeholder="Current Password" secureTextEntry value={form.currentPassword} onChangeText={(v) => setField('currentPassword', v)} />
      <TextInput style={styles.input} placeholder="New Password" secureTextEntry value={form.newPassword} onChangeText={(v) => setField('newPassword', v)} />

      <Pressable style={[styles.button, saving && styles.disabled]} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  statusCard: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 8, padding: 10 },
  statusTitle: { color: '#1e3a8a', fontWeight: '800' },
  statusValue: { color: '#1e40af', fontWeight: '600', marginTop: 2 },
  statusReason: { color: '#334155', fontWeight: '600', marginTop: 4 },
  section: { marginTop: 8, fontWeight: '700', color: '#1e293b' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 10 },
  uploadArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadIcon: {
    fontSize: 24,
  },
  uploadTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  uploadHint: {
    color: '#64748b',
    fontSize: 12,
  },
  uploadPreviewLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  button: { backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  secondaryButton: { backgroundColor: '#0f766e', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 2 },
  secondaryButtonText: { color: '#fff', fontWeight: '700' },
  previewImage: { width: 92, height: 92, borderRadius: 46, alignSelf: 'center', marginTop: 6, borderWidth: 2, borderColor: '#e2e8f0' },
  hint: { color: '#64748b', textAlign: 'center', fontSize: 12 },
  disabled: { backgroundColor: '#94a3b8' },
  buttonText: { color: '#fff', fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loading: { color: '#64748b' },
});
