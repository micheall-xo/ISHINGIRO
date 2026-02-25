import { Alert } from 'react-native';
import dataSharingService from './DataSharingService';
import gatewayIntegrationService from './GatewayIntegrationService';

class FunctionalityManager {
	constructor() {
		this.isInitialized = false;
		this.userPreferences = new Map();
		this.actionHistory = new Map();
		this.validationRules = new Map();
		this.setupValidationRules();
	}

	// Initialize the functionality manager
	async initialize() {
		if (this.isInitialized) return;

		try {
			// Initialize integration service
			await gatewayIntegrationService.initialize();
			
			// Load user preferences
			await this.loadUserPreferences();
			
			this.isInitialized = true;
			console.log('FunctionalityManager initialized successfully');
		} catch (error) {
			console.error('Failed to initialize FunctionalityManager:', error);
		}
	}

	// Set up validation rules for different actions
	setupValidationRules() {
		// Student validation rules
		this.validationRules.set('student', {
			homework_submission: {
				required: ['title', 'content', 'subject'],
				maxLength: { title: 100, content: 1000 },
				fileTypes: ['.pdf', '.doc', '.docx', '.txt']
			},
			grade_request: {
				required: ['subject', 'reason'],
				maxLength: { reason: 200 }
			},
			attendance_report: {
				required: ['date', 'status'],
				validStatuses: ['present', 'absent', 'late', 'excused']
			}
		});

		// Teacher validation rules
		this.validationRules.set('teacher', {
			grade_entry: {
				required: ['studentId', 'subject', 'grade', 'maxScore'],
				gradeRange: { min: 0, max: 100 },
				validGrades: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F']
			},
			homework_assignment: {
				required: ['title', 'description', 'subject', 'dueDate'],
				maxLength: { title: 100, description: 500 },
				dueDate: { minDays: 1 }
			},
			attendance_mark: {
				required: ['studentId', 'date', 'status'],
				validStatuses: ['present', 'absent', 'late', 'excused']
			}
		});

		// Guest validation rules
		this.validationRules.set('guest', {
			pocket_money: {
				required: ['amount', 'childId'],
				amountRange: { min: 0, max: 1000 },
				currency: 'USD'
			},
			spending_limit: {
				required: ['amount', 'childId', 'period'],
				amountRange: { min: 0, max: 500 },
				validPeriods: ['daily', 'weekly', 'monthly']
			},
			emergency_contact: {
				required: ['name', 'phone', 'relationship'],
				phoneFormat: /^\+?[\d\s\-\(\)]+$/,
				maxLength: { name: 50, relationship: 30 }
			}
		});
	}

	// Load user preferences
	async loadUserPreferences() {
		try {
			// Load from AsyncStorage or other storage
			// For now, using default preferences
			this.userPreferences.set('notifications', true);
			this.userPreferences.set('autoSync', true);
			this.userPreferences.set('dataSharing', true);
		} catch (error) {
			console.error('Failed to load user preferences:', error);
		}
	}

	// Validate data against rules
	validateData(gateway, action, data) {
		const rules = this.validationRules.get(gateway);
		if (!rules || !rules[action]) {
			return { isValid: true, errors: [] };
		}

		const rule = rules[action];
		const errors = [];

		// Check required fields
		if (rule.required) {
			rule.required.forEach(field => {
				if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
					errors.push(`${field} is required`);
				}
			});
		}

		// Check max length
		if (rule.maxLength) {
			Object.entries(rule.maxLength).forEach(([field, maxLen]) => {
				if (data[field] && data[field].length > maxLen) {
					errors.push(`${field} must be ${maxLen} characters or less`);
				}
			});
		}

		// Check ranges
		if (rule.amountRange) {
			const amount = parseFloat(data.amount);
			if (isNaN(amount) || amount < rule.amountRange.min || amount > rule.amountRange.max) {
				errors.push(`Amount must be between ${rule.amountRange.min} and ${rule.amountRange.max}`);
			}
		}

		// Check valid values
		if (rule.validStatuses && !rule.validStatuses.includes(data.status)) {
			errors.push(`Status must be one of: ${rule.validStatuses.join(', ')}`);
		}

