import { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function SplashScreen() {
	const router = useRouter();

	useEffect(() => {
		const timer = setTimeout(() => {
			router.replace('/choose');
		}, 3000);
		return () => clearTimeout(timer);
	}, [router]);

	return (
		<View style={styles.container}>
			<Image source={require('../assets/icon.jpg')} style={styles.logo} resizeMode="contain" />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
	},
	logo: {
		width: 200,
		height: 200,				
	},
});


