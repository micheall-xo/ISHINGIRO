import dataSharingService from './DataSharingService';

class GatewayIntegrationService {
	constructor() {
		this.isInitialized = false;
		this.gatewayConnections = new Map();
		this.dataSubscribers = new Map();
		this.notificationHandlers = new Map();
	}

	// Initialize the integration service
	async initialize() {
		if (this.isInitialized) return;

		try {
			// Initialize data sharing service
			await dataSharingService.initialize();
			
			// Set up gateway connections
			this.setupGatewayConnections();
			
			// Set up data subscribers
			this.setupDataSubscribers();
			
			// Set up notification handlers
			this.setupNotificationHandlers();
			
			this.isInitialized = true;
			console.log('GatewayIntegrationService initialized successfully');
		} catch (error) {
			console.error('Failed to initialize GatewayIntegrationService:', error);
		}
	}

	// Set up connections between different gateways
	setupGatewayConnections() {
		// Teacher -> Student connections
		this.gatewayConnections.set('teacher_student', {
			from: 'teacher',
			to: 'student',
			capabilities: ['grade_update', 'attendance_update', 'homework_assignment', 'notice_send'],
			description: 'Teachers can update grades, attendance, assign homework, and send notices to students'
		});

		// Teacher -> Guest connections
		this.gatewayConnections.set('teacher_guest', {
			from: 'teacher',
			to: 'guest',
			capabilities: ['progress_report', 'attendance_report', 'behavior_update', 'parent_communication'],
			description: 'Teachers can send progress reports, attendance updates, and communicate with parents'
		});

		// Student -> Teacher connections
		this.gatewayConnections.set('student_teacher', {
			from: 'student',
			to: 'teacher',
			capabilities: ['homework_submission', 'question_ask', 'attendance_status', 'feedback_provide'],
			description: 'Students can submit homework, ask questions, report attendance, and provide feedback'
		});

		// Student -> Guest connections
		this.gatewayConnections.set('student_guest', {
			from: 'student',
			to: 'guest',
			capabilities: ['activity_update', 'achievement_share', 'emergency_alert', 'location_share'],
			description: 'Students can share activities, achievements, send emergency alerts, and share location'
		});

		// Guest -> Teacher connections
		this.gatewayConnections.set('guest_teacher', {
			from: 'guest',
			to: 'teacher',
			capabilities: ['parent_feedback', 'meeting_request', 'concern_raise', 'appreciation_send'],
			description: 'Parents can provide feedback, request meetings, raise concerns, and send appreciation'
		});

		// Guest -> Student connections
		this.gatewayConnections.set('guest_student', {
			from: 'guest',
			to: 'student',
			capabilities: ['pocket_money_update', 'emergency_contact', 'permission_grant', 'reward_give'],
			description: 'Parents can update pocket money, emergency contacts, grant permissions, and give rewards'
		});
	}

	// Set up data subscribers for real-time updates
	setupDataSubscribers() {
		// Subscribe to teacher data updates
		dataSharingService.subscribe('teacher', (data) => {
			this.handleTeacherDataUpdate(data);
		});

		// Subscribe to student data updates
		dataSharingService.subscribe('student', (data) => {
			this.handleStudentDataUpdate(data);
		});

		// Subscribe to guest data updates
		dataSharingService.subscribe('guest', (data) => {
			this.handleGuestDataUpdate(data);
		});
	}

	// Set up notification handlers
	setupNotificationHandlers() {
		// Teacher notification handlers
		this.notificationHandlers.set('teacher', {
			homework_submitted: this.handleHomeworkSubmitted,
			attendance_alert: this.handleAttendanceAlert,
			parent_message: this.handleParentMessage,
			grade_request: this.handleGradeRequest
		});

		// Student notification handlers
		this.notificationHandlers.set('student', {
			homework_assigned: this.handleHomeworkAssigned,
			grade_updated: this.handleGradeUpdated,
			notice_received: this.handleNoticeReceived,
			exam_scheduled: this.handleExamScheduled
		});

		// Guest notification handlers
		this.notificationHandlers.set('guest', {
			child_absent: this.handleChildAbsent,
			grade_update: this.handleGradeUpdate,
			spending_alert: this.handleSpendingAlert,
			teacher_message: this.handleTeacherMessage
		});
	}

