import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import dataSharingService from '../services/DataSharingService';

const GatewayConnector = ({ currentGateway, onDataUpdate }) => {
	const router = useRouter();
	const [showConnector, setShowConnector] = useState(false);
	const [sharedData, setSharedData] = useState([]);
	const [isConnected, setIsConnected] = useState(false);

	const gateways = {
		guest: {
			name: 'Guest Gateway',
			icon: '👨‍👩‍👧‍👦',
			color: '#8b5cf6',
			description: 'Parent & Guardian Access',
			features: ['View Children', 'Manage Finances', 'Communicate with Teachers', 'Access Reports']
		},
		teacher: {
			name: 'Teacher Gateway',
			icon: '👨‍🏫',
			color: '#10b981',
			description: 'Educational Staff Access',
			features: ['Manage Classes', 'Grade Students', 'Track Attendance', 'Send Notices']
		},
		student: {
			name: 'Student Gateway',
			icon: '👨‍🎓',
			color: '#3b82f6',
			description: 'Student Access',
			features: ['View Grades', 'Submit Homework', 'Check Schedule', 'Access Resources']
		}
	};

	useEffect(() => {
		// Initialize data sharing service
		const initializeService = async () => {
			await dataSharingService.initialize();
			setIsConnected(true);
		};

		initializeService();

		// Subscribe to data updates
		const unsubscribe = dataSharingService.subscribe(currentGateway, (data) => {
			setSharedData(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 items
			if (onDataUpdate) {
				onDataUpdate(data);
			}
		});

		return () => {
			unsubscribe();
		};
	}, [currentGateway, onDataUpdate]);

	const handleGatewaySwitch = (targetGateway) => {
		Alert.alert(
			'Switch Gateway',
			`Switch to ${gateways[targetGateway].name}?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{ 
					text: 'Switch', 
					onPress: () => {
						// Share current session data before switching
						dataSharingService.shareData(currentGateway, targetGateway, {
							sessionData: {
								lastActive: new Date().toISOString(),
								gateway: currentGateway,
								status: 'switching'
							}
						}, 'gateway_switch');
						
						// Navigate to target gateway
						router.push(`/${targetGateway}`);
					}
				}
			]
		);
	};

	const handleDataShare = async (targetGateway, dataType, customData = {}) => {
		try {
			const shareId = await dataSharingService.shareData(currentGateway, targetGateway, {
				...customData,
				sharedAt: new Date().toISOString(),
				sourceGateway: currentGateway
			}, dataType);

			Alert.alert('Success', `Data shared with ${gateways[targetGateway].name}`);
			return shareId;
		} catch (error) {
			Alert.alert('Error', 'Failed to share data');
			console.error('Data sharing error:', error);
		}
	};

	const handleQuickAction = (action, targetGateway) => {
		switch (action) {
			case 'message':
				Alert.prompt(
					'Send Message',
					`Enter message for ${gateways[targetGateway].name}:`,
					[
						{ text: 'Cancel', style: 'cancel' },
						{ 
							text: 'Send', 
							onPress: (message) => {
								if (message) {
									handleDataShare(targetGateway, 'message', {
										message,
										priority: 'normal'
									});
								}
							}
						}
					]
				);
				break;
			case 'request':
				Alert.prompt(
					'Request Data',
					`What data do you need from ${gateways[targetGateway].name}?`,
					[
						{ text: 'Cancel', style: 'cancel' },
						{ 
							text: 'Request', 
							onPress: (request) => {
								if (request) {
									handleDataShare(targetGateway, 'data_request', {
										request,
										urgency: 'normal'
									});
								}
							}
						}
					]
				);
				break;
			case 'sync':
				Alert.alert(
					'Sync Data',
					`Sync data with ${gateways[targetGateway].name}?`,
					[
						{ text: 'Cancel', style: 'cancel' },
						{ 
							text: 'Sync', 
							onPress: () => {
								Alert.alert('Syncing...', 'Data is being synchronized');
								setTimeout(() => {
									Alert.alert('Success', 'Data synchronized successfully!');
								}, 2000);
							}
						}
					]
				);
				break;
		}
	};

	const getGatewayActions = (targetGateway) => {
		const actions = [
			{ icon: '💬', label: 'Message', action: 'message' },
			{ icon: '📊', label: 'Request Data', action: 'request' },
			{ icon: '🔄', label: 'Sync', action: 'sync' }
		];

		// Add gateway-specific actions
		if (currentGateway === 'teacher' && targetGateway === 'guest') {
			actions.push({ icon: '📝', label: 'Send Report', action: 'report' });
		} else if (currentGateway === 'guest' && targetGateway === 'teacher') {
			actions.push({ icon: '📞', label: 'Contact', action: 'contact' });
		} else if (currentGateway === 'student' && targetGateway === 'teacher') {
			actions.push({ icon: '📚', label: 'Submit Work', action: 'submit' });
		}

		return actions;
	};

	const renderGatewayCard = (gatewayKey) => {
		const gateway = gateways[gatewayKey];
		if (gatewayKey === currentGateway) return null;

		return (
			<View key={gatewayKey} style={styles.gatewayCard}>
				<View style={styles.gatewayHeader}>
					<Text style={styles.gatewayIcon}>{gateway.icon}</Text>
					<View style={styles.gatewayInfo}>
						<Text style={styles.gatewayName}>{gateway.name}</Text>
						<Text style={styles.gatewayDescription}>{gateway.description}</Text>
					</View>
				</View>
				
				<View style={styles.gatewayFeatures}>
					{gateway.features.map((feature, index) => (
						<Text key={index} style={styles.featureText}>• {feature}</Text>
					))}
				</View>
				
				<View style={styles.gatewayActions}>
					<Pressable 
						style={[styles.switchButton, { backgroundColor: gateway.color }]}
						onPress={() => handleGatewaySwitch(gatewayKey)}
					>
						<Text style={styles.switchButtonText}>Switch to {gateway.name}</Text>
					</Pressable>
					
					<View style={styles.quickActions}>
						{getGatewayActions(gatewayKey).map((action, index) => (
							<Pressable 
								key={index}
								style={styles.quickActionButton}
								onPress={() => handleQuickAction(action.action, gatewayKey)}
							>
								<Text style={styles.quickActionIcon}>{action.icon}</Text>
								<Text style={styles.quickActionLabel}>{action.label}</Text>
							</Pressable>
						))}
					</View>
				</View>
			</View>
		);
	};

	const renderSharedData = () => {
		if (sharedData.length === 0) {
			return (
				<View style={styles.noDataContainer}>
					<Text style={styles.noDataIcon}>📭</Text>
					<Text style={styles.noDataText}>No shared data yet</Text>
					<Text style={styles.noDataSubtext}>Data will appear here when shared between gateways</Text>
				</View>
			);
		}

		return sharedData.map((item, index) => (
			<View key={index} style={styles.dataItem}>
				<View style={styles.dataHeader}>
					<Text style={styles.dataSource}>{item.source}</Text>
					<Text style={styles.dataType}>{item.type}</Text>
					<Text style={styles.dataTime}>
						{new Date(item.timestamp).toLocaleTimeString()}
					</Text>
				</View>
				<Text style={styles.dataContent}>
					{JSON.stringify(item.data, null, 2)}
				</Text>
				<View style={[styles.dataStatus, { backgroundColor: getStatusColor(item.status) }]}>
					<Text style={styles.statusText}>{item.status}</Text>
				</View>
			</View>
		));
	};

	const getStatusColor = (status) => {
		switch (status) {
			case 'pending': return '#f59e0b';
			case 'delivered': return '#10b981';
			case 'synced': return '#3b82f6';
			default: return '#6b7280';
		}
	};

	return (
		<>
			<Pressable 
				style={styles.connectorButton}
				onPress={() => setShowConnector(true)}
			>
				<Text style={styles.connectorIcon}>🔗</Text>
				<Text style={styles.connectorText}>Gateway Connector</Text>
				{sharedData.length > 0 && (
					<View style={styles.notificationBadge}>
						<Text style={styles.notificationCount}>{sharedData.length}</Text>
					</View>
				)}
			</Pressable>

			<Modal 
				visible={showConnector} 
				animationType="slide"
				presentationStyle="pageSheet"
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>Gateway Connector</Text>
						<Pressable 
							style={styles.closeButton}
							onPress={() => setShowConnector(false)}
						>
							<Text style={styles.closeIcon}>✕</Text>
						</Pressable>
					</View>

					<ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
						{/* Connection Status */}
						<View style={styles.statusSection}>
							<Text style={styles.sectionTitle}>Connection Status</Text>
							<View style={styles.statusCard}>
								<View style={styles.statusRow}>
									<Text style={styles.statusLabel}>Current Gateway:</Text>
									<Text style={styles.statusValue}>{gateways[currentGateway].name}</Text>
								</View>
								<View style={styles.statusRow}>
									<Text style={styles.statusLabel}>Connection:</Text>
									<View style={[styles.statusIndicator, { backgroundColor: isConnected ? '#10b981' : '#ef4444' }]}>
										<Text style={styles.statusIndicatorText}>
											{isConnected ? 'Connected' : 'Disconnected'}
										</Text>
									</View>
								</View>
								<View style={styles.statusRow}>
									<Text style={styles.statusLabel}>Shared Data:</Text>
									<Text style={styles.statusValue}>{sharedData.length} items</Text>
								</View>
							</View>
						</View>

						{/* Available Gateways */}
						<View style={styles.gatewaysSection}>
							<Text style={styles.sectionTitle}>Available Gateways</Text>
							{Object.keys(gateways).map(renderGatewayCard)}
						</View>

						{/* Shared Data */}
						<View style={styles.dataSection}>
							<Text style={styles.sectionTitle}>Shared Data</Text>
							{renderSharedData()}
						</View>

						{/* Quick Actions */}
						<View style={styles.actionsSection}>
							<Text style={styles.sectionTitle}>Quick Actions</Text>
							<View style={styles.actionsGrid}>
								<Pressable 
									style={styles.actionButton}
									onPress={() => {
										Alert.alert('Sync All', 'Sync data across all gateways?', [
											{ text: 'Cancel', style: 'cancel' },
											{ text: 'Sync', onPress: () => dataSharingService.syncData() }
										]);
									}}
								>
									<Text style={styles.actionIcon}>🔄</Text>
									<Text style={styles.actionLabel}>Sync All</Text>
								</Pressable>
								
								<Pressable 
									style={styles.actionButton}
									onPress={() => {
										Alert.alert('Cleanup', 'Clean up old data?', [
											{ text: 'Cancel', style: 'cancel' },
											{ text: 'Cleanup', onPress: () => dataSharingService.cleanupOldData() }
										]);
									}}
								>
									<Text style={styles.actionIcon}>🧹</Text>
									<Text style={styles.actionLabel}>Cleanup</Text>
								</Pressable>
								
								<Pressable 
									style={styles.actionButton}
									onPress={async () => {
										const stats = await dataSharingService.getServiceStats();
										Alert.alert('Service Stats', JSON.stringify(stats, null, 2));
									}}
								>
									<Text style={styles.actionIcon}>📊</Text>
									<Text style={styles.actionLabel}>Stats</Text>
								</Pressable>
							</View>
						</View>
					</ScrollView>
				</View>
			</Modal>
		</>
	);
};

const styles = StyleSheet.create({
	connectorButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 3,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.8)',
		position: 'relative',
	},
	connectorIcon: {
		fontSize: 20,
		marginRight: 8,
	},
	connectorText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1e293b',
	},
	notificationBadge: {
		position: 'absolute',
		top: -8,
		right: -8,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: '#ef4444',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
		borderColor: '#ffffff',
	},
	notificationCount: {
		color: '#ffffff',
		fontSize: 10,
		fontWeight: '800',
	},
	modalContainer: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingTop: 60,
		paddingBottom: 20,
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	modalTitle: {
		fontSize: 24,
		fontWeight: '800',
		color: '#1e293b',
	},
	closeButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#f3f4f6',
		justifyContent: 'center',
		alignItems: 'center',
	},
	closeIcon: {
		fontSize: 18,
		color: '#64748b',
		fontWeight: '600',
	},
	modalContent: {
		flex: 1,
		paddingHorizontal: 24,
	},
	statusSection: {
		marginTop: 24,
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '800',
		color: '#1e293b',
		marginBottom: 16,
	},
	statusCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 3,
	},
	statusRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8,
	},
	statusLabel: {
		fontSize: 14,
		color: '#64748b',
		fontWeight: '500',
	},
	statusValue: {
		fontSize: 14,
		color: '#1e293b',
		fontWeight: '600',
	},
	statusIndicator: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusIndicatorText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '600',
		textTransform: 'uppercase',
	},
	gatewaysSection: {
		marginBottom: 32,
	},
	gatewayCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 20,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 3,
	},
	gatewayHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	gatewayIcon: {
		fontSize: 32,
		marginRight: 16,
	},
	gatewayInfo: {
		flex: 1,
	},
	gatewayName: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1e293b',
		marginBottom: 4,
	},
	gatewayDescription: {
		fontSize: 14,
		color: '#64748b',
		lineHeight: 20,
	},
	gatewayFeatures: {
		marginBottom: 16,
	},
	featureText: {
		fontSize: 13,
		color: '#64748b',
		marginBottom: 4,
		lineHeight: 18,
	},
	gatewayActions: {
		gap: 12,
	},
	switchButton: {
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 12,
		alignItems: 'center',
	},
	switchButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	quickActions: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	quickActionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
	},
	quickActionIcon: {
		fontSize: 16,
		marginRight: 6,
	},
	quickActionLabel: {
		fontSize: 12,
		color: '#64748b',
		fontWeight: '500',
	},
	dataSection: {
		marginBottom: 32,
	},
	dataItem: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	dataHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	dataSource: {
		fontSize: 12,
		color: '#8b5cf6',
		fontWeight: '600',
		textTransform: 'uppercase',
	},
	dataType: {
		fontSize: 12,
		color: '#64748b',
		fontWeight: '500',
	},
	dataTime: {
		fontSize: 12,
		color: '#9ca3af',
	},
	dataContent: {
		fontSize: 12,
		color: '#1e293b',
		fontFamily: 'monospace',
		backgroundColor: '#f8fafc',
		padding: 8,
		borderRadius: 6,
		marginBottom: 8,
	},
	dataStatus: {
		alignSelf: 'flex-start',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	statusText: {
		color: '#ffffff',
		fontSize: 10,
		fontWeight: '600',
		textTransform: 'uppercase',
	},
	noDataContainer: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	noDataIcon: {
		fontSize: 48,
		marginBottom: 16,
	},
	noDataText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#64748b',
		marginBottom: 8,
	},
	noDataSubtext: {
		fontSize: 14,
		color: '#9ca3af',
		textAlign: 'center',
		lineHeight: 20,
	},
	actionsSection: {
		marginBottom: 32,
	},
	actionsGrid: {
		flexDirection: 'row',
		gap: 12,
	},
	actionButton: {
		flex: 1,
		backgroundColor: '#ffffff',
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderRadius: 12,
		alignItems: 'center',
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
	actionLabel: {
		fontSize: 12,
		color: '#64748b',
		fontWeight: '600',
		textAlign: 'center',
	},
});

export default GatewayConnector;
