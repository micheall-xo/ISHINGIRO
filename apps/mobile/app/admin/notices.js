import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AdminShell,
  AnimatedCard,
  LoadingButton,
  SectionTitle,
  adminColors,
  adminFieldStyles,
} from '../../components/admin/AdminUI';
import { apiRequest } from '../../services/api';
import SelectField from '../../components/SelectField';

const EMPTY = {
  id: '',
  title: '',
  content: '',
  category: 'announcement',
  priority: 'medium',
  expiryDate: '',
  status: 'draft',
};

const CATEGORY_OPTIONS = [
  { value: 'announcement', label: 'Announcement', color: '#2563eb' },
  { value: 'academic', label: 'Academic', color: '#7c3aed' },
  { value: 'event', label: 'Event', color: '#db2777' },
  { value: 'exam', label: 'Exam', color: '#ea580c' },
  { value: 'fee', label: 'Fees', color: '#0f766e' },
  { value: 'discipline', label: 'Discipline', color: '#dc2626' },
  { value: 'transport', label: 'Transport', color: '#0891b2' },
  { value: 'sports', label: 'Sports', color: '#16a34a' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#22c55e' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'urgent', label: 'Urgent', color: '#7f1d1d' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

function colorForPriority(priority) {
  const item = PRIORITY_OPTIONS.find((x) => x.value === String(priority || '').toLowerCase());
  return item?.color || '#475569';
}

function colorForCategory(category) {
  const item = CATEGORY_OPTIONS.find((x) => x.value === String(category || '').toLowerCase());
  return item?.color || '#64748b';
}

function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function DatePickerModal({ visible, value, onClose, onSelect }) {
  const initialDate = value ? new Date(`${value}T00:00:00`) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const startWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedValue = String(value || '');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable style={styles.calNavBtn} onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>
              <Text style={styles.calNavText}>{'<'}</Text>
            </Pressable>
            <Text style={styles.calTitle}>
              {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <Pressable style={styles.calNavBtn} onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>
              <Text style={styles.calNavText}>{'>'}</Text>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <Text key={d} style={styles.weekLabel}>{d}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {cells.map((cell, idx) => {
              if (!cell) return <View key={`blank-${idx}`} style={styles.dayCell} />;
              const v = toDateString(cell);
              const isSelected = selectedValue === v;
              return (
                <Pressable key={v} style={[styles.dayCell, isSelected && styles.dayCellSelected]} onPress={() => onSelect(v)}>
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{cell.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.calActions}>
            <Pressable style={styles.calActionBtn} onPress={() => onSelect('')}>
              <Text style={styles.calActionText}>Clear</Text>
            </Pressable>
            <Pressable style={styles.calActionBtn} onPress={onClose}>
              <Text style={styles.calActionText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminNoticesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState('');
  const [notices, setNotices] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/admin/notices');
      setNotices(Array.isArray(response?.notices) ? response.notices : []);
    } catch (error) {
      Alert.alert('Notices', error.message || 'Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const resetForm = () => setForm(EMPTY);

  const saveNotice = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Notices', 'Title and content are required.');
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await apiRequest(`/admin/notices/${form.id}`, 'PUT', form);
      } else {
        await apiRequest('/admin/notices', 'POST', form);
      }
      resetForm();
      await loadNotices();
    } catch (error) {
      Alert.alert('Notices', error.message || 'Failed to save notice');
    } finally {
      setSaving(false);
    }
  };

  const publishNotice = async (noticeId) => {
    setPublishing(noticeId);
    try {
      const response = await apiRequest(`/admin/notices/${noticeId}/publish`, 'POST', { targetRole: 'all' });
      Alert.alert('Notices', `Notice published. ${response?.notified || 0} users notified.`);
      await loadNotices();
    } catch (error) {
      Alert.alert('Notices', error.message || 'Failed to publish notice');
    } finally {
      setPublishing('');
    }
  };

  return (
    <AdminShell title="Notice Center" subtitle="Create, edit, and publish school notices with notification delivery.">
      <AnimatedCard delay={40}>
        <SectionTitle>{form.id ? 'Edit Notice' : 'Create Notice'}</SectionTitle>
        <Text style={adminFieldStyles.label}>Title</Text>
        <TextInput style={adminFieldStyles.input} value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} />
        <Text style={adminFieldStyles.label}>Content</Text>
        <TextInput
          style={[adminFieldStyles.input, styles.multiline]}
          multiline
          value={form.content}
          onChangeText={(v) => setForm((p) => ({ ...p, content: v }))}
        />
        <View style={styles.row}>
          <View style={styles.col}>
            <SelectField
              label="Category"
              value={CATEGORY_OPTIONS.find((x) => x.value === form.category)?.label || 'Category'}
              options={CATEGORY_OPTIONS}
              placeholder="Choose category"
              onChange={(value) => setForm((p) => ({ ...p, category: value }))}
            />
            <View style={[styles.tagPreview, { borderColor: colorForCategory(form.category), backgroundColor: `${colorForCategory(form.category)}1a` }]}>
              <Text style={[styles.tagPreviewText, { color: colorForCategory(form.category) }]}>
                Category: {CATEGORY_OPTIONS.find((x) => x.value === form.category)?.label || form.category}
              </Text>
            </View>
          </View>
          <View style={styles.col}>
            <SelectField
              label="Priority"
              value={PRIORITY_OPTIONS.find((x) => x.value === form.priority)?.label || 'Priority'}
              options={PRIORITY_OPTIONS}
              placeholder="Choose priority"
              onChange={(value) => setForm((p) => ({ ...p, priority: value }))}
            />
            <View style={[styles.tagPreview, { borderColor: colorForPriority(form.priority), backgroundColor: `${colorForPriority(form.priority)}1a` }]}>
              <Text style={[styles.tagPreviewText, { color: colorForPriority(form.priority) }]}>
                Priority: {PRIORITY_OPTIONS.find((x) => x.value === form.priority)?.label || form.priority}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={adminFieldStyles.label}>Expiry Date</Text>
            <Pressable style={adminFieldStyles.input} onPress={() => setDatePickerOpen(true)}>
              <Text style={form.expiryDate ? styles.dateValue : styles.datePlaceholder}>
                {form.expiryDate || 'Select date from calendar'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.col}>
            <SelectField
              label="Status"
              value={STATUS_OPTIONS.find((x) => x.value === form.status)?.label || 'Status'}
              options={STATUS_OPTIONS}
              placeholder="Choose status"
              onChange={(value) => setForm((p) => ({ ...p, status: value }))}
            />
          </View>
        </View>
        <LoadingButton
          label={form.id ? 'Update Notice' : 'Create Notice'}
          busyLabel="Saving..."
          loading={saving}
          onPress={saveNotice}
          color={adminColors.accent}
        />
        <Pressable style={styles.clearBtn} onPress={resetForm}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </AnimatedCard>

      <AnimatedCard delay={100}>
        <SectionTitle>Notice List</SectionTitle>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={adminColors.accent} />
            <Text style={styles.muted}>Loading notices...</Text>
          </View>
        ) : notices.length ? (
          notices.map((notice) => (
            <View key={notice.id} style={[styles.notice, { borderLeftColor: colorForPriority(notice.priority), borderLeftWidth: 5 }]}>
              <View style={styles.noticeTop}>
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                <Text style={styles.badge}>{String(notice.status || 'draft').toUpperCase()}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaPill, { color: colorForCategory(notice.category), backgroundColor: `${colorForCategory(notice.category)}1a` }]}>
                  {notice.category}
                </Text>
                <Text style={[styles.metaPill, { color: colorForPriority(notice.priority), backgroundColor: `${colorForPriority(notice.priority)}1a` }]}>
                  {notice.priority}
                </Text>
                <Text style={styles.meta}>Views: {notice.views || 0}</Text>
              </View>
              <Text style={styles.content}>{notice.content}</Text>
              <View style={styles.row}>
                <Pressable style={styles.editBtn} onPress={() => setForm({
                  id: notice.id,
                  title: notice.title || '',
                  content: notice.content || '',
                  category: notice.category || 'announcement',
                  priority: notice.priority || 'medium',
                  expiryDate: notice.expiryDate || '',
                  status: notice.status || 'draft',
                })}>
                  <Text style={styles.btnTxt}>Edit</Text>
                </Pressable>
                <Pressable style={styles.publishBtn} onPress={() => publishNotice(notice.id)} disabled={Boolean(publishing)}>
                  {publishing === notice.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnTxt}>Publish</Text>}
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No notices yet.</Text>
        )}
      </AnimatedCard>
      <DatePickerModal
        visible={datePickerOpen}
        value={form.expiryDate}
        onClose={() => setDatePickerOpen(false)}
        onSelect={(value) => {
          setForm((p) => ({ ...p, expiryDate: value }));
          setDatePickerOpen(false);
        }}
      />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  col: { flex: 1, gap: 6 },
  multiline: { minHeight: 86, textAlignVertical: 'top' },
  clearBtn: { alignItems: 'center', paddingVertical: 8 },
  clearText: { color: '#475569', fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  muted: { color: adminColors.body, fontWeight: '600' },
  notice: { borderWidth: 1, borderColor: '#dbe4f3', borderRadius: 12, padding: 10, gap: 6, backgroundColor: '#f8faff' },
  noticeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  noticeTitle: { color: '#1e293b', fontWeight: '800', flex: 1, fontSize: 15 },
  badge: { color: '#1d4ed8', fontWeight: '900', fontSize: 11 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  meta: { color: '#64748b', fontWeight: '600' },
  metaPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  content: { color: '#334155', fontWeight: '600' },
  editBtn: { flex: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 9, backgroundColor: '#2563eb' },
  publishBtn: { flex: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 9, backgroundColor: '#0f766e' },
  btnTxt: { color: '#fff', fontWeight: '800' },
  dateValue: { color: '#0f172a' },
  datePlaceholder: { color: '#94a3b8' },
  tagPreview: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  tagPreviewText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    width: '100%',
    maxWidth: 420,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dbe4f3',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calNavBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  calNavText: { color: '#334155', fontWeight: '900', fontSize: 16 },
  calTitle: { color: '#0f172a', fontWeight: '800' },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#64748b',
    fontWeight: '700',
    fontSize: 11,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  dayCellSelected: {
    backgroundColor: '#2563eb',
  },
  dayText: { color: '#1e293b', fontWeight: '700' },
  dayTextSelected: { color: '#fff' },
  calActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  calActionBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  calActionText: { color: '#334155', fontWeight: '700' },
});
