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
  className: '',
  subject: '',
  dueDate: '',
  description: '',
  priority: 'medium',
  status: 'active',
};

export default function TeacherHomework() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/teacher-content/homework');
      setItems(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      Alert.alert('Homework', error.message || 'Failed to load homework');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        String(item.title || '').toLowerCase().includes(q) ||
        String(item.className || '').toLowerCase().includes(q) ||
        String(item.subject || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const resetForm = () => setForm(DEFAULT_FORM);

  const onSave = async () => {
    if (!form.title.trim() || !form.className.trim() || !form.subject.trim() || !form.dueDate.trim()) {
      Alert.alert('Homework', 'Title, class, subject, and due date are required.');
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await apiRequest(`/teacher-content/homework/${form.id}`, 'PUT', form);
      } else {
        await apiRequest('/teacher-content/homework', 'POST', form);
      }
      resetForm();
      await loadData();
    } catch (error) {
      Alert.alert('Homework', error.message || 'Failed to save homework');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (item) => {
    setForm({
      id: item.id,
      title: item.title || '',
      className: item.className || item.class || '',
      subject: item.subject || '',
      dueDate: item.dueDate || '',
      description: item.description || '',
      priority: item.priority || 'medium',
      status: item.status || 'active',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor="#0f766e" />
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Homework</Text>
        <Text style={styles.heroSubtitle}>Create, edit, and track homework from the database.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{form.id ? 'Edit Homework' : 'New Homework'}</Text>
        <TextInput style={styles.input} value={form.title} onChangeText={(value) => setForm((p) => ({ ...p, title: value }))} placeholder="Title" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} value={form.className} onChangeText={(value) => setForm((p) => ({ ...p, className: value }))} placeholder="Class (e.g. 10A)" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} value={form.subject} onChangeText={(value) => setForm((p) => ({ ...p, subject: value }))} placeholder="Subject" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} value={form.dueDate} onChangeText={(value) => setForm((p) => ({ ...p, dueDate: value }))} placeholder="Due date (YYYY-MM-DD)" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} value={form.description} onChangeText={(value) => setForm((p) => ({ ...p, description: value }))} placeholder="Description" placeholderTextColor="#94a3b8" multiline />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.rowInput]} value={form.priority} onChangeText={(value) => setForm((p) => ({ ...p, priority: value }))} placeholder="Priority" placeholderTextColor="#94a3b8" />
          <TextInput style={[styles.input, styles.rowInput]} value={form.status} onChangeText={(value) => setForm((p) => ({ ...p, status: value }))} placeholder="Status" placeholderTextColor="#94a3b8" />
        </View>
        <View style={styles.quickRow}>
          <Pressable style={styles.primaryBtn} onPress={onSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>{form.id ? 'Update Homework' : 'Create Homework'}</Text>}
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={resetForm}>
            <Text style={styles.btnText}>Clear Form</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Search homework" placeholderTextColor="#94a3b8" />
        <View style={styles.quickRow}>
          <Pressable style={styles.secondaryBtn} onPress={loadData}>
            <Text style={styles.btnText}>Refresh</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Homework List</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0f766e" />
      ) : filtered.length ? (
        filtered.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemTop}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemStatus}>{String(item.status || 'active').toUpperCase()}</Text>
            </View>
            <Text style={styles.itemMeta}>{item.className || item.class}  {item.subject}</Text>
            <Text style={styles.itemMeta}>Due: {item.dueDate}</Text>
            <Text style={styles.itemDesc}>{item.description || 'No description'}</Text>
            <Pressable style={styles.editBtn} onPress={() => onEdit(item)}>
              <Text style={styles.btnText}>Edit Homework</Text>
            </Pressable>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>No homework entries found.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  hero: { backgroundColor: '#0f766e', borderRadius: 20, padding: 16 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe3f0', padding: 12, gap: 8 },
  sectionTitle: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, color: '#0f172a' },
  row: { flexDirection: 'row', gap: 8 },
  rowInput: { flex: 1 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  primaryBtn: { flex: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 11, backgroundColor: '#0f766e' },
  secondaryBtn: { flex: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 11, backgroundColor: '#0369a1' },
  btnText: { color: '#fff', fontWeight: '800' },
  itemCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe3f0', padding: 12, gap: 8 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800', flex: 1, marginRight: 8 },
  itemStatus: { color: '#0f766e', fontWeight: '800', fontSize: 11 },
  itemMeta: { color: '#64748b', fontWeight: '600' },
  itemDesc: { color: '#475569', fontWeight: '600' },
  editBtn: { marginTop: 4, backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  empty: { color: '#64748b', textAlign: 'center', fontWeight: '600' },
});