		if (rule.validGrades && !rule.validGrades.includes(data.grade)) {
			errors.push(`Grade must be one of: ${rule.validGrades.join(', ')}`);
		}

		// Check date validation
		if (rule.dueDate && data.dueDate) {
			const dueDate = new Date(data.dueDate);
			const today = new Date();
			const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
			if (daysDiff < rule.dueDate.minDays) {
				errors.push(`Due date must be at least ${rule.dueDate.minDays} days from today`);
			}
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	// Handle student actions
	async handleStudentAction(action, data) {
		try {
			// Validate data
			const validation = this.validateData('student', action, data);
			if (!validation.isValid) {
				Alert.alert('Validation Error', validation.errors.join('\n'));
				return false;
			}

			switch (action) {
				case 'submit_homework':
					return await this.handleHomeworkSubmission(data);
				case 'request_grade':
					return await this.handleGradeRequest(data);
				case 'report_attendance':
					return await this.handleAttendanceReport(data);
				case 'ask_question':
					return await this.handleQuestionSubmission(data);
				case 'view_results':
					return await this.handleResultsView(data);
				default:
					console.warn(`Unknown student action: ${action}`);
					return false;
			}
		} catch (error) {
			console.error(`Failed to handle student action ${action}:`, error);
			Alert.alert('Error', 'Failed to process your request. Please try again.');
			return false;
		}
	}

	// Handle teacher actions
	async handleTeacherAction(action, data) {
		try {
			// Validate data
			const validation = this.validateData('teacher', action, data);
			if (!validation.isValid) {
				Alert.alert('Validation Error', validation.errors.join('\n'));
				return false;
			}

			switch (action) {
				case 'enter_grade':
					return await this.handleGradeEntry(data);
				case 'assign_homework':
					return await this.handleHomeworkAssignment(data);
				case 'mark_attendance':
					return await this.handleAttendanceMarking(data);
				case 'send_notice':
					return await this.handleNoticeSending(data);
				case 'generate_report':
					return await this.handleReportGeneration(data);
				default:
					console.warn(`Unknown teacher action: ${action}`);
					return false;
			}
		} catch (error) {
			console.error(`Failed to handle teacher action ${action}:`, error);
			Alert.alert('Error', 'Failed to process your request. Please try again.');
			return false;
		}
	}

	// Handle guest actions
	async handleGuestAction(action, data) {
		try {
			// Validate data
			const validation = this.validateData('guest', action, data);
			if (!validation.isValid) {
				Alert.alert('Validation Error', validation.errors.join('\n'));
				return false;
			}

			switch (action) {
				case 'update_pocket_money':
					return await this.handlePocketMoneyUpdate(data);
				case 'set_spending_limit':
					return await this.handleSpendingLimitSet(data);
				case 'update_emergency_contact':
					return await this.handleEmergencyContactUpdate(data);
				case 'send_feedback':
					return await this.handleFeedbackSubmission(data);
				case 'request_meeting':
					return await this.handleMeetingRequest(data);
				default:
					console.warn(`Unknown guest action: ${action}`);
					return false;
			}
		} catch (error) {
			console.error(`Failed to handle guest action ${action}:`, error);
			Alert.alert('Error', 'Failed to process your request. Please try again.');
			return false;
		}
	}

	// Student action handlers
	async handleHomeworkSubmission(data) {
		try {
			// Share with teacher
			await dataSharingService.shareHomeworkSubmission(data.studentId, {
				...data,
				submittedAt: new Date().toISOString(),
				status: 'submitted'
			});

			// Update integration service
			await gatewayIntegrationService.shareStudentUpdate(data.studentId, {
				type: 'homework_submission',
				data: data
			});

			Alert.alert('Success', 'Homework submitted successfully!');
			return true;
		} catch (error) {
			console.error('Failed to submit homework:', error);
			return false;
		}
	}

	async handleGradeRequest(data) {
		try {
			// Share with teacher
			await dataSharingService.shareData('student', 'teacher', {
				...data,
				requestedAt: new Date().toISOString(),
				status: 'pending'
			}, 'grade_request');

			Alert.alert('Request Sent', 'Your grade request has been sent to your teacher.');
			return true;
		} catch (error) {
			console.error('Failed to send grade request:', error);
			return false;
		}
	}

	async handleAttendanceReport(data) {
		try {
			// Share with teacher
			await dataSharingService.shareAttendanceStatus(data.studentId, {
				...data,
				reportedAt: new Date().toISOString()
			});

			Alert.alert('Reported', 'Your attendance has been reported successfully.');
			return true;
		} catch (error) {
			console.error('Failed to report attendance:', error);
			return false;
		}
	}

	async handleQuestionSubmission(data) {
		try {
			// Share with teacher
			await dataSharingService.shareData('student', 'teacher', {
				...data,
				askedAt: new Date().toISOString(),
				status: 'pending'
			}, 'question_ask');

			Alert.alert('Question Sent', 'Your question has been sent to your teacher.');
			return true;
		} catch (error) {
			console.error('Failed to send question:', error);
			return false;
		}
	}

	async handleResultsView(data) {
		try {
			// Simulate results loading
			Alert.alert('Loading Results', 'Fetching your academic results...');
			
			// In a real app, this would fetch from API
			setTimeout(() => {
				Alert.alert('Results Available', 'Your results have been loaded successfully.');
			}, 1000);

			return true;
		} catch (error) {
			console.error('Failed to load results:', error);
			return false;
		}
	}

	// Teacher action handlers
	async handleGradeEntry(data) {
		try {
			// Share with student and parent
			await gatewayIntegrationService.shareStudentProgress(data.studentId, {
				type: 'grade_update',
				subject: data.subject,
				grade: data.grade,
				score: data.score,
				maxScore: data.maxScore,
				enteredBy: data.teacherId,
				enteredAt: new Date().toISOString()
			});

			Alert.alert('Success', 'Grade entered successfully!');
			return true;
		} catch (error) {
			console.error('Failed to enter grade:', error);
			return false;
		}
	}

	async handleHomeworkAssignment(data) {
		try {
			// Share with students
			await dataSharingService.shareData('teacher', 'student', {
				...data,
				assignedAt: new Date().toISOString(),
				status: 'active'
			}, 'homework_assignment');

			Alert.alert('Success', 'Homework assigned successfully!');
			return true;
		} catch (error) {
			console.error('Failed to assign homework:', error);
			return false;
		}
	}

	async handleAttendanceMarking(data) {
		try {
			// Share with parents
			await gatewayIntegrationService.shareStudentProgress(data.studentId, {
				type: 'attendance_update',
				date: data.date,
				status: data.status,
				markedBy: data.teacherId,
				markedAt: new Date().toISOString()
			});

			Alert.alert('Success', 'Attendance marked successfully!');
			return true;
		} catch (error) {
			console.error('Failed to mark attendance:', error);
			return false;
		}
	}

	async handleNoticeSending(data) {
		try {
			// Broadcast notice to all gateways
			await gatewayIntegrationService.broadcastNotice({
				title: data.title,
				content: data.content,
				priority: data.priority || 'normal',
				author: data.teacherId
			});

			Alert.alert('Success', 'Notice sent successfully!');
			return true;
		} catch (error) {
			console.error('Failed to send notice:', error);
			return false;
		}
	}

	async handleReportGeneration(data) {
		try {
			// Simulate report generation
			Alert.alert('Generating Report', 'Please wait while we generate your report...');
			
			setTimeout(() => {
				Alert.alert('Report Ready', 'Your report has been generated successfully!');
			}, 2000);

			return true;
		} catch (error) {
			console.error('Failed to generate report:', error);
			return false;
		}
	}

	// Guest action handlers
	async handlePocketMoneyUpdate(data) {
		try {
			// Share with student
			await gatewayIntegrationService.shareParentUpdate(data.parentId, {
				type: 'pocket_money_update',
				childId: data.childId,
				amount: data.amount,
				action: 'added',
				updatedAt: new Date().toISOString()
			});

			Alert.alert('Success', 'Pocket money updated successfully!');
			return true;
		} catch (error) {
			console.error('Failed to update pocket money:', error);
			return false;
		}
	}

	async handleSpendingLimitSet(data) {
		try {
			// Share with student
			await gatewayIntegrationService.shareParentUpdate(data.parentId, {
				type: 'spending_limit_update',
				childId: data.childId,
				limit: data.amount,
				period: data.period,
				updatedAt: new Date().toISOString()
			});

			Alert.alert('Success', 'Spending limit set successfully!');
			return true;
		} catch (error) {
			console.error('Failed to set spending limit:', error);
			return false;
		}
	}

	async handleEmergencyContactUpdate(data) {
		try {
			// Share with teachers
			await gatewayIntegrationService.shareParentUpdate(data.parentId, {
				type: 'emergency_contact_update',
				childId: data.childId,
				contact: {
					name: data.name,
					phone: data.phone,
					relationship: data.relationship
				},
				updatedAt: new Date().toISOString()
			});

			Alert.alert('Success', 'Emergency contact updated successfully!');
			return true;
		} catch (error) {
			console.error('Failed to update emergency contact:', error);
			return false;
		}
	}

	async handleFeedbackSubmission(data) {
		try {
			// Share with teacher
			await gatewayIntegrationService.shareParentUpdate(data.parentId, {
				type: 'parent_feedback',
				teacherId: data.teacherId,
				feedback: data.feedback,
				rating: data.rating,
				submittedAt: new Date().toISOString()
			});

			Alert.alert('Success', 'Feedback submitted successfully!');
			return true;
		} catch (error) {
			console.error('Failed to submit feedback:', error);
			return false;
		}
	}

	async handleMeetingRequest(data) {
		try {
			// Share with teacher
			await dataSharingService.shareData('guest', 'teacher', {
				...data,
				requestedAt: new Date().toISOString(),
				status: 'pending'
			}, 'meeting_request');

			Alert.alert('Request Sent', 'Meeting request sent successfully!');
			return true;
		} catch (error) {
			console.error('Failed to send meeting request:', error);
			return false;
		}
	}

	// Cross-gateway communication methods
	async sendMessage(fromGateway, toGateway, messageData) {
		try {
			const messageId = await dataSharingService.sendMessage(fromGateway, toGateway, {
				...messageData,
				sentAt: new Date().toISOString()
			});

			Alert.alert('Message Sent', 'Your message has been sent successfully!');
			return messageId;
		} catch (error) {
			console.error('Failed to send message:', error);
			Alert.alert('Error', 'Failed to send message. Please try again.');
			return null;
		}
	}

	async requestData(fromGateway, toGateway, requestData) {
		try {
			const requestId = await dataSharingService.requestData(fromGateway, toGateway, {
				...requestData,
				requestedAt: new Date().toISOString()
			});

			Alert.alert('Request Sent', 'Data request sent successfully!');
			return requestId;
		} catch (error) {
			console.error('Failed to send data request:', error);
			Alert.alert('Error', 'Failed to send data request. Please try again.');
			return null;
		}
	}

	// Utility methods
	async syncAllData() {
		try {
			await gatewayIntegrationService.syncAllGateways();
			Alert.alert('Success', 'All data synchronized successfully!');
			return true;
		} catch (error) {
			console.error('Failed to sync data:', error);
			Alert.alert('Error', 'Failed to synchronize data. Please try again.');
			return false;
		}
	}

	async getSystemStats() {
		try {
			const stats = await gatewayIntegrationService.getIntegrationStats();
			return stats;
		} catch (error) {
			console.error('Failed to get system stats:', error);
			return null;
		}
	}

	// Record action history
	recordAction(gateway, action, data, success) {
		const actionRecord = {
			gateway,
			action,
			data,
			success,
			timestamp: new Date().toISOString()
		};

		if (!this.actionHistory.has(gateway)) {
			this.actionHistory.set(gateway, []);
		}

		this.actionHistory.get(gateway).push(actionRecord);
	}

	// Get action history for a gateway
	getActionHistory(gateway) {
		return this.actionHistory.get(gateway) || [];
	}

	// Clear action history
	clearActionHistory(gateway) {
		if (gateway) {
			this.actionHistory.delete(gateway);
		} else {
			this.actionHistory.clear();
		}
	}
}

// Create singleton instance
const functionalityManager = new FunctionalityManager();

export default functionalityManager;
