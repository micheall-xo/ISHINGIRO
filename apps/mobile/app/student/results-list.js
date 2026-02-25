import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../services/api';
import { exportTermReport } from '../../services/reportExport';

export default function ResultsListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState({ terms: [], yearly: {}, performance: {}, student: {} });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await apiRequest('/teacher-content/student/report-card');
        setReport({
          terms: Array.isArray(response?.terms) ? response.terms : [],
          yearly: response?.yearly || {},
          performance: response?.performance || {},
          student: response?.student || {},
        });
      } catch (error) {
        Alert.alert('Results', error.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resultsData = Array.isArray(report.terms) ? report.terms : [];

  const bestGrade = useMemo(() => {
    const order = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F', 'N/A'];
    if (!resultsData.length) return 'N/A';
    const grades = resultsData.map((x) => x.overallGrade || 'N/A');
    grades.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return grades[0] || 'N/A';
  }, [resultsData]);

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+':
        return '#10b981';
      case 'A':
        return '#059669';
      case 'B+':
        return '#3b82f6';
      case 'B':
        return '#2563eb';
      case 'C+':
        return '#f59e0b';
      case 'C':
        return '#d97706';
      default:
        return '#6b7280';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 80) return '#3b82f6';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const routeForTerm = (term) => {
    const t = String(term || '').toLowerCase();
    if (t.includes('second')) return '/student/result-second';
    return '/student/result-first';
  };

  async function onDownload(result) {
    try {
      await exportTermReport(report, result);
    } catch (error) {
      Alert.alert('Download', error.message || 'Failed to generate report file');
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />

      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Academic Results</Text>
            <Text style={styles.headerSubtitle}>
              {report.student?.fullName ? `${report.student.fullName} | ${report.student.className || ''}` : 'Track your performance'}
            </Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{resultsData.length}</Text>
              <Text style={styles.statLabel}>Terms</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{bestGrade}</Text>
              <Text style={styles.statLabel}>Best Grade</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.overviewContainer}>
        <Text style={styles.sectionTitle}>Performance Overview</Text>
        <View style={styles.overviewCard}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={styles.loadingText}>Loading report card...</Text>
            </View>
          ) : (
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Current GPA</Text>
                <Text style={styles.overviewValue}>{Number(report.yearly?.gpa || report.performance?.gpa || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Yearly Grade</Text>
                <Text style={styles.overviewValue}>{report.yearly?.grade || report.performance?.overallGrade || 'N/A'}</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Promotion</Text>
                <Text style={[styles.overviewValue, { color: report.yearly?.status === 'Promoted' ? '#10b981' : '#ef4444' }]}>
                  {report.yearly?.status || 'N/A'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.sectionTitle}>Term Results</Text>
        {!loading && resultsData.length === 0 ? <Text style={styles.empty}>No report records found yet.</Text> : null}
        {resultsData.map((result) => (
          <View key={`${result.term}-${result.id}`} style={styles.resultCard}>
            <View style={styles.cardHeader}>
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle}>{result.title}</Text>
                <Text style={styles.resultDate}>{result.date}</Text>
              </View>
              <View style={styles.gradeContainer}>
                <Text style={styles.overallGrade}>{result.overallGrade}</Text>
                <Text style={styles.overallScore}>{Number(result.overallScore || 0).toFixed(2)}%</Text>
              </View>
            </View>

            <View style={styles.rankInfo}>
              <Text style={styles.rankText}>
                Yearly status: {report.yearly?.status || 'N/A'} | GPA: {Number(report.yearly?.gpa || 0).toFixed(2)}
              </Text>
            </View>

            <View style={styles.subjectsContainer}>
              <Text style={styles.subjectsTitle}>Subject Performance (Formative + Exam)</Text>
              {(result.subjects || []).map((subject, index) => (
                <View key={`${subject.name}-${index}`} style={styles.subjectRow}>
                  <View style={styles.subjectInfo}>
                    <Text style={styles.subjectIcon}>{subject.icon || '📘'}</Text>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                  </View>
                  <View style={styles.subjectGrades}>
                    <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(subject.grade) + '20' }]}>
                      <Text style={[styles.gradeText, { color: getGradeColor(subject.grade) }]}>{subject.grade}</Text>
                    </View>
                    <Text style={[styles.scoreText, { color: getScoreColor(subject.score) }]}>
                      {Number(subject.score || 0).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.actionButtons}>
              <Pressable style={styles.viewButton} onPress={() => router.push(routeForTerm(result.term))}>
                <Text style={styles.viewIcon}>👁️</Text>
                <Text style={styles.viewText}>View Details</Text>
              </Pressable>
              <Pressable style={styles.downloadButton} onPress={() => onDownload(result)}>
                <Text style={styles.downloadIcon}>📥</Text>
                <Text style={styles.downloadText}>Download</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    position: 'relative',
    height: 260,
    marginBottom: 24,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#10b981',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  headerStats: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overviewContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  overviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewItem: {
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
  },
  resultsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  resultDate: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  gradeContainer: {
    alignItems: 'center',
  },
  overallGrade: {
    fontSize: 32,
    fontWeight: '800',
    color: '#10b981',
    marginBottom: 4,
  },
  overallScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  rankInfo: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d97706',
    textAlign: 'center',
  },
  subjectsContainer: {
    marginBottom: 20,
  },
  subjectsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subjectIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  subjectGrades: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 35,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  viewIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  viewText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  downloadIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  downloadText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomSpacing: {
    height: 24,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontWeight: '600',
  },
  empty: {
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 10,
  },
});
