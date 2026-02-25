import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

function QuestionCard() {
	return (
		<View style={styles.qCard}>
			<Text style={styles.qTitle}>Question</Text>
			<Text style={styles.qText}>Lorem ipsum dolor sit amet, consectetur adipisicing elit...</Text>
			<Pressable style={styles.viewBtn}><Text style={styles.viewText}>VIEW</Text></Pressable>
		</View>
	);
}

export default function QuestionList() {
	const router = useRouter();
	return (
		<View style={styles.container}>
			<View style={styles.headerCard}>
				<Text style={styles.headerTitle}>QUESTION LIST</Text>
			</View>
			<ScrollView contentContainerStyle={{ gap: 12, padding: 16 }}>
				<QuestionCard />
				<QuestionCard />
			</ScrollView>
			<Pressable style={styles.fab} onPress={() => router.push('/student/ask')}><Text style={styles.fabText}>+</Text></Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	headerCard: { margin: 16, backgroundColor: '#0b5eff', padding: 16, borderRadius: 8 },
	headerTitle: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
	qCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, elevation: 1, shadowColor: '#00000020' },
	qTitle: { color: '#1f2937', fontWeight: '700', marginBottom: 8 },
	qText: { color: '#6b7280' },
	viewBtn: { alignSelf: 'flex-end', marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#e5ecff' },
	viewText: { color: '#1d4ed8', fontWeight: '700' },
	fab: { position: 'absolute', right: 20, bottom: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: '#0b5eff', alignItems: 'center', justifyContent: 'center' },
	fabText: { color: '#fff', fontWeight: '800', fontSize: 24 },
});


