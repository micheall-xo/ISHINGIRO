import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { usePageData } from '../../services/usePageData';

export default function PlansPage() {
	const { data } = usePageData('student-plans');
	const [tasks, setTasks] = useState([]);
	const [newTask, setNewTask] = useState('');

	useEffect(() => {
		if (Array.isArray(data.tasks)) {
			setTasks(data.tasks);
		}
	}, [data.tasks]);

	const toggleTask = (id) => {
		setTasks(tasks.map(task => 
			task.id === id ? { ...task, done: !task.done } : task
		));
	};

	const addTask = () => {
		if (newTask.trim()) {
			setTasks([...tasks, { id: Date.now().toString(), text: newTask, time: '00:00', done: false }]);
			setNewTask('');
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.headerCard}>
				<Text style={styles.headerTitle}>Create Plans</Text>
			</View>
			<ScrollView contentContainerStyle={{ gap: 12, padding: 16 }}>
				{tasks.map(task => (
					<TaskItem key={task.id} task={task} onToggle={toggleTask} />
				))}
			</ScrollView>
			<View style={styles.addSection}>
				<TextInput
					style={styles.input}
					placeholder="Add new task..."
					value={newTask}
					onChangeText={setNewTask}
				/>
				<Pressable style={styles.addButton} onPress={addTask}>
					<Text style={styles.addButtonText}>Add</Text>
				</Pressable>
			</View>
		</View>
	);
}

function TaskItem({ task, onToggle }) {
	return (
		<View style={styles.taskRow}>
			<Pressable style={styles.checkbox} onPress={() => onToggle(task.id)}>
				{task.done && <Text style={styles.checkmark}>âœ“</Text>}
			</Pressable>
			<View style={styles.taskContent}>
				<Text style={[styles.taskText, task.done && styles.taskDone]}>{task.text}</Text>
				<Text style={styles.taskTime}>{task.time}</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	headerCard: { margin: 16, backgroundColor: '#0b5eff', padding: 16, borderRadius: 8 },
	headerTitle: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
	taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
	checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#1d4ed8', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
	checkmark: { color: '#1d4ed8', fontWeight: 'bold' },
	taskContent: { flex: 1 },
	taskText: { color: '#111827', marginBottom: 4 },
	taskDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
	taskTime: { color: '#6b7280', fontSize: 12 },
	addSection: { padding: 16, borderTopWidth: 1, borderColor: '#e5e7eb' },
	input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
	addButton: { backgroundColor: '#1d4ed8', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
	addButtonText: { color: '#fff', fontWeight: '700' },
});
