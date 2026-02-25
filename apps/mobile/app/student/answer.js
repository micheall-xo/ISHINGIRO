import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

export default function AnswerPage() {
	return (
		<View style={styles.container}>
			<View style={styles.headerCard}>
				<Text style={styles.headerTitle}>ANSWER</Text>
			</View>
			<ScrollView contentContainerStyle={{ gap: 10, padding: 16 }}>
				<Text style={styles.label}>Subject</Text>
				<Text style={styles.title}>Question #1</Text>
				<Text style={styles.paragraph}>The standard Lorem ipsum passage, "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua"</Text>
				<Text style={styles.paragraph}>The standard Lorem ipsum passage, "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua"</Text>
				<Text style={styles.paragraph}>The standard Lorem ipsum passage, "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua"</Text>
				<Pressable style={styles.button}><Text style={styles.buttonText}>Download Answer</Text></Pressable>
			</ScrollView>
		</View>
	);
}		

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	headerCard: { margin: 16, marginBottom: 0, backgroundColor: '#0b5eff', padding: 16, borderRadius: 8 },
	headerTitle: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
	label: { color: '#111827' },
	title: { color: '#1f2937', fontWeight: '700' },
	paragraph: { color: '#6b7280' },
	button: { alignSelf: 'stretch', marginTop: 12, backgroundColor: '#1d4ed8', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
	buttonText: { color: '#fff', fontWeight: '700' },
});