	// Handle teacher data updates
	handleTeacherDataUpdate(data) {
		switch (data.type) {
			case 'grade_update':
				this.notifyStudents(data.data.studentId, 'grade_updated', data.data);
				this.notifyParents(data.data.studentId, 'grade_update', data.data);
				break;
			case 'attendance_update':
				this.notifyParents(data.data.studentId, 'attendance_update', data.data);
				break;
			case 'homework_assignment':
				this.notifyStudents(data.data.classId, 'homework_assigned', data.data);
				break;
			case 'notice_send':
				this.broadcastNotice(data.data);
				break;
		}
	}

	// Handle student data updates
	handleStudentDataUpdate(data) {
		switch (data.type) {
			case 'homework_submission':
				this.notifyTeachers(data.data.teacherId, 'homework_submitted', data.data);
				break;
			case 'attendance_status':
				this.notifyTeachers(data.data.teacherId, 'attendance_status', data.data);
				break;
			case 'question_ask':
				this.notifyTeachers(data.data.teacherId, 'question_ask', data.data);
				break;
		}
	}

	// Handle guest data updates
	handleGuestDataUpdate(data) {
		switch (data.type) {
			case 'parent_feedback':
				this.notifyTeachers(data.data.teacherId, 'parent_feedback', data.data);
				break;
			case 'pocket_money_update':
				this.notifyStudents(data.data.childId, 'pocket_money_updated', data.data);
				break;
			case 'emergency_contact':
				this.notifyTeachers(data.data.teacherId, 'emergency_contact', data.data);
				break;
		}
	}

	// Notify specific students
	notifyStudents(studentId, eventType, data) {
		const notification = {
			id: Date.now(),
			type: eventType,
			data: data,
			timestamp: new Date().toISOString(),
			priority: 'normal'
		};

		dataSharingService.shareData('system', 'student', notification, 'notification');
	}

	// Notify specific parents
	notifyParents(studentId, eventType, data) {
		const notification = {
			id: Date.now(),
			type: eventType,
			data: data,
			timestamp: new Date().toISOString(),
			priority: 'normal'
		};

		dataSharingService.shareData('system', 'guest', notification, 'notification');
	}

	// Notify specific teachers
	notifyTeachers(teacherId, eventType, data) {
		const notification = {
			id: Date.now(),
			type: eventType,
			data: data,
			timestamp: new Date().toISOString(),
			priority: 'normal'
		};

		dataSharingService.shareData('system', 'teacher', notification, 'notification');
	}

	// Broadcast notice to all gateways
	broadcastNotice(noticeData) {
		const notice = {
			id: Date.now(),
			title: noticeData.title,
			content: noticeData.content,
			priority: noticeData.priority || 'normal',
			timestamp: new Date().toISOString(),
			author: noticeData.author
		};

		// Send to all gateways
		['student', 'guest', 'teacher'].forEach(gateway => {
			dataSharingService.shareData('system', gateway, notice, 'notice');
		});
	}

	// Teacher notification handlers
	handleHomeworkSubmitted(data) {
		console.log('Teacher: Homework submitted by student', data);
		// Handle homework submission notification
	}

	handleAttendanceAlert(data) {
		console.log('Teacher: Attendance alert for student', data);
		// Handle attendance alert
	}

	handleParentMessage(data) {
		console.log('Teacher: Message from parent', data);
		// Handle parent message
	}

	handleGradeRequest(data) {
		console.log('Teacher: Grade request from student', data);
		// Handle grade request
	}

	// Student notification handlers
	handleHomeworkAssigned(data) {
		console.log('Student: New homework assigned', data);
		// Handle homework assignment
	}

	handleGradeUpdated(data) {
		console.log('Student: Grade updated', data);
		// Handle grade update
	}

	handleNoticeReceived(data) {
		console.log('Student: Notice received', data);
		// Handle notice
	}

	handleExamScheduled(data) {
		console.log('Student: Exam scheduled', data);
		// Handle exam schedule
	}

	// Guest notification handlers
	handleChildAbsent(data) {
		console.log('Guest: Child absent notification', data);
		// Handle absence notification
	}

	handleGradeUpdate(data) {
		console.log('Guest: Child grade update', data);
		// Handle grade update
	}

