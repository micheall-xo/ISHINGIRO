import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function QuizStart() {
	const router = useRouter();
	return (
		<View style={styles.container}>
			<View style={styles.headerCard}>
				<Text style={styles.headerTitle}>ASK QUESTION</Text>
			</View>
			<View style={styles.body}>
				<Text style={styles.center}>Start Quiz</Text>
				<Pressable style={styles.button} onPress={() => router.replace('/student/quiz-question')}>
					<Text style={styles.buttonText}>Start</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	headerCard: { margin: 16, backgroundColor: '#0b5eff', padding: 16, borderRadius: 8 },
	headerTitle: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
	body: { margin: 16, alignItems: 'center', gap: 16 },
	center: { color: '#1f2937' },
	button: { backgroundColor: '#1d4ed8', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
	buttonText: { color: '#fff', fontWeight: '700' },
});


