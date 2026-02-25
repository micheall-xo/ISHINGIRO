import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, Alert, Image  } from 'react-native';
import { useRouter } from 'expo-router';
import { usePageData } from '../../services/usePageData';
import GatewayConnector from '../../components/GatewayConnector';	
import { useContext, useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';	
import { confirmLogout } from '../../services/logoutConfirm';
import { AuthContext } from '../_layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HARD_CODED_QUICK_ACCESS = [
	{ id: 'attendance', title: 'Attendance', subtitle: 'Mark attendance', icon: '📝', color: '#3b82f6', route: '/teacher/attendance' },
	{ id: 'add-marks', title: 'Add Marks', subtitle: 'Upload scores', icon: '📊', color: '#10b981', route: '/teacher/add-marks' },
	{ id: 'messages', title: 'Messages', subtitle: 'Chat with parents/admin', icon: '💬', color: '#2563eb', route: '/teacher/messages' },
	{ id: 'results', title: 'Results', subtitle: 'Review results', icon: '📈', color: '#f59e0b', route: '/teacher/results' },
	{ id: 'homework', title: 'Homework', subtitle: 'Manage homework', icon: '📚', color: '#8b5cf6', route: '/teacher/homework' },
	{ id: 'notices', title: 'Notices', subtitle: 'Post notices', icon: '📢', color: '#ef4444', route: '/teacher/notices' },
	{ id: 'exam-routine', title: 'Exam Routine', subtitle: 'Set exam plan', icon: '📅', color: '#06b6d4', route: '/teacher/exam-routine' },
	{ id: 'profile', title: 'Profile', subtitle: 'View and edit profile', icon: '👤', color: '#14b8a6', route: '/teacher/profile' }
];


	export default function TeacherHome() {
	usePageData('teacher-index');
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { signOut } = useContext(AuthContext);
	const [user, setUser] = useState({
		name: 'Teacher',
		grade: 'Class Overview',
		avatar: 'TC',
		profilePicture: '',
	});
	const [studentsCount, setStudentsCount] = useState(0);

	useEffect(() => {
		const fetchUserData = async () => {
			try {
				const profile = await apiRequest('/auth/profile');
				setUser({
					name: profile?.fullName || 'Teacher',
					grade: profile?.role ? String(profile.role).toUpperCase() : 'Class Overview',
					avatar: ((profile?.fullName || 'Teacher').match(/\b\w/g) || []).slice(0, 2).join('').toUpperCase() || 'TC',
					profilePicture: profile?.profilePicture || '',
				});

				if (profile?.id) {
					const students = await apiRequest(`/teachers/${profile.id}/students`);
					if (Array.isArray(students)) {
						setStudentsCount(students.length);
					}
				}
			} catch (e) {
				console.error('Failed to fetch user data:', e);
			}
		};

		fetchUserData();
	}, []);
	
	const features = HARD_CODED_QUICK_ACCESS;

	const quickStats = [
		{ label: 'Students', value: String(studentsCount), color: '#3b82f6' },
		{ label: 'Exams', value: '2', color: '#ef4444' },
		{ label: 'Attendance', value: 'N/A', color: '#10b981' }
	];

	const onLogout = () => {
		confirmLogout({
			title: 'Logout',
			message: 'Do you want to end your session?',
			webMessage: 'Do you want to end your session?',
			onConfirm: async () => {
				await signOut();
				router.replace('/choose');
			},
		});
	};

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 12) }}
			showsVerticalScrollIndicator={false}
		>
			<StatusBar barStyle="light-content" backgroundColor="#667eea" />
			
			{/* Header Section */}
			<View style={styles.header}>
				<View style={styles.headerBackground} />
				<View style={[styles.headerContent, { paddingTop: Math.max(60, insets.top + 20) }]}>
					<View style={styles.userInfo}>
						<View style={styles.avatarContainer}>
							{user.profilePicture ? (
								<Image source={{ uri: user.profilePicture }} style={styles.avatarImage} />
							) : (
								<Text style={styles.avatar}>{user.avatar}</Text>
							)}
						</View>
						<View style={styles.userDetails}>
							<Text style={styles.greeting}>Welcome back,</Text>
							<Text style={styles.userName}>{user.name}</Text>
							<Text style={styles.userGrade}>{user.grade}</Text>
						</View>
					</View>
					{/* <View style={styles.headerActions}>
						<GatewayConnector currentGateway="student" onDataUpdate={(data) => {
							console.log('Student gateway received data:', data);
							// Handle incoming data updates
						}} />
						
					</View> */}
					<Pressable style={styles.notificationButton} onPress={() => router.push('/notifications')}>
							<Text style={styles.notificationIcon}>🔔</Text>
							<View style={styles.notificationBadge} />
						</Pressable>
						<Pressable style={styles.logoutButton} onPress={onLogout}>
							<Text style={styles.logoutText}>Logout</Text>
						</Pressable>
				</View>
			</View>

			{/* Quick Stats Section */}
			
			<View style={styles.statsContainer}>
				<Text style={styles.sectionTitle}>Quick Overview</Text>
				<View style={styles.statsGrid}>
					{quickStats.map((stat, index) => (
						<View key={index} style={styles.statCard}>
							<Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
							<Text style={styles.statLabel}>{stat.label}</Text>
						</View>
					))}
				</View>
			</View>

			{/* Features Grid */}
			<View style={styles.featuresContainer}>
				<Text style={styles.sectionTitle}>Quick Access</Text>
				<View style={styles.featuresGrid}>
					{features.map((feature) => (
						<Pressable 
							key={feature.id} 
							style={styles.featureCard}
							onPress={() => router.push(feature.route)}
						>
							<View style={[styles.featureIconContainer, { backgroundColor: feature.color + '20' }]}>
								<Text style={styles.featureIcon}>{feature.icon}</Text>
							</View>
							<Text style={styles.featureTitle}>{feature.title}</Text>
							<Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
							<View style={[styles.featureArrow, { backgroundColor: feature.color + '20' }]}>
								<Text style={[styles.arrowText, { color: feature.color }]}>➡️</Text>
							</View>
						</Pressable>
					))}
				</View>
			</View>

			{/* Recent Activity Section */}
			<View style={styles.activityContainer}>
				<Text style={styles.sectionTitle}>Recent Activity</Text>
				<View style={styles.activityCard}>
					<View style={styles.activityItem}>
						<View style={styles.activityIcon}>
							<Text>📚</Text>
						</View>
						<View style={styles.activityContent}>
							<Text style={styles.activityTitle}>Math Assignment Due</Text>
							<Text style={styles.activityTime}>Due in 2 hours</Text>
						</View>
						<View style={styles.activityStatus}>
							<Text style={styles.statusText}>Urgent</Text>
						</View>
					</View>
					<View style={styles.activityItem}>
						<View style={styles.activityIcon}>
								<Text>📊</Text>
						</View>
						<View style={styles.activityContent}>
							<Text style={styles.activityTitle}>Science Quiz Results</Text>
							<Text style={styles.activityTime}>Available now</Text>
						</View>
						<View style={styles.activityStatus}>
							<Text style={styles.statusText}>New</Text>
						</View>
					</View>
				</View>
			</View>

			{/* Bottom Spacing */}
			<View style={[styles.bottomSpacing, { height: Math.max(24, insets.bottom + 12) }]} />
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
		height: 300,
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
	userInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	avatarContainer: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: 'rgba(255,255,255,0.2)',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 16,
		borderWidth: 2,
		borderColor: 'rgba(255,255,255,0.3)',
	},
	avatar: {
		fontSize: 28,
	},
	avatarImage: {
		width: '100%',
		height: '100%',
		borderRadius: 30,
	},
	userDetails: {
		flex: 1,
	},
	greeting: {
		fontSize: 16,
		color: 'rgba(255,255,255,0.8)',
		fontWeight: '500',
		marginBottom: 4,
	},
	userName: {
		fontSize: 24,
		fontWeight: '800',
		color: '#ffffff',
		marginBottom: 4,
		letterSpacing: -0.5,
	},
	userGrade: {
		fontSize: 14,
		color: 'rgba(255,255,255,0.9)',
		fontWeight: '600',
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	notificationButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: 'rgba(255,255,255,0.2)',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.3)',
		position: 'relative',
	},
	notificationIcon: {
		fontSize: 20,
	},
	notificationBadge: {
		position: 'absolute',
		top: 8,
		right: 8,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#ef4444',
		borderWidth: 2,
		borderColor: '#ffffff',
	},
	logoutButton: {
		marginLeft: 10,
		backgroundColor: 'rgba(239,68,68,0.22)',
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.35)',
	},
	logoutText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 12,
	},
	statsContainer: {
		paddingHorizontal: 24,
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 22,
		fontWeight: '800',
		color: '#1e293b',
		marginBottom: 16,
		letterSpacing: -0.5,
	},
	statsGrid: {
		flexDirection: 'row',
		gap: 16,
	},
	statCard: {
		flex: 1,
		backgroundColor: '#ffffff',
		padding: 20,
		borderRadius: 16,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 3,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.8)',
	},
	statValue: {
		fontSize: 28,
		fontWeight: '800',
		marginBottom: 8,
		letterSpacing: -0.5,
	},
	statLabel: {
		fontSize: 14,
		color: '#64748b',
		fontWeight: '600',
		textAlign: 'center',
	},
	featuresContainer: {
		paddingHorizontal: 24,
		marginBottom: 32,
	},
	featuresGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 16,
		justifyContent: 'space-between',
	},
	featureCard: {
		width: '47%',
		backgroundColor: '#ffffff',
		padding: 20,
		borderRadius: 20,
		alignItems: 'center',
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 6,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.8)',
		position: 'relative',
		overflow: 'hidden',
	},
	featureIconContainer: {
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16,
	},
	featureIcon: {
		fontSize: 28,
	},
	featureTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1e293b',
		textAlign: 'center',
		marginBottom: 6,
		letterSpacing: -0.3,
	},
	featureSubtitle: {
		fontSize: 13,
		color: '#64748b',
		textAlign: 'center',
		marginBottom: 16,
		lineHeight: 18,
	},
	featureArrow: {
		position: 'absolute',
		bottom: 12,
		right: 12,
		width: 24,
		height: 24,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	arrowText: {
		fontSize: 16,
		fontWeight: '800',
	},
	activityContainer: {
		paddingHorizontal: 24,
		marginBottom: 32,
	},
	activityCard: {
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
	activityItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	activityIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#f8fafc',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 16,
	},
	activityContent: {
		flex: 1,
	},
	activityTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1e293b',
		marginBottom: 4,
	},
	activityTime: {
		fontSize: 14,
		color: '#64748b',
		fontWeight: '500',
	},
	activityStatus: {
		backgroundColor: '#fef3c7',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
	},
	statusText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#d97706',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	bottomSpacing: {
		height: 24,
	},
});





