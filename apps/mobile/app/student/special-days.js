import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { usePageData } from '../../services/usePageData';



export default function SpecialDaysPage() {
	const { data } = usePageData('student-special-days');
	const events = Array.isArray(data.specialEvents) ? data.specialEvents : [];
	return (
		<View style={styles.container}>
			<View style={styles.headerCard}>
				<Text style={styles.headerTitle}>Don't miss the special days</Text>
			</View>
			<ScrollView contentContainerStyle={{ gap: 16, padding: 16 }}>
				{events.map(event => (
					<EventCard key={event.id} event={event} />
				))}
			</ScrollView>
		</View>
	);
}

function EventCard({ event }) {
	return (
		<View style={styles.eventCard}>
			<Text style={styles.eventIcon}>{event.icon}</Text>
			<Text style={styles.eventTitle}>{event.title}</Text>
			<Pressable style={styles.getStartedButton}>
				<Text style={styles.getStartedText}>Get Started</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	headerCard: { margin: 16, backgroundColor: '#0b5eff', padding: 16, borderRadius: 8 },
	headerTitle: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
	eventCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 20, alignItems: 'center', gap: 12 },
	eventIcon: { fontSize: 32 },
	eventTitle: { color: '#1f2937', fontWeight: '600', textAlign: 'center' },
	getStartedButton: { backgroundColor: '#1d4ed8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
	getStartedText: { color: '#fff', fontWeight: '600' },
});

