import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SelectField({ label, value, options, placeholder = 'Select', onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = String(query || '').toLowerCase();
    if (!q) return options || [];
    return (options || []).filter((item) => {
      const label = String(item.label || '').toLowerCase();
      const value = String(item.value || '').toLowerCase();
      const keywords = Array.isArray(item.keywords)
        ? item.keywords.map((k) => String(k || '').toLowerCase()).join(' ')
        : '';
      return label.includes(q) || value.includes(q) || keywords.includes(q);
    });
  }, [options, query]);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Text style={value ? styles.value : styles.placeholder}>{value || placeholder}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>{label || 'Select option'}</Text>
            <TextInput
              style={styles.search}
              placeholder="Search..."
              value={query}
              onChangeText={setQuery}
            />
            <ScrollView style={styles.list}>
              {filtered.map((item) => (
                <Pressable
                  key={String(item.value)}
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value, item.label);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Text style={styles.optionLabel}>{item.label}</Text>
                </Pressable>
              ))}
              {!filtered.length ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>No options found.</Text>
                </View>
              ) : null}
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { color: '#334155', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  value: { color: '#0f172a' },
  placeholder: { color: '#94a3b8' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: '80%', padding: 12, gap: 10 },
  title: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  search: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 },
  list: { maxHeight: 320 },
  option: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  optionLabel: { color: '#0f172a' },
  emptyRow: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontWeight: '600',
  },
  closeBtn: { backgroundColor: '#e2e8f0', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  closeText: { color: '#334155', fontWeight: '700' },
});
