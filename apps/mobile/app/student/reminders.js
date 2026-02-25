import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { usePageData } from '../../services/usePageData';

const PRIORITY_COLORS = {
	high: '#ef4444',
	medium: '#f59e0b',
	low: '#10b981'
};

export default function RemindersPage() {
	const { data } = usePageData('student-reminders');
	const [reminders, setReminders] = useState([]);
	const [newReminder, setNewReminder] = useState('');
	const [selectedPriority, setSelectedPriority] = useState('medium');

	useEffect(() => {
		if (Array.isArray(data.reminders)) {
			setReminders(data.reminders);
		}
	}, [data.reminders]);

	const toggleReminder = (id) => {
		setReminders(reminders.map(reminder => 
			reminder.id === id ? { ...reminder, done: !reminder.done } : reminder
		));
	};

	const addReminder = () => {
		if (newReminder.trim()) {
			setReminders([...reminders, { 
				id: Date.now().toString(), 
				text: newReminder, 
				time: '00:00', 
				priority: selectedPriority, 
				done: false 
			}]);
			setNewReminder('');
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.headerCard}>
				<Text style={styles.headerTitle}>Set Reminder with Priority levels</Text>
			</View>
			<ScrollView contentContainerStyle={{ gap: 12, padding: 16 }}>
				{reminders.map(reminder => (
					<ReminderItem key={reminder.id} reminder={reminder} onToggle={toggleReminder} />
				))}
			</ScrollView>
			<View style={styles.addSection}>
				<TextInput
					style={styles.input}
					placeholder="Add new reminder..."
					value={newReminder}
					onChangeText={setNewReminder}
				/>
				<View style={styles.priorityRow}>
					{Object.keys(PRIORITY_COLORS).map(priority => (
						<Pressable
							key={priority}
							style={[
								styles.priorityButton,
								{ backgroundColor: selectedPriority === priority ? PRIORITY_COLORS[priority] : '#f3f4f6' }
							]}
							onPress={() => setSelectedPriority(priority)}
						>
							<Text style={[
								styles.priorityText,
								{ color: selectedPriority === priority ? '#fff' : '#6b7280' }
							]}>
								{priority.charAt(0).toUpperCase() + priority.slice(1)}
							</Text>
						</Pressable>
					))}
				</View>
				<Pressable style={styles.addButton} onPress={addReminder}>
					<Text style={styles.addButtonText}>Add</Text>
				</Pressable>
			</View>
		</View>
	);
}

function ReminderItem({ reminder, onToggle }) {
	return (
		<View style={styles.reminderRow}>
			<View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[reminder.priority] }]} />
			<Pressable style={styles.checkbox} onPress={() => onToggle(reminder.id)}>
				{reminder.done && <Text style={styles.checkmark}>âœ“</Text>}
			</Pressable>
			<View style={styles.reminderContent}>
				<Text style={[styles.reminderText, reminder.done && styles.reminderDone]}>{reminder.text}</Text>
				<Text style={styles.reminderTime}>{reminder.time}</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	headerCard: { margin: 16, backgroundColor: '#0b5eff', padding: 16, borderRadius: 8 },
	headerTitle: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
	reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
	priorityDot: { width: 12, height: 12, borderRadius: 6 },
	checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#1d4ed8', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
	checkmark: { color: '#1d4ed8', fontWeight: 'bold' },
	reminderContent: { flex: 1 },
	reminderText: { color: '#111827', marginBottom: 4 },
	reminderDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
	reminderTime: { color: '#6b7280', fontSize: 12 },
	addSection: { padding: 16, borderTopWidth: 1, borderColor: '#e5e7eb' },
	input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
	priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
	priorityButton: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
	priorityText: { fontWeight: '600' },
	addButton: { backgroundColor: '#1d4ed8', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
	addButtonText: { color: '#fff', fontWeight: '700' },
});
