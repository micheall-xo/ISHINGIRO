import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '../../services/api';
import { AdminShell, AnimatedCard, SectionTitle, adminColors } from '../../components/admin/AdminUI';

const MODULES = [
  { id: 'dashboard', title: 'Dashboard', subtitle: 'School-wide live analytics', route: '/admin/dashboard', color: '#4f46e5' },
  { id: 'users', title: 'Users', subtitle: 'Create and review user accounts', route: '/admin/users', color: '#2563eb' },
  { id: 'requests', title: 'Requests', subtitle: 'Pending and archived profile updates', route: '/admin/requests', color: '#4338ca' },
  { id: 'classes', title: 'Classes', subtitle: 'Manage classes and lesson catalog', route: '/admin/classes', color: '#0891b2' },
  { id: 'assignments', title: 'Assignments', subtitle: 'Teacher-class and parent-student mapping', route: '/admin/assignments', color: '#0f766e' },
  { id: 'timetable', title: 'Timetable', subtitle: 'Generate and publish AI timetable', route: '/admin/timetable', color: '#7c3aed' },
  { id: 'student-leave', title: 'Student Leave', subtitle: 'Grant leave permissions for attendance', route: '/admin/student-leave', color: '#0284c7' },
  { id: 'notices', title: 'Notices', subtitle: 'Create and publish school notices', route: '/admin/notices', color: '#db2777' },
  { id: 'messages', title: 'Messages', subtitle: 'Cross-gateway communication hub', route: '/admin/messages', color: '#ea580c' },
];

export default function AdminHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  async function loadOverview() {
    try {
      setLoading(true);
      const response = await apiRequest('/admin/dashboard');
      setData(response);
    } catch (error) {
      Alert.alert('Admin', error.message || 'Failed to load control center data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const quickBoxes = useMemo(
    () => [
      { key: 'users', label: 'Users', value: String(data?.users?.total || 0), color: '#4f46e5', route: '/admin/users' },
      { key: 'teachers', label: 'Teachers', value: String(data?.users?.byRole?.teacher || 0), color: '#2563eb', route: '/admin/users?role=teacher' },
      { key: 'parents', label: 'Parents', value: String(data?.users?.byRole?.parent || 0), color: '#0f766e', route: '/admin/users?role=parent' },
      { key: 'students', label: 'Students', value: String(data?.studentAssignments?.totalStudents || 0), color: '#7c3aed', route: '/admin/users?role=student' },
      { key: 'requests', label: 'Requests', value: String(data?.traffic?.totalRequests || 0), color: '#0891b2', route: '/admin/requests' },
      { key: 'messages', label: 'Unread Messages', value: String(data?.unreadMessageCount || 0), color: '#dc2626', route: '/admin/messages' },
    ],
    [data]
  );

  return (
    <AdminShell title="Headmaster Control Center" subtitle="Professional admin workspace with separated modules by function.">
      <AnimatedCard delay={40}>
        <SectionTitle>System Overview</SectionTitle>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={adminColors.accent} />
            <Text style={styles.loadingText}>Loading overview...</Text>
          </View>
        ) : (
          <View style={styles.quickGrid}>
            {quickBoxes.map((box) => (
              <Pressable key={box.key} style={styles.quickBox} onPress={() => router.push(box.route)}>
                <Text style={[styles.quickValue, { color: box.color }]}>{box.value}</Text>
                <Text style={styles.quickLabel}>{box.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </AnimatedCard>

      <AnimatedCard delay={110}>
        <SectionTitle>Admin Modules</SectionTitle>
        <View style={styles.modulesWrap}>
          {MODULES.map((module) => (
            <Pressable key={module.id} style={styles.moduleCard} onPress={() => router.push(module.route)}>
              <View style={[styles.moduleIconWrap, { backgroundColor: `${module.color}22` }]}>
                <View style={[styles.moduleDot, { backgroundColor: module.color }]} />
              </View>
              <View style={styles.moduleText}>
                <Text style={styles.moduleTitle}>{module.title}</Text>
                <Text style={styles.moduleSubtitle} numberOfLines={2}>
                  {module.subtitle}
                </Text>
              </View>
              <Text style={styles.moduleArrow}>{'>'}</Text>
            </Pressable>
          ))}
        </View>
      </AnimatedCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: adminColors.body,
    fontWeight: '600',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickBox: {
    flexBasis: '31%',
    flexGrow: 1,
    minHeight: 88,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    borderRadius: 12,
    backgroundColor: '#f8faff',
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  quickValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  quickLabel: {
    color: '#475569',
    fontWeight: '700',
    marginTop: 2,
    fontSize: 12,
  },
  modulesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moduleCard: {
    minHeight: 122,
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  moduleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  moduleText: {
    marginTop: 8,
    marginBottom: 6,
  },
  moduleTitle: {
    color: '#1e293b',
    fontWeight: '800',
    fontSize: 16,
  },
  moduleSubtitle: {
    color: '#5b6474',
    fontSize: 12,
    marginTop: 4,
  },
  moduleArrow: {
    color: '#334155',
    fontSize: 18,
    fontWeight: '800',
    alignSelf: 'flex-end',
  },
});
