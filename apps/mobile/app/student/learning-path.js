import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { usePageData } from '../../services/usePageData';



export default function LearningPathPage() {
	const { data } = usePageData('student-learning-path');
	const learningSteps = Array.isArray(data.learningSteps) ? data.learningSteps : [];
	return (	
		<View style={styles.container}>
			<View style={styles.headerCard}>
				<Text style={styles.headerTitle}>How to learn</Text>
			</View>
			<ScrollView contentContainerStyle={{ gap: 16, padding: 16 }}>
				{learningSteps.map(step => (
					<StepCard key={step.id} step={step} />
				))}
				<Pressable style={styles.startButton}>
					<Text style={styles.startButtonText}>Start Learn</Text>
				</Pressable>
			</ScrollView>
		</View>
	);
}

function StepCard({ step }) {
	return (
		<View style={styles.stepCard}>
			<View style={styles.stepNumber}>
				<Text style={styles.stepNumberText}>{step.id}</Text>
			</View>
			<View style={styles.stepContent}>
				<Text style={styles.stepTitle}>{step.title}</Text>
				<Text style={styles.stepDescription}>{step.description}</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#0f172a' },
	headerCard: { margin: 16, backgroundColor: '#1e293b', padding: 16, borderRadius: 8 },
	headerTitle: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
	stepCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#1e293b', borderRadius: 12, padding: 16 },
	stepNumber: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
	stepNumberText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
	stepContent: { flex: 1 },
	stepTitle: { color: '#fff', fontWeight: '600', marginBottom: 4 },
	stepDescription: { color: '#94a3b8' },
	startButton: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
	startButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

