import { View, Text, StyleSheet } from 'react-native';

export default function QuizScore() {
	return (
		<View style={styles.container}>
			<View style={styles.headerCard}>
				<Text style={styles.headerTitle}>ASK QUESTION</Text>
			</View>
			<View style={styles.body}>
				<Text style={styles.scoreTitle}>Score</Text>
				<View style={styles.scores}>
					<Text style={styles.scoreText}>Score: 4</Text>
					<Text style={styles.scoreText}>Total: 5</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	headerCard: { margin: 16, backgroundColor: '#0b5eff', padding: 16, borderRadius: 8 },
	headerTitle: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
	body: { marginTop: 32, alignItems: 'center' },
	scoreTitle: { color: '#1f2937', fontSize: 16, marginBottom: 24 },
	scores: { gap: 6, alignItems: 'center' },
	scoreText: { color: '#6b7280' },
});


