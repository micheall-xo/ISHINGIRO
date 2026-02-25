import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, Image } from 'react-native';
import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'expo-router';
import { apiRequest } from '../../services/api';
import { AuthContext } from '../_layout';

export default function StudentProfile() {
	const router = useRouter();
	const auth = useContext(AuthContext);
	const [studentData, setStudentData] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadStudentData();
	}, []);

	const loadStudentData = async () => {
		try {
			setLoading(true);
			const [profile, latestRequest] = await Promise.all([
				apiRequest('/auth/profile'),
				apiRequest('/auth/profile-edit-request'),
			]);
			if (profile) {
				const studentInfo = profile.studentInfo || {};
				const attendance = studentInfo.attendance || {};
				const totalDays = attendance.totalDays || 0;
				const presentDays = attendance.presentDays || 0;
				const attendancePct = totalDays > 0 ? `${Math.round((presentDays / totalDays) * 100)}%` : '0%';
				const emergency = studentInfo.emergencyContact || {};
				const emergencyName = emergency.name || '';
				const emergencyPhone = emergency.phone || '';
				const parents = Array.isArray(studentInfo.parents) ? studentInfo.parents : [];
				const primaryGuardian = parents[0]?.parent || {};
				const formatDate = (value) => {
					if (!value) return '-';
					const date = new Date(value);
					if (Number.isNaN(date.getTime())) return String(value);
					return date.toISOString().slice(0, 10);
				};
				const formattedAddress =
					studentInfo.address && typeof studentInfo.address === 'object'
						? [
								studentInfo.address.street,
								studentInfo.address.city,
								studentInfo.address.state,
								studentInfo.address.zipCode,
								studentInfo.address.country,
						  ]
								.filter(Boolean)
								.join(', ')
						: '';

				const requestProfilePicture = latestRequest?.request?.payload?.profilePicture || '';
				const effectiveProfilePicture = profile.profilePicture || requestProfilePicture || '';

				setStudentData({
					id: profile.id || profile._id || '',
					fullName: profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Student',
					grade: studentInfo.grade ? `${studentInfo.grade}${studentInfo.section ? ` ${studentInfo.section}` : ''}` : 'Unassigned',
					rollNo: studentInfo.studentId || '-',
					address: formattedAddress || '-',
					guardianName: [primaryGuardian.firstName, primaryGuardian.lastName].filter(Boolean).join(' ') || '-',
					guardianContact: primaryGuardian.phoneNumber || '-',
					email: profile.email || '-',
					phone: profile.phoneNumber || '-',
					dateOfBirth: formatDate(studentInfo.dateOfBirth),
					bloodGroup: studentInfo.bloodGroup || '-',
					emergencyContact: [emergencyName, emergencyPhone].filter(Boolean).join(' - ') || '-',
					academicYear: studentInfo.academicYear || '-',
					enrollmentDate: formatDate(studentInfo.createdAt),
					attendance: attendancePct,
					overallGrade: studentInfo.performance?.overallGrade || 'N/A',
					gpa: String(studentInfo.performance?.gpa ?? 0),
					profilePicture: effectiveProfilePicture,
					pendingEditStatus: profile.pendingProfileEditRequest?.status || ''
				});
			}
		} catch (error) {
			console.error('Failed to load student data:', error);
		} finally {
			setLoading(false);
		}
	};

	if (loading || !studentData) {
		return (
			<View style={styles.container}>
				<Text style={styles.loadingText}>Loading profile...</Text>
			</View>
		);
	}

	const academicStats = [
		{ label: 'Attendance', value: studentData.attendance, color: '#10b981', icon: 'AT' },
		{ label: 'Overall Grade', value: studentData.overallGrade, color: '#3b82f6', icon: 'GR' },
		{ label: 'GPA', value: studentData.gpa, color: '#f59e0b', icon: 'GP' }
	];

	const quickActions = [
		{ icon: 'EP', label: 'Edit Profile', action: 'edit' },
		{ icon: 'CI', label: 'Contact Info', action: 'contact' },
		{ icon: 'PR', label: 'Privacy', action: 'privacy' },
		{ icon: 'NT', label: 'Notifications', action: 'notifications' }
	];

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			<StatusBar barStyle="light-content" backgroundColor="#8b5cf6" />
			
			{/* Header Section */}
			<View style={styles.header}>
				<View style={styles.headerBackground} />
				<View style={styles.headerContent}>
					<View style={styles.avatarContainer}>
						{studentData.profilePicture ? (
							<Image source={{ uri: studentData.profilePicture }} style={[styles.avatar, { backgroundColor: '#8b5cf6' }]} />
						) : (
							<View style={[styles.avatar, { backgroundColor: '#8b5cf6' }]}>
								<Text style={styles.avatarText}>ST</Text>
							</View>
						)}
						<View style={styles.onlineIndicator} />
					</View>
					<View style={styles.headerInfo}>
						<Text style={styles.studentName}>{studentData.fullName}</Text>
						<Text style={styles.studentGrade}>{studentData.grade}</Text>
						<Text style={styles.studentId}>ID: {studentData.id}</Text>
					</View>
				</View>
			</View>

			{studentData.pendingEditStatus ? (
				<View style={styles.requestStatusCard}>
					<Text style={styles.requestStatusText}>
						Profile edit request: {String(studentData.pendingEditStatus).toUpperCase()}
					</Text>
				</View>
			) : null}

			{/* Academic Stats */}
			<View style={styles.statsContainer}>
				<Text style={styles.sectionTitle}>Academic Performance</Text>
				<View style={styles.statsGrid}>
					{academicStats.map((stat, index) => (
						<View key={index} style={styles.statCard}>
							<Text style={styles.statIcon}>{stat.icon}</Text>
							<Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
							<Text style={styles.statLabel}>{stat.label}</Text>
						</View>
					))}
				</View>
			</View>

			{/* Quick Actions */}
			<View style={styles.actionsContainer}>
				<Text style={styles.sectionTitle}>Quick Actions</Text>
				<View style={styles.actionsGrid}>
					{quickActions.map((action, index) => (
						<Pressable key={index} style={styles.actionCard} onPress={async () => {
							if (action.action === 'edit') {
								await auth?.refreshProfile?.();
								router.push('/profile-edit');
								return;
							}
							if (action.action === 'notifications') {
								router.push('/notifications');
								return;
							}
							Alert.alert(action.label, 'This section will be expanded next.');
						}}>
							<Text style={styles.actionIcon}>{action.icon}</Text>
							<Text style={styles.actionLabel}>{action.label}</Text>
						</Pressable>
					))}
				</View>
			</View>

			{/* Personal Information */}
			<View style={styles.infoContainer}>
					<Text style={styles.sectionTitle}>Personal Information</Text>
					<View style={styles.infoCard}>
						<InfoField label="Full Name" value={studentData.fullName} icon="FN" />
						<InfoField label="Date of Birth" value={studentData.dateOfBirth} icon="DB" />
						<InfoField label="Blood Group" value={studentData.bloodGroup} icon="BG" />
						<InfoField label="Address" value={studentData.address} icon="AD" />
						<InfoField label="Email" value={studentData.email} icon="EM" />
						<InfoField label="Phone" value={studentData.phone} icon="PH" />
					</View>
				</View>

			{/* Academic Information */}
			<View style={styles.infoContainer}>
					<Text style={styles.sectionTitle}>Academic Information</Text>
					<View style={styles.infoCard}>
						<InfoField label="Grade" value={studentData.grade} icon="GD" />
						<InfoField label="Roll Number" value={studentData.rollNo} icon="RN" />
						<InfoField label="Academic Year" value={studentData.academicYear} icon="AY" />
						<InfoField label="Enrollment Date" value={studentData.enrollmentDate} icon="ED" />
					</View>
				</View>

			{/* Guardian Information */}
			<View style={styles.infoContainer}>
					<Text style={styles.sectionTitle}>Guardian Information</Text>
					<View style={styles.infoCard}>
						<InfoField label="Guardian's Name" value={studentData.guardianName} icon="GN" />
						<InfoField label="Guardian's Contact" value={studentData.guardianContact} icon="GC" />
						<InfoField label="Emergency Contact" value={studentData.emergencyContact} icon="EC" />
					</View>
				</View>

			{/* Action Buttons */}
			<View style={styles.buttonContainer}>
				<Pressable style={styles.editButton} onPress={async () => {
					await auth?.refreshProfile?.();
					router.push('/profile-edit');
				}}>
					<Text style={styles.editIcon}></Text>
					<Text style={styles.editText}>Request Profile Edit</Text>
				</Pressable>
				<Pressable style={styles.shareButton}>
					<Text style={styles.shareIcon}></Text>
					<Text style={styles.shareText}>Share Profile</Text>
				</Pressable>
			</View>
			
			<View style={styles.bottomSpacing} />
		</ScrollView>
	);
}

