import { View, Text, StyleSheet, Pressable } from 'react-native';

export default function QuizQuestion() {
	return (
		<View style={styles.container}>
			<View style={styles.headerCard}>
				<Text style={styles.headerTitle}>ASK QUESTION</Text>
			</View>
			<View style={styles.body}>
				<Text style={styles.question}>This is Quiz Random QuestionQ</Text>
				<OptionButton title="Option A" />
				<OptionButton title="Option A" />
				<OptionButton title="Option A" />
				<OptionButton title="Option A" />
			</View>
		</View>
	);
}

function OptionButton({ title }) {
	return (
		<Pressable style={styles.option}><Text style={styles.optionText}>{title}</Text></Pressable>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	headerCard: { margin: 16, backgroundColor: '#0b5eff', padding: 16, borderRadius: 8 },
	headerTitle: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
	body: { margin: 16, gap: 12 },
	question: { color: '#1f2937', marginBottom: 8 },
	option: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
	optionText: { color: '#1f2937' },
});


