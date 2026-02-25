import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function ChooseScreen() {
	const router = useRouter();
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Choose your option</Text>
			<View style={styles.row}>
				<Pressable style={styles.card} onPress={() => router.push('/login?role=student')}>
					<Text style={styles.cardText}>Student</Text>
				</Pressable>
				<Pressable style={styles.card} onPress={() => router.push('/login?role=teacher')}>
					<Text style={styles.cardText}>Teacher</Text>
				</Pressable>
			</View>
			<View style={styles.row}>
				<Pressable style={styles.card} onPress={() => router.push('/login?role=admin')}>
					<Text style={styles.cardText}>Admin</Text>
				</Pressable>
			</View>
			<Pressable style={[styles.card, styles.full]} onPress={() => router.push('/login?role=guest')}>
				<Text style={styles.cardText}>Guest</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	// 
	container: {
		flex: 1,
		backgroundColor: '#fff',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	  },
	  title: {
		fontSize: 20,
		fontWeight: '600',
		textAlign: 'center',
		marginBottom: 30,
	  },
	  row: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginBottom: 20,
	  },
	  card: {
		width: 130, 
		height: 90,
		backgroundColor: '#1d4ed8',
		borderRadius: 22,
		justifyContent: 'center',
		alignItems: 'center',
		marginHorizontal: 10,
	  },
	  cardLarge: {
		width: 300,
		height: 140,
		backgroundColor: '#1d4ed8',
		borderRadius: 22,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 20,
	  },
	  cardText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	  },
});