function InfoField({ label, value, icon }) {
	return (
		<View style={styles.fieldRow}>
			<View style={styles.fieldHeader}>
				<Text style={styles.fieldIcon}>{icon}</Text>
				<Text style={styles.fieldLabel}>{label}</Text>
			</View>
			<Text style={styles.fieldValue}>{value || '-'}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	header: {
		position: 'relative',
		height: 320,
		marginBottom: 24,
	},
	headerBackground: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		height: '100%',
		backgroundColor: '#8b5cf6',
		borderBottomLeftRadius: 30,
		borderBottomRightRadius: 30,
		shadowColor: '#8b5cf6',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 16,
		elevation: 8,
	},
	headerContent: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
		paddingTop: 60,
	},
	avatarContainer: {
		position: 'relative',
		marginBottom: 16,
	},
	avatar: {
		width: 120,
		height: 120,
		borderRadius: 60,
		borderWidth: 4,
		borderColor: '#ffffff',
	},
	onlineIndicator: {
		position: 'absolute',
		bottom: 8,
		right: 8,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: '#10b981',
		borderWidth: 3,
		borderColor: '#ffffff',
	},
	headerInfo: {
		alignItems: 'center',
	},
	studentName: {
		fontSize: 28,
		fontWeight: '800',
		color: '#ffffff',
		marginBottom: 8,
		letterSpacing: -0.5,
		textAlign: 'center',
	},
	studentGrade: {
		fontSize: 18,
		color: 'rgba(255,255,255,0.9)',
		fontWeight: '600',
		marginBottom: 4,
	},
	studentId: {
		fontSize: 14,
		color: 'rgba(255,255,255,0.8)',
		fontWeight: '500',
	},
	statsContainer: {
		paddingHorizontal: 24,
		marginBottom: 24,
	},
	requestStatusCard: {
		marginHorizontal: 24,
		marginBottom: 16,
		backgroundColor: '#eff6ff',
		borderColor: '#bfdbfe',
		borderWidth: 1,
		borderRadius: 10,
		padding: 10,
	},
	requestStatusText: {
		color: '#1e3a8a',
		fontWeight: '700',
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
	statIcon: {
		fontSize: 24,
		marginBottom: 12,
	},
	statValue: {
		fontSize: 24,
		fontWeight: '800',
		marginBottom: 8,
		letterSpacing: -0.5,
	},
	statLabel: {
		fontSize: 12,
		color: '#64748b',
		fontWeight: '600',
		textAlign: 'center',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	actionsContainer: {
		paddingHorizontal: 24,
		marginBottom: 24,
	},
	actionsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 16,
		justifyContent: 'space-between',
	},
	actionCard: {
		width: '47%',
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
	actionIcon: {
		fontSize: 24,
		marginBottom: 12,
	},
	actionLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1e293b',
		textAlign: 'center',
	},
	infoContainer: {
		paddingHorizontal: 24,
		marginBottom: 24,
	},
	infoCard: {
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
	fieldRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	fieldHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	fieldIcon: {
		fontSize: 12,
		fontWeight: '800',
		color: '#475569',
		marginRight: 12,
	},
	fieldLabel: {
		fontSize: 14,
		color: '#64748b',
		fontWeight: '600',
		flex: 1,
	},
	fieldValue: {
		fontSize: 14,
		color: '#1e293b',
		fontWeight: '600',
		textAlign: 'right',
		maxWidth: '58%',
		flexShrink: 1,
	},
	buttonContainer: {
		paddingHorizontal: 24,
		marginBottom: 32,
		gap: 16,
	},
	editButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#3b82f6',
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 16,
		shadowColor: '#3b82f6',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 6,
	},
	editIcon: {
		fontSize: 18,
		marginRight: 12,
	},
	editText: {
		color: '#ffffff',
		fontWeight: '700',
		fontSize: 16,
	},
	shareButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#10b981',
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 16,
		shadowColor: '#10b981',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 6,
	},
	shareIcon: {
		fontSize: 18,
		marginRight: 12,
	},
	shareText: {
		color: '#ffffff',
		fontWeight: '700',
		fontSize: 16,
	},
	bottomSpacing: {
		height: 24,
	},
	loadingText: {
		textAlign: 'center',
		color: '#64748b',
		fontSize: 16,
		marginTop: 50,
	},
	avatarText: {
		fontSize: 36,
		fontWeight: '800',
		color: '#ffffff',
	},
});

