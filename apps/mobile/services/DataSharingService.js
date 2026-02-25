import AsyncStorage from '@react-native-async-storage/async-storage';
// import AsyncStorage from '@react-native-async-storage/async-storage';


class DataSharingService {
	constructor() {
		this.listeners = new Map();
		this.dataCache = new Map();
		this.syncInterval = null;
		this.isInitialized = false;
	}

	// Initialize the service
	async initialize() {
		if (this.isInitialized) return;
		
		try {
			// Load cached data
			await this.loadCachedData();
			
			// Start sync interval
			this.startSyncInterval();
			
			this.isInitialized = true;
			console.log('DataSharingService initialized successfully');
		} catch (error) {
			console.error('Failed to initialize DataSharingService:', error);
		}
	}

	// Start automatic sync every 30 seconds
	startSyncInterval() {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
		}
		
		this.syncInterval = setInterval(() => {
			this.syncData();
		}, 30000);
	}

	// Stop sync interval
	stopSyncInterval() {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
		}
	}

	// Load cached data from AsyncStorage
	async loadCachedData() {
		try {
			const cachedData = await AsyncStorage.getItem('gatewayDataCache');
			if (cachedData) {
				this.dataCache = new Map(JSON.parse(cachedData));
			}
		} catch (error) {
			console.error('Failed to load cached data:', error);
		}
	}

	// Save data to cache
	async saveToCache() {
		try {
			const cacheData = Array.from(this.dataCache.entries());
			await AsyncStorage.setItem('gatewayDataCache', JSON.stringify(cacheData));
		} catch (error) {
			console.error('Failed to save cache:', error);
		}
	}

	// Share data between gateways
	async shareData(source, target, data, type) {
		try {
			const shareId = `${source}_${target}_${Date.now()}`;
			const shareData = {
				id: shareId,
				source,
				target,
				data,
				type,
				timestamp: new Date().toISOString(),
				status: 'pending'
			};

			// Store in cache
			this.dataCache.set(shareId, shareData);
			await this.saveToCache();

			// Notify listeners
			this.notifyListeners(target, shareData);

			// Simulate network delay
			setTimeout(() => {
				shareData.status = 'delivered';
				this.dataCache.set(shareId, shareData);
				this.saveToCache();
				this.notifyListeners(target, shareData);
			}, 1000);

			return shareId;
		} catch (error) {
			console.error('Failed to share data:', error);
			throw error;
		}
	}

	// Get shared data for a specific gateway
	async getSharedData(gateway, filters = {}) {
		try {
			const data = Array.from(this.dataCache.values())
				.filter(item => item.target === gateway)
				.filter(item => {
					if (filters.type && item.type !== filters.type) return false;
					if (filters.status && item.status !== filters.status) return false;
					if (filters.source && item.source !== filters.source) return false;
					return true;
				})
				.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

			return data;
		} catch (error) {
			console.error('Failed to get shared data:', error);
			return [];
		}
	}

	// Subscribe to data updates
	subscribe(gateway, callback) {
		if (!this.listeners.has(gateway)) {
			this.listeners.set(gateway, new Set());
		}
		this.listeners.get(gateway).add(callback);

		// Return unsubscribe function
		return () => {
			const gatewayListeners = this.listeners.get(gateway);
			if (gatewayListeners) {
				gatewayListeners.delete(callback);
			}
		};
	}

	// Notify listeners of data updates
	notifyListeners(gateway, data) {
		const gatewayListeners = this.listeners.get(gateway);
		if (gatewayListeners) {
			gatewayListeners.forEach(callback => {
				try {
					callback(data);
				} catch (error) {
					console.error('Error in listener callback:', error);
				}
			});
		}
	}

	// Sync data across all gateways
	async syncData() {
		try {
			console.log('Syncing data across gateways...');
			
			// Simulate data synchronization
			const pendingData = Array.from(this.dataCache.values())
				.filter(item => item.status === 'pending');

			for (const item of pendingData) {
				// Update status to synced
				item.status = 'synced';
				item.lastSync = new Date().toISOString();
				this.dataCache.set(item.id, item);
			}

			await this.saveToCache();
			console.log(`Synced ${pendingData.length} data items`);
		} catch (error) {
			console.error('Failed to sync data:', error);
		}
	}

	// Teacher-specific data sharing methods
	async shareStudentData(teacherId, studentId, data) {
		return this.shareData('teacher', 'guest', {
			teacherId,
			studentId,
			...data
		}, 'student_update');
	}

	async shareAttendanceData(teacherId, classId, attendanceData) {
		return this.shareData('teacher', 'guest', {
			teacherId,
			classId,
			attendanceData
		}, 'attendance_update');
	}

	async shareGradeData(teacherId, studentId, gradeData) {
		return this.shareData('teacher', 'guest', {
			teacherId,
			studentId,
			gradeData
		}, 'grade_update');
	}

	async shareNotice(teacherId, noticeData, recipients) {
		return this.shareData('teacher', recipients, {
			teacherId,
			...noticeData
		}, 'notice');
	}

	// Guest-specific data sharing methods
	async shareParentFeedback(parentId, teacherId, feedback) {
		return this.shareData('guest', 'teacher', {
			parentId,
			teacherId,
			feedback
		}, 'parent_feedback');
	}

	async shareSpendingUpdate(parentId, childId, spendingData) {
		return this.shareData('guest', 'teacher', {
			parentId,
			childId,
			spendingData
		}, 'spending_update');
	}

	async shareEmergencyContact(parentId, childId, contactData) {
		return this.shareData('guest', 'teacher', {
			parentId,
			childId,
			contactData
		}, 'emergency_contact');
	}

	// Student-specific data sharing methods
	async shareStudentActivity(studentId, activityData) {
		return this.shareData('student', 'teacher', {
			studentId,
			...activityData
		}, 'student_activity');
	}

	async shareHomeworkSubmission(studentId, homeworkData) {
		return this.shareData('student', 'teacher', {
			studentId,
			...homeworkData
		}, 'homework_submission');
	}

	async shareAttendanceStatus(studentId, attendanceStatus) {
		return this.shareData('student', 'teacher', {
			studentId,
			attendanceStatus
		}, 'attendance_status');
	}

	// Cross-gateway communication methods
	async sendMessage(from, to, messageData) {
		return this.shareData(from, to, {
			...messageData,
			messageType: 'communication'
		}, 'message');
	}

	async requestData(from, to, requestData) {
		return this.shareData(from, to, {
			...requestData,
			requestType: 'data_request'
		}, 'data_request');
	}

	async respondToRequest(from, to, requestId, responseData) {
		return this.shareData(from, to, {
			requestId,
			...responseData,
			responseType: 'data_response'
		}, 'data_response');
	}

	// Data retrieval methods
	async getStudentData(studentId) {
		const studentData = await this.getSharedData('guest', { type: 'student_update' });
		return studentData.filter(item => item.data.studentId === studentId);
	}

	async getTeacherData(teacherId) {
		const teacherData = await this.getSharedData('teacher', { type: 'parent_feedback' });
		return teacherData.filter(item => item.data.teacherId === teacherId);
	}

	async getClassData(classId) {
		const classData = await this.getSharedData('guest', { type: 'attendance_update' });
		return classData.filter(item => item.data.classId === classId);
	}

	// Notification methods
	async sendNotification(target, notificationData) {
		return this.shareData('system', target, {
			...notificationData,
			notificationType: 'system_notification'
		}, 'notification');
	}

	async sendAlert(target, alertData) {
		return this.shareData('system', target, {
			...alertData,
			alertType: 'system_alert'
		}, 'alert');
	}

	// Data cleanup methods
	async cleanupOldData(daysOld = 30) {
		try {
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - daysOld);

			const oldData = Array.from(this.dataCache.entries())
				.filter(([id, item]) => new Date(item.timestamp) < cutoffDate);

			for (const [id] of oldData) {
				this.dataCache.delete(id);
			}

			await this.saveToCache();
			console.log(`Cleaned up ${oldData.length} old data items`);
		} catch (error) {
			console.error('Failed to cleanup old data:', error);
		}
	}

	// Get service statistics
	async getServiceStats() {
		try {
			const totalData = this.dataCache.size;
			const pendingData = Array.from(this.dataCache.values())
				.filter(item => item.status === 'pending').length;
			const syncedData = Array.from(this.dataCache.values())
				.filter(item => item.status === 'synced').length;

			return {
				totalData,
				pendingData,
				syncedData,
				lastSync: new Date().toISOString(),
				isInitialized: this.isInitialized
			};
		} catch (error) {
			console.error('Failed to get service stats:', error);
			return null;
		}
	}

	// Destroy service
	async destroy() {
		try {
			this.stopSyncInterval();
			this.listeners.clear();
			this.dataCache.clear();
			this.isInitialized = false;
			console.log('DataSharingService destroyed');
		} catch (error) {
			console.error('Failed to destroy DataSharingService:', error);
		}
	}
}

// Create singleton instance
const dataSharingService = new DataSharingService();

export default dataSharingService;
