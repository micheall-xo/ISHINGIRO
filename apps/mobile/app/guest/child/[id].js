import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiRequest } from '../../../services/api';

function toMoney(value) {
  return Number(value || 0).toFixed(2);
}

export default function ChildDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payload, setPayload] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  async function load() {
    if (!id) return;
    try {
      setLoading(true);
      const data = await apiRequest(`/pocket-money/student/${encodeURIComponent(String(id))}`);
      setPayload(data);
    } catch (error) {
      Alert.alert('Load failed', error.message || 'Could not fetch student details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function addMoney() {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
    }

    setSubmitting(true);
    try {
      await apiRequest('/pocket-money/topup', {
        method: 'POST',
        body: {
          studentId: String(id),
          amount: numeric,
          description: description.trim() || 'Parent top-up',
        },
      });
      setAmount('');
      setDescription('');
      await load();
      Alert.alert('Success', 'Pocket money added.');
    } catch (error) {
      Alert.alert('Top-up failed', error.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const student = payload?.student || {};
  const transactions = Array.isArray(payload?.pocketMoney?.transactions) ? payload.pocketMoney.transactions : [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Student Wallet</Text>
        <View style={styles.spacer} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading child data...</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.name}>{student?.name || 'Student'}</Text>
            <Text style={styles.meta}>
              {student?.grade || '-'}
              {student?.section || ''} | ID: {student?.studentId || String(id)}
            </Text>
            <Text style={styles.balance}>${toMoney(payload?.pocketMoney?.balance)}</Text>
            <Text style={styles.balanceLabel}>Current Balance</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Add Pocket Money</Text>
            <TextInput
              style={styles.input}
              placeholder="Amount"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={description}
              onChangeText={setDescription}
            />
            <Pressable style={styles.topUpBtn} disabled={submitting} onPress={addMoney}>
              <Text style={styles.topUpBtnText}>{submitting ? 'Adding...' : '💰 Add Money'}</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            {transactions.length ? (
              transactions
                .slice()
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 30)
                .map((tx, index) => {
                  const positive = tx.type === 'topup' || tx.type === 'refund';
                  return (
                    <View key={String(tx._id || index)} style={styles.txRow}>
                      <View style={styles.txMeta}>
                        <Text style={styles.txDesc}>{tx.description || tx.type || 'Transaction'}</Text>
                        <Text style={styles.txDate}>{tx.date ? new Date(tx.date).toISOString().slice(0, 10) : '-'}</Text>
                      </View>
                      <Text style={[styles.txAmount, positive ? styles.plus : styles.minus]}>
                        {positive ? '+' : '-'}${toMoney(tx.amount)}
                      </Text>
                    </View>
                  );
                })
            ) : (
              <Text style={styles.emptyText}>No transactions yet.</Text>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  title: {
    color: '#1e293b',
    fontWeight: '800',
    fontSize: 18,
  },
  spacer: {
    width: 50,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#64748b',
    fontWeight: '600',
  },
  card: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eef2ff',
    padding: 16,
  },
  name: {
    color: '#1e293b',
    fontWeight: '800',
    fontSize: 20,
  },
  meta: {
    color: '#64748b',
    marginTop: 4,
  },
  balance: {
    marginTop: 14,
    color: '#10b981',
    fontWeight: '900',
    fontSize: 30,
  },
  balanceLabel: {
    color: '#64748b',
  },
  sectionTitle: {
    color: '#1e293b',
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: '#1e293b',
  },
  topUpBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  topUpBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  txMeta: {
    flex: 1,
    marginRight: 8,
  },
  txDesc: {
    color: '#334155',
    fontWeight: '600',
  },
  txDate: {
    color: '#94a3b8',
    marginTop: 2,
    fontSize: 12,
  },
  txAmount: {
    fontWeight: '800',
  },
  plus: {
    color: '#16a34a',
  },
  minus: {
    color: '#dc2626',
  },
  emptyText: {
    color: '#64748b',
  },
});
