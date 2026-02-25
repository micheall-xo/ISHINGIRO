import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../../services/api';

const PERIODS = ['weekly', 'monthly', 'quarterly', 'yearly'];

function toMoney(value) {
  return Number(value || 0).toFixed(2);
}

function toDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toISOString().slice(0, 10);
}

export default function Reports() {
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);

  async function load(nextPeriod = period) {
    try {
      setLoading(true);
      const data = await apiRequest(`/pocket-money/parent-reports?period=${encodeURIComponent(nextPeriod)}`);
      setReports(Array.isArray(data?.reports) ? data.reports : []);
    } catch (error) {
      console.error('Parent reports load error:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(period);
  }, [period]);

  useEffect(() => {
    const timer = setInterval(() => load(period), 25000);
    return () => clearInterval(timer);
  }, [period]);

  const totals = useMemo(() => {
    return reports.reduce(
      (acc, report) => {
        acc.balance += Number(report?.financial?.currentBalance || 0);
        acc.topUps += Number(report?.financial?.topUps || 0);
        acc.spent += Number(report?.financial?.spent || 0);
        return acc;
      },
      { balance: 0, topUps: 0, spent: 0 }
    );
  }, [reports]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Reports Center</Text>
        <Text style={styles.heroSubtitle}>Real-time child reports by period</Text>
      </View>

      <View style={styles.periodSelector}>
        {PERIODS.map((item) => (
          <Pressable
            key={item}
            style={[styles.periodButton, period === item && styles.periodButtonActive]}
            onPress={() => setPeriod(item)}
          >
            <Text style={[styles.periodButtonText, period === item && styles.periodButtonTextActive]}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Summary ({period})</Text>
            <View style={styles.summaryRow}>
              <Metric label="Children" value={String(reports.length)} />
              <Metric label="Balance" value={`$${toMoney(totals.balance)}`} />
            </View>
            <View style={styles.summaryRow}>
              <Metric label="Top-ups" value={`$${toMoney(totals.topUps)}`} positive />
              <Metric label="Spent" value={`$${toMoney(totals.spent)}`} negative />
            </View>
          </View>

          {reports.map((report) => {
            const student = report.student || {};
            const financial = report.financial || {};
            const academic = report.academic || {};
            return (
              <View key={String(student.studentId || student.id)} style={styles.reportCard}>
                <Text style={styles.reportName}>{student.name || 'Student'}</Text>
                <Text style={styles.reportMeta}>
                  {student.studentId || '-'} • {student.className || '-'}
                </Text>

                <View style={styles.reportGrid}>
                  <SmallMetric label="Current Balance" value={`$${toMoney(financial.currentBalance)}`} />
                  <SmallMetric label="Top-ups" value={`$${toMoney(financial.topUps)}`} positive />
                  <SmallMetric label="Spent" value={`$${toMoney(financial.spent)}`} negative />
                  <SmallMetric label="Net" value={`$${toMoney(financial.net)}`} />
                </View>

                <View style={styles.reportGrid}>
                  <SmallMetric label="GPA" value={String(academic.gpa ?? 0)} />
                  <SmallMetric label="Overall Grade" value={String(academic.overallGrade || 'N/A')} />
                  <SmallMetric label="Attendance" value={`${Number(academic.attendancePct || 0)}%`} />
                  <SmallMetric label="Present / Total" value={`${Number(academic.presentDays || 0)}/${Number(academic.totalDays || 0)}`} />
                </View>

                <Text style={styles.txTitle}>Latest Transactions ({period})</Text>
                {(financial.transactions || []).slice(0, 5).map((tx, idx) => {
                  const positive = tx.type === 'topup' || tx.type === 'refund';
                  return (
                    <View key={`${student.studentId}-${idx}`} style={styles.txRow}>
                      <Text style={styles.txLeft}>{tx.description || tx.type || 'Transaction'}</Text>
                      <Text style={[styles.txAmount, positive ? styles.positive : styles.negative]}>
                        {positive ? '+' : '-'}${toMoney(tx.amount)}
                      </Text>
                      <Text style={styles.txDate}>{toDate(tx.date)}</Text>
                    </View>
                  );
                })}
                {!(financial.transactions || []).length ? <Text style={styles.muted}>No transactions in this period.</Text> : null}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

function Metric({ label, value, positive, negative }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, positive && styles.positive, negative && styles.negative]}>{value}</Text>
    </View>
  );
}

function SmallMetric({ label, value, positive, negative }) {
  return (
    <View style={styles.smallMetric}>
      <Text style={styles.smallLabel}>{label}</Text>
      <Text style={[styles.smallValue, positive && styles.positive, negative && styles.negative]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 12 },
  hero: { backgroundColor: '#1d4ed8', borderRadius: 16, padding: 16 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
  heroSubtitle: { color: '#dbeafe', marginTop: 4 },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodButtonActive: {
    backgroundColor: '#dbeafe',
  },
  periodButtonText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 12,
  },
  periodButtonTextActive: {
    color: '#1d4ed8',
  },
  loadingBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: { color: '#475569', fontWeight: '600' },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 8,
  },
  summaryTitle: { color: '#0f172a', fontWeight: '800' },
  summaryRow: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, padding: 10 },
  metricLabel: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  metricValue: { color: '#1e293b', fontWeight: '800', marginTop: 3 },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 8,
  },
  reportName: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
  reportMeta: { color: '#64748b', fontSize: 12 },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallMetric: {
    width: '48%',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    padding: 8,
  },
  smallLabel: { color: '#64748b', fontSize: 11 },
  smallValue: { color: '#1e293b', fontWeight: '700', marginTop: 3 },
  txTitle: { color: '#1e293b', fontWeight: '700', marginTop: 4 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 6,
  },
  txLeft: { flex: 1, color: '#334155', fontSize: 12 },
  txAmount: { width: 84, textAlign: 'right', fontWeight: '700', fontSize: 12 },
  txDate: { width: 90, textAlign: 'right', color: '#64748b', fontSize: 11 },
  positive: { color: '#16a34a' },
  negative: { color: '#dc2626' },
  muted: { color: '#64748b', fontSize: 12 },
});
