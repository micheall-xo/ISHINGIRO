import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Platform } from 'react-native';
import { useContext } from 'react';
import { AuthContext } from './_layout';
import { useLocalSearchParams, useRouter } from 'expo-router';

const API_BASE = Platform.select({
	web: 'http://localhost:5000/api',
	default: 'http://10.0.2.2:5000/api',
});

export default function LoginScreen() {
	const { role } = useLocalSearchParams();
	const router = useRouter();
	const { setSession } = useContext(AuthContext);
	const roleLabel = useMemo(() => (role ? String(role).toUpperCase() : 'USER'), [role]);
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isNavigating, setIsNavigating] = useState(false);

	async function onLogin() {
		if (!username || !password) {
			Alert.alert('Missing info', 'Enter username and password');
			return;
		}
		
		setIsLoading(true);
		try {
			const res = await fetch(`${API_BASE}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data?.error || 'Login failed');
			}
			await setSession(data.token, data.user, data.session);
			
			setIsLoading(false);
			setIsNavigating(true);
			
			const userRole = data?.user?.role || role;
			if (userRole === 'admin') {
				router.replace('/admin');
			} else if (userRole === 'teacher') {
				router.replace('/teacher');
			} else if (userRole === 'student') {
				router.replace('/student');
			} else {
				router.replace('/guest');
			}
		} catch (e) {
			setIsLoading(false);
			setIsNavigating(false);
			Alert.alert('Login failed', e.message);
		}
	}
	
	function onRegister() {
		if (!username || !password) {
			Alert.alert('Missing info', 'Enter username and password');
			return;
		}
		
		setIsNavigating(true);
		if (role === 'teacher') {
			router.replace('/teacher');
		} else if (role === 'student') {
			router.replace('/student');
		} else if (role === 'guest') {
			router.replace('/guest');
		}
	}
	
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Login as {roleLabel}</Text>
			<TextInput
				placeholder="Username"
				value={username}
				onChangeText={setUsername}
				style={styles.input}
				autoCapitalize="none"
				editable={!isLoading && !isNavigating}
			/>
			<TextInput
				placeholder="Password"
				value={password}
				onChangeText={setPassword}
				style={styles.input}
				secureTextEntry
				editable={!isLoading && !isNavigating}
			/>
			<Pressable 
				style={[styles.button, (isLoading || isNavigating) && styles.buttonDisabled]} 
				onPress={onLogin}
				disabled={isLoading || isNavigating}
			>
				{isLoading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator color="white" size="small" />
						<Text style={styles.loadingText}>Logging in...</Text>
					</View>
				) : isNavigating ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator color="white" size="small" />
						<Text style={styles.loadingText}>Redirecting...</Text>
					</View>
				) : (
					<Text style={styles.buttonText}>Login</Text>
				)}
			</Pressable>

			<Pressable 
				style={styles.button} 
				onPress={() => router.push('/register')}
			>
				<Text style={styles.buttonText}>Register</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		padding: 24,
		gap: 16,
		backgroundColor: '#ffffff',
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 8,
	},
	input: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	button: {
		backgroundColor: '#1d4ed8',
		borderRadius: 10,
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 8,
	},
	buttonDisabled: {
		backgroundColor: '#9ca3af',
	},
	buttonText: {
		color: 'white',
		fontWeight: '600',
		fontSize: 16,
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	loadingText: {
		color: 'white',
		fontWeight: '600',
		fontSize: 16,
	},
});