	handleSpendingAlert(data) {
		console.log('Guest: Spending alert', data);
		// Handle spending alert
	}

	handleTeacherMessage(data) {
		console.log('Guest: Message from teacher', data);
		// Handle teacher message
	}

	// Cross-gateway data sharing methods
	async shareStudentProgress(studentId, progressData) {
		try {
			// Share with teachers
			await dataSharingService.shareStudentData('system', studentId, {
				...progressData,
				sharedAt: new Date().toISOString()
			});

			// Share with parents
			await dataSharingService.shareData('system', 'guest', {
				studentId,
				...progressData,
				sharedAt: new Date().toISOString()
			}, 'student_progress');

			return true;
		} catch (error) {
			console.error('Failed to share student progress:', error);
			return false;
		}
	}

	async shareTeacherUpdate(teacherId, updateData) {
		try {
			// Share with students
			await dataSharingService.shareData('system', 'student', {
				teacherId,
				...updateData,
				sharedAt: new Date().toISOString()
			}, 'teacher_update');

			// Share with parents
			await dataSharingService.shareData('system', 'guest', {
				teacherId,
				...updateData,
				sharedAt: new Date().toISOString()
			}, 'teacher_update');

			return true;
		} catch (error) {
			console.error('Failed to share teacher update:', error);
			return false;
		}
	}

	async shareParentUpdate(parentId, updateData) {
		try {
			// Share with teachers
			await dataSharingService.shareParentFeedback(parentId, 'system', {
				...updateData,
				sharedAt: new Date().toISOString()
			});

			// Share with students
			await dataSharingService.shareData('system', 'student', {
				parentId,
				...updateData,
				sharedAt: new Date().toISOString()
			}, 'parent_update');

			return true;
		} catch (error) {
			console.error('Failed to share parent update:', error);
			return false;
		}
	}

	// Get gateway connection information
	getGatewayConnections() {
		return Array.from(this.gatewayConnections.values());
	}

	// Get connection capabilities between two gateways
	getConnectionCapabilities(fromGateway, toGateway) {
		const connectionKey = `${fromGateway}_${toGateway}`;
		const connection = this.gatewayConnections.get(connectionKey);
		return connection ? connection.capabilities : [];
	}

	// Check if two gateways can communicate
	canGatewaysCommunicate(fromGateway, toGateway) {
		const capabilities = this.getConnectionCapabilities(fromGateway, toGateway);
		return capabilities.length > 0;
	}

	// Get all data shared between gateways
	async getSharedDataBetweenGateways(fromGateway, toGateway, filters = {}) {
		try {
			const data = await dataSharingService.getSharedData(toGateway, {
				...filters,
				source: fromGateway
			});
			return data;
		} catch (error) {
			console.error('Failed to get shared data between gateways:', error);
			return [];
		}
	}

	// Sync data across all gateways
	async syncAllGateways() {
		try {
			await dataSharingService.syncData();
			console.log('All gateways synchronized successfully');
			return true;
		} catch (error) {
			console.error('Failed to sync all gateways:', error);
			return false;
		}
	}

	// Get integration service statistics
	async getIntegrationStats() {
		try {
			const dataSharingStats = await dataSharingService.getServiceStats();
			const gatewayConnections = this.gatewayConnections.size;
			const activeSubscribers = this.dataSubscribers.size;

			return {
				dataSharing: dataSharingStats,
				gatewayConnections,
				activeSubscribers,
				isInitialized: this.isInitialized,
				lastUpdate: new Date().toISOString()
			};
		} catch (error) {
			console.error('Failed to get integration stats:', error);
			return null;
		}
	}

	// Clean up the integration service
	async cleanup() {
		try {
			// Clean up data sharing service
			await dataSharingService.destroy();
			
			// Clear local data
			this.gatewayConnections.clear();
			this.dataSubscribers.clear();
			this.notificationHandlers.clear();
			
			this.isInitialized = false;
			console.log('GatewayIntegrationService cleaned up successfully');
		} catch (error) {
			console.error('Failed to cleanup GatewayIntegrationService:', error);
		}
	}
}

// Create singleton instance
const gatewayIntegrationService = new GatewayIntegrationService();

export default gatewayIntegrationService;
