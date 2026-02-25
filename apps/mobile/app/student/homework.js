import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';

export default function StudentHomework() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [homeworkList, setHomeworkList] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await apiRequest('/teacher-content/student/homework');
        setHomeworkList(Array.isArray(response?.homeworkList) ? response.homeworkList : []);
      } catch (error) {
        Alert.alert('Homework', error.message || 'Failed to load homework');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'in-progress':
        return '#f59e0b';
      case 'pending':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getDaysRemaining = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return 0;
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />

      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>📚H.W</Text>
            <Text style={styles.headerSubtitle}>Assignment</Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{homeworkList.filter((hw) => hw.status === 'pending').length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{homeworkList.filter((hw) => hw.status === 'completed').length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionText}>Calendar</Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionIcon}>🔍</Text>
          <Text style={styles.actionText}>Search</Text>
        </Pressable>
      </View>

      <View style={styles.homeworkContainer}>
        <Text style={styles.sectionTitle}>Current Assignments</Text>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#667eea" />
            <Text style={styles.loadingText}>Loading assignments...</Text>
          </View>
        ) : homeworkList.length === 0 ? (
          <Text style={styles.emptyText}>No assignments found.</Text>
        ) : (
          homeworkList.map((homework) => (
            <View key={homework.id} style={styles.homeworkCard}>
              <View style={styles.cardHeader}>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectIcon}>{homework.subjectIcon}</Text>
                  <View>
                    <Text style={styles.subjectName}>{homework.subject}</Text>
                    <Text style={styles.homeworkTitle}>{homework.title}</Text>
                  </View>
                </View>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(homework.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(homework.status) }]}>
                      {String(homework.status || '').charAt(0).toUpperCase() + String(homework.status || '').slice(1)}
                    </Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(homework.priority) + '20' }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColor(homework.priority) }]}>
                      {String(homework.priority || '').charAt(0).toUpperCase() + String(homework.priority || '').slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.description}>{homework.description}</Text>

              <View style={styles.cardFooter}>
                <View style={styles.dueInfo}>
                  <Text style={styles.dueLabel}>Due:</Text>
                  <Text style={styles.dueDate}>{homework.dueDate}</Text>
                  <Text style={styles.dueTime}>{homework.dueTime}</Text>
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileSize}>{homework.fileSize}</Text>
                </View>
              </View>

              <View style={styles.daysRemaining}>
                <Text style={styles.daysText}>
                  {getDaysRemaining(homework.dueDateRaw || homework.dueDate) > 0
                    ? `${getDaysRemaining(homework.dueDateRaw || homework.dueDate)} days remaining`
                    : getDaysRemaining(homework.dueDateRaw || homework.dueDate) === 0
                    ? 'Due today!'
                    : 'Overdue!'}
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <Pressable style={styles.downloadButton}>
                  <Text style={styles.downloadIcon}>📥</Text>
                  <Text style={styles.downloadText}>Download</Text>
                </Pressable>
                <Pressable style={styles.submitButton}>
                  <Text style={styles.submitIcon}>📤</Text>
                  <Text style={styles.submitText}>Submit</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
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
    height: 180,
    marginBottom: 24,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#667eea',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#667eea',
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
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  homeworkContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  homeworkCard: {
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subjectIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  homeworkTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 24,
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  dueDate: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '600',
  },
  dueTime: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  fileInfo: {
    alignItems: 'flex-end',
  },
  fileSize: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  daysRemaining: {
    marginBottom: 16,
  },
  daysText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
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
    fontSize: 13,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  submitIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomSpacing: {
    height: 24,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    color: '#64748b',
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748b',
    fontWeight: '600',
  },
});
