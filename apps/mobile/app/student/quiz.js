import { View, Text, StyleSheet, Pressable } from 'react-native';
export default function QuizLanding() {
	return (
		<View style={styles.container}>
			<View style={styles.headerCard}>
				<Text style={styles.headerTitle}>QUIZ</Text>
			</View>
			<View style={styles.body}>
				<Pressable style={styles.button}><Text style={styles.buttonText}>Start</Text></Pressable>
			</View>
		</View>
		
	);
}
{/* <View style={styles.featuresGrid}>
					{features.map((feature) => (
						<Pressable 
							key={feature.id} 
							style={styles.featureCard}
							onPress={() => router.push(feature.route)}
						>
							<View style={[styles.featureIconContainer, { backgroundColor: feature.color + '20' }]}>
								<Text style={styles.featureIcon}>{feature.icon}</Text>
							</View>
							<Text style={styles.featureTitle}>{feature.title}</Text>
							<Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
							<View style={[styles.featureArrow, { backgroundColor: feature.color + '20' }]}>
								<Text style={[styles.arrowText, { color: feature.color }]}>â†’</Text>
							</View>
						</Pressable>
					))}
				</View> */}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	headerCard: { margin: 16, backgroundColor: '#0b5eff', padding: 16, borderRadius: 8 },
	headerTitle: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
	body: { margin: 16 },
	button: { backgroundColor: '#1d4ed8', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, alignSelf: 'flex-start' },
	buttonText: { color: '#fff', fontWeight: '700' },
});



