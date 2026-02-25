import { useState, useEffect } from 'react';
import { usePageData } from '../../services/usePageData';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';


	export default function SchoolCalendar() {
	const { data } = usePageData('guest-calendar');
	const router = useRouter();
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState(null);
	const [showEventModal, setShowEventModal] = useState(false);
	const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', type: 'general' });
	
	const [events, setEvents] = useState([]);
	useEffect(() => {
		if (Array.isArray(data.events)) {
			setEvents(data.events);
		}
	}, [data.events]);

	const months = Array.isArray(data.months) ? data.months : [];

	const getDaysInMonth = (date) => {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startingDay = firstDay.getDay();
		
		return { daysInMonth, startingDay };
	};

	const getEventsForDate = (date) => {
		const dateStr = date.toISOString().split('T')[0];
		return events.filter(event => event.eventDate === dateStr);
	};

	const getEventTypeColor = (type) => {
		switch (type) {
			case 'meeting': return '#3b82f6';
			case 'event': return '#10b981';
			case 'report': return '#f59e0b';
			case 'academic': return '#ef4444';
			case 'holiday': return '#8b5cf6';
			default: return '#64748b';
		}
	};

	const getEventTypeIcon = (type) => {
		switch (type) {
			case 'meeting': return 'ðŸ‘¥';
			case 'event': return 'ðŸŽ‰';
			case 'report': return 'ðŸ“Š';
			case 'academic': return 'ðŸ“š';
			case 'holiday': return 'ðŸŽŠ';
			default: return 'ðŸ“…';
		}
	};

	const handleDatePress = (day) => {
		const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
		setSelectedDate(selectedDate);
		setShowEventModal(true);
	};

	const handleAddEvent = () => {
		if (newEvent.title && newEvent.date) {
			const event = {
				id: Date.now(),
				...newEvent,
				child: 'All'
			};
			setEvents(prev => [...prev, event]);
			setNewEvent({ title: '', description: '', date: '', type: 'general' });
			setShowEventModal(false);
			Alert.alert('Success', 'Event added to calendar');
		} else {
			Alert.alert('Error', 'Please fill in all required fields');
		}
	};

	const renderCalendar = () => {
		const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);
		const days = [];
		
		// Add empty cells for days before the first day of the month
		for (let i = 0; i < startingDay; i++) {
			days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
		}
		
		// Add days of the month
		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
			const dayEvents = getEventsForDate(date);
			const hasEvents = dayEvents.length > 0;
			
			days.push(
				<Pressable
					key={day}
					style={[styles.calendarDay, hasEvents && styles.calendarDayWithEvents]}
					onPress={() => handleDatePress(day)}
				>
					<Text style={styles.calendarDayText}>{day}</Text>
					{hasEvents && (
						<View style={styles.eventIndicator}>
							<Text style={styles.eventIndicatorText}>{dayEvents.length}</Text>
						</View>
					)}
				</Pressable>
			);
		}
		
		return days;
	};

	const nextMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
	};

	const prevMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
	};

	return (
		<ScrollView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>School Calendar</Text>
				<Text style={styles.subtitle}>Important dates and events</Text>
			</View>

			{/* Month Navigation */}
			<View style={styles.monthNavigation}>
				<Pressable style={styles.navButton} onPress={prevMonth}>
					<Text style={styles.navButtonText}>â†</Text>
				</Pressable>
				<Text style={styles.currentMonth}>
					{months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
				</Text>
				<Pressable style={styles.navButton} onPress={nextMonth}>
					<Text style={styles.navButtonText}>â†’</Text>
				</Pressable>
			</View>

			{/* Calendar Grid */}
			<View style={styles.calendarContainer}>
				<View style={styles.weekDays}>
					{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
						<Text key={day} style={styles.weekDay}>{day}</Text>
					))}
				</View>
				<View style={styles.calendarGrid}>
					{renderCalendar()}
				</View>
			</View>

			{/* Upcoming Events */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Upcoming Events</Text>
				{events
					.filter(event => new Date(event.date) >= new Date())
					.sort((a, b) => new Date(a.date) - new Date(b.date))
					.slice(0, 5)
					.map(event => (
						<View key={event.id} style={styles.eventCard}>
							<View style={styles.eventHeader}>
								<Text style={styles.eventIcon}>{getEventTypeIcon(event.type)}</Text>
								<Text style={[styles.eventType, { color: getEventTypeColor(event.type) }]}>
									{event.type.toUpperCase()}
								</Text>
							</View>
							<Text style={styles.eventTitle}>{event.title}</Text>
							<Text style={styles.eventDescription}>{event.description}</Text>
							<View style={styles.eventDetails}>
								<Text style={styles.eventDate}>{event.date}</Text>
								<Text style={styles.eventTime}>{event.time}</Text>
								<Text style={styles.eventChild}>{event.child}</Text>
							</View>
						</View>
					))}
			</View>

			{/* Add Event Button */}
			<Pressable 
				style={styles.addEventButton}
				onPress={() => setShowEventModal(true)}
			>
				<Text style={styles.addEventText}>+ Add Event</Text>
			</Pressable>

			{/* Event Modal */}
			<Modal
				visible={showEventModal}
				animationType="slide"
				transparent={true}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>
							{selectedDate ? `Events for ${selectedDate.toDateString()}` : 'Add New Event'}
						</Text>
						
						{selectedDate && (
							<View style={styles.selectedDateEvents}>
								{getEventsForDate(selectedDate).map(event => (
									<View key={event.id} style={styles.selectedEventCard}>
										<Text style={styles.selectedEventTitle}>{event.title}</Text>
										<Text style={styles.selectedEventDescription}>{event.description}</Text>
										<Text style={styles.selectedEventTime}>{event.time} - {event.child}</Text>
									</View>
								))}
								{getEventsForDate(selectedDate).length === 0 && (
									<Text style={styles.noEventsText}>No events scheduled for this date</Text>
								)}
							</View>
						)}

						{!selectedDate && (
							<>
								<TextInput
									style={styles.input}
									placeholder="Event Title"
									value={newEvent.title}
									onChangeText={(text) => setNewEvent(prev => ({ ...prev, title: text }))}
								/>
								
								<TextInput
									style={styles.input}
									placeholder="Event Description"
									value={newEvent.description}
									onChangeText={(text) => setNewEvent(prev => ({ ...prev, description: text }))}
									multiline
								/>
								
								<TextInput
									style={styles.input}
									placeholder="Date (YYYY-MM-DD)"
									value={newEvent.date}
									onChangeText={(text) => setNewEvent(prev => ({ ...prev, date: text }))}
								/>
								
								<View style={styles.typeSelector}>
									{['general', 'meeting', 'event', 'report', 'academic'].map(type => (
										<Pressable
											key={type}
											style={[
												styles.typeButton,
												newEvent.type === type && styles.typeButtonActive
											]}
											onPress={() => setNewEvent(prev => ({ ...prev, type }))}
										>
											<Text style={[
												styles.typeButtonText,
												newEvent.type === type && styles.typeButtonTextActive
											]}>
												{type.charAt(0).toUpperCase() + type.slice(1)}
											</Text>
										</Pressable>
									))}
								</View>
							</>
						)}
						
						<View style={styles.modalButtons}>
							<Pressable 
								style={[styles.modalButton, styles.cancelButton]}
								onPress={() => {
									setShowEventModal(false);
									setSelectedDate(null);
									setNewEvent({ title: '', description: '', date: '', type: 'general' });
								}}
							>
								<Text style={styles.cancelButtonText}>Close</Text>
							</Pressable>
							
							{!selectedDate && (
								<Pressable 
									style={[styles.modalButton, styles.saveButton]}
									onPress={handleAddEvent}
								>
									<Text style={styles.saveButtonText}>Add Event</Text>
								</Pressable>
							)}
						</View>
					</View>
				</View>
			</Modal>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
		padding: 16,
	},
	header: {
		marginBottom: 24,
		alignItems: 'center',
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		color: '#1e293b',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: '#64748b',
	},
	monthNavigation: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
		backgroundColor: '#ffffff',
		padding: 16,
		borderRadius: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	navButton: {
		backgroundColor: '#e2e8f0',
		padding: 12,
		borderRadius: 8,
		minWidth: 44,
		alignItems: 'center',
	},
	navButtonText: {
		fontSize: 18,
		fontWeight: '600',
		color: '#3b82f6',
	},
	currentMonth: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1e293b',
	},
	calendarContainer: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 16,
		marginBottom: 24,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	weekDays: {
		flexDirection: 'row',
		marginBottom: 16,
	},
	weekDay: {
		flex: 1,
		textAlign: 'center',
		fontSize: 14,
		fontWeight: '600',
		color: '#64748b',
	},
	calendarGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	calendarDay: {
		width: '14.28%',
		height: 50,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	calendarDayWithEvents: {
		backgroundColor: '#f0f9ff',
		borderColor: '#3b82f6',
	},
	calendarDayText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#1e293b',
	},
	eventIndicator: {
		position: 'absolute',
		bottom: 2,
		right: 2,
		backgroundColor: '#3b82f6',
		borderRadius: 8,
		minWidth: 16,
		height: 16,
		justifyContent: 'center',
		alignItems: 'center',
	},
	eventIndicatorText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#ffffff',
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#1e293b',
		marginBottom: 16,
	},
	eventCard: {
		backgroundColor: '#ffffff',
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	eventHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	eventIcon: {
		fontSize: 20,
	},
	eventType: {
		fontSize: 12,
		fontWeight: '600',
	},
	eventTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1e293b',
		marginBottom: 4,
	},
	eventDescription: {
		fontSize: 14,
		color: '#64748b',
		marginBottom: 8,
	},
	eventDetails: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	eventDate: {
		fontSize: 12,
		color: '#64748b',
	},
	eventTime: {
		fontSize: 12,
		color: '#64748b',
	},
	eventChild: {
		fontSize: 12,
		color: '#64748b',
	},
	addEventButton: {
		backgroundColor: '#10b981',
		padding: 16,
		borderRadius: 16,
		alignItems: 'center',
		marginBottom: 20,
	},
	addEventText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#ffffff',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: '#ffffff',
		borderRadius: 20,
		padding: 24,
		width: '90%',
		maxHeight: '80%',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 10,
		elevation: 5,
	},
	modalTitle: {
		fontSize: 22,
		fontWeight: '700',
		color: '#1e293b',
		textAlign: 'center',
		marginBottom: 20,
	},
	input: {
		borderWidth: 1,
		borderColor: '#e2e8f0',
		borderRadius: 10,
		padding: 14,
		marginBottom: 15,
		fontSize: 16,
		color: '#1e293b',
	},
	typeSelector: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		marginBottom: 20,
	},
	typeButton: {
		backgroundColor: '#e2e8f0',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		marginBottom: 8,
		minWidth: '18%',
		alignItems: 'center',
	},
	typeButtonActive: {
		backgroundColor: '#3b82f6',
	},
	typeButtonText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#64748b',
	},
	typeButtonTextActive: {
		color: '#ffffff',
	},
	modalButtons: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginTop: 20,
	},
	modalButton: {
		paddingVertical: 12,
		paddingHorizontal: 25,
		borderRadius: 10,
	},
	cancelButton: {
		backgroundColor: '#ef4444',
	},
	cancelButtonText: {
		color: '#ffffff',
		fontWeight: '600',
		fontSize: 16,
	},
	saveButton: {
		backgroundColor: '#10b981',
	},
	saveButtonText: {
		color: '#ffffff',
		fontWeight: '600',
		fontSize: 16,
	},
	selectedDateEvents: {
		marginBottom: 20,
	},
	selectedEventCard: {
		backgroundColor: '#f8fafc',
		padding: 12,
		borderRadius: 8,
		marginBottom: 8,
	},
	selectedEventTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1e293b',
		marginBottom: 4,
	},
	selectedEventDescription: {
		fontSize: 14,
		color: '#64748b',
		marginBottom: 4,
	},
	selectedEventTime: {
		fontSize: 12,
		color: '#64748b',
	},
	noEventsText: {
		fontSize: 14,
		color: '#64748b',
		textAlign: 'center',
		fontStyle: 'italic',
	},
});





