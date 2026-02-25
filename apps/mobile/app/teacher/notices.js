import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiRequest } from '../../services/api';

const DEFAULT_FORM = {
  id: '',
  title: '',
  content: '',
  category: 'announcement',
  priority: 'medium',
  expiryDate: '',
  status: 'draft',
};

export default function TeacherNotices() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [notices, setNotices] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/teacher-content/notices');
      setNotices(Array.isArray(response?.notices) ? response.notices : []);
    } catch (error) {
      Alert.alert('Notices', error.message || 'Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notices;
    return notices.filter(
      (notice) =>
        String(notice.title || '').toLowerCase().includes(q) ||
        String(notice.content || '').toLowerCase().includes(q) ||
        String(notice.category || '').toLowerCase().includes(q)
    );
  }, [notices, search]);

  const resetForm = () => setForm(DEFAULT_FORM);

  const onSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Notices', 'Title and content are required.');
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await apiRequest(`/teacher-content/notices/${form.id}`, 'PUT', form);
      } else {
        await apiRequest('/teacher-content/notices', 'POST', form);
      }
      resetForm();
      await loadData();
    } catch (error) {
      Alert.alert('Notices', error.message || 'Failed to save notice');
    } finally {
      setSaving(false);
    }
  };

  const onPublish = async (noticeId) => {
    setPublishingId(noticeId);
    try {
      const response = await apiRequest(`/teacher-content/notices/${noticeId}/publish`, 'POST', {
        targetRole: 'all',
      });
      Alert.alert('Notices', `Notice published. ${response?.notified || 0} users notified.`);
      await loadData();
    } catch (error) {
      Alert.alert('Notices', error.message || 'Failed to publish notice');
    } finally {
      setPublishingId('');
    }
  };

  const onEdit = (notice) => {
    setForm({
      id: notice.id,
      title: notice.title || '',
      content: notice.content || '',
      category: notice.category || 'announcement',
      priority: notice.priority || 'medium,high,low,critical',
      expiryDate: notice.expiryDate || '',
      status: notice.status || 'draft,active,inactive',
    });
  };
  
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#10b981';
      case 'low': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor="#155e75" />
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Notices</Text>
        <Text style={styles.heroSubtitle}>Create and publish notices stored in the database.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{form.id ? 'Edit Notice' : 'New Notice'}</Text>
        <TextInput style={styles.input} value={form.title} onChangeText={(value) => setForm((p) => ({ ...p, title: value }))} placeholder="Title" placeholderTextColor="#94a3b8" />
        <TextInput style={[styles.input, styles.multiline]} value={form.content} onChangeText={(value) => setForm((p) => ({ ...p, content: value }))} placeholder="Content" placeholderTextColor="#94a3b8" multiline />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.rowInput]} value={form.category} onChangeText={(value) => setForm((p) => ({ ...p, category: value }))} placeholder="Category" placeholderTextColor="#94a3b8" />
          <TextInput style={[styles.input, styles.rowInput]} value={form.priority} onChangeText={(value) => setForm((p) => ({ ...p, priority: value }))} placeholder="Priority" placeholderTextColor="#94a3b8" />
        </View>
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.rowInput]} value={form.expiryDate} onChangeText={(value) => setForm((p) => ({ ...p, expiryDate: value }))} placeholder="Expiry date (YYYY-MM-DD)" placeholderTextColor="#94a3b8" />
          <TextInput style={[styles.input, styles.rowInput]} value={form.status} onChangeText={(value) => setForm((p) => ({ ...p, status: value }))} placeholder="Status" placeholderTextColor="#94a3b8" />
        </View>
        <View style={styles.quickRow}>
          <Pressable style={styles.primaryBtn} onPress={onSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>{form.id ? 'Update Notice' : 'Create Notice'}</Text>}
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={resetForm}>
            <Text style={styles.btnText}>Clear Form</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Search notices" placeholderTextColor="#94a3b8" />
        <View style={styles.quickRow}>
          <Pressable style={styles.secondaryBtn} onPress={loadData}>
            <Text style={styles.btnText}>Refresh</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Notice List</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#155e75" />
      ) : filtered.length ? (
        filtered.map((notice) => (
          <View key={notice.id} style={styles.noticeCard}>
            <View style={styles.noticeTop}>
              <Text style={styles.noticeTitle}>{notice.title}</Text>
              <Text style={styles.badge}>{String(notice.status || 'draft').toUpperCase()}</Text>
            </View>
            <Text style={styles.meta}>{notice.category}  {notice.priority}</Text>
            <Text style={styles.contentText}>{notice.content}</Text>
            <Text style={styles.meta}>Expires: {notice.expiryDate || 'N/A'} | Views: {notice.views || 0}</Text>
            <View style={styles.quickRow}>
              <Pressable style={styles.editBtn} onPress={() => onEdit(notice)}>
                <Text style={styles.btnText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.publishBtn} onPress={() => onPublish(notice.id)} disabled={Boolean(publishingId)}>
                {publishingId === notice.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Publish</Text>}
              </Pressable>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>No notices found.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  hero: { backgroundColor: '#155e75', borderRadius: 20, padding: 16 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe3f0', padding: 12, gap: 8 },
  sectionTitle: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, color: '#0f172a' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  rowInput: { flex: 1 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  primaryBtn: { flex: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 11, backgroundColor: '#155e75' },
  secondaryBtn: { flex: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 11, backgroundColor: '#0369a1' },
  editBtn: { flex: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 10, backgroundColor: '#2563eb' },
  publishBtn: { flex: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 10, backgroundColor: '#0f766e' },
  btnText: { color: '#fff', fontWeight: '800' },
  noticeCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe3f0', padding: 12, gap: 8 },
  noticeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  noticeTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800', flex: 1 },
  badge: { color: '#155e75', fontWeight: '900', fontSize: 11 },
  meta: { color: '#64748b', fontWeight: '600' },
  contentText: { color: '#334155', fontWeight: '600' },
  empty: { color: '#64748b', textAlign: 'center', fontWeight: '600' },
});
