import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const API_BASE = Platform.select({
	web: 'http://localhost:5000/api',
	default: 'http://10.0.2.2:5000/api',
});

export default function RegisterScreen() {
	const { role } = useLocalSearchParams();
	const router = useRouter();
	const [selectedRole, setSelectedRole] = useState(role || 'student');
	const [formData, setFormData] = useState({
		username: '',
		email: '',
		password: '',
		confirmPassword: '',
		firstName: '',
		lastName: '',
		phoneNumber: '',
	});
	const [isLoading, setIsLoading] = useState(false);
	const [isRoutingToLogin, setIsRoutingToLogin] = useState(false);

	const updateFormData = (field, value) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const handleRoleSelection = (role) => {
		setSelectedRole(role);
	};

	async function onRegister() {
		// Check if user is trying to register as parent or teacher
		if (selectedRole === 'parent' || selectedRole === 'teacher') {
			Alert.alert(
				'Registration Restricted',
				`${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}s cannot self-register. Please contact the administrator to create your account.`,
				[
					{
						text: 'OK',
						onPress: () => router.replace('/choose')
					}
				]
			);
			return;
		}

		// Validation
		if (!formData.username || !formData.email || !formData.password || !formData.firstName || !formData.lastName) {
			Alert.alert('Missing Information', 'Please fill in all required fields');
			return;
		}

		if (formData.password !== formData.confirmPassword) {
			Alert.alert('Password Mismatch', 'Passwords do not match');
			return;
		}

		if (formData.password.length < 6) {
			Alert.alert('Weak Password', 'Password must be at least 6 characters long');
			return;
		}

		setIsLoading(true);
		
		try {
			const userData = {
				username: formData.username,
				email: formData.email,
				password: formData.password,
				firstName: formData.firstName,
				lastName: formData.lastName,
				phoneNumber: formData.phoneNumber,
				role: selectedRole,
			};

			const response = await fetch(`${API_BASE}/auth/register`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(userData),
			});

			const data = await response.json();

			if (response.ok) {
				Alert.alert(
					'Registration Successful', 
					'Your student account has been created successfully!',
					[
						{
							text: 'OK',
							onPress: () => {
								router.replace('/login?role=student');
							}
						}
					]
				);
			} else {
				Alert.alert('Registration Failed', data.error || 'Registration failed');
			}
		} catch (error) {
			Alert.alert('Error', 'Network error. Please check your connection and try again.');
			console.error('Registration error:', error);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			<View style={styles.content}>
				<Text style={styles.title}>Register as Student</Text>
				
				{/* Role Selection */}
				<View style={styles.roleContainer}>
					<Text style={styles.roleLabel}>Select Role:</Text>
					<View style={styles.roleButtons}>
						<Pressable 
							style={[styles.roleButton, selectedRole === 'student' && styles.roleButtonSelected]}
							onPress={() => handleRoleSelection('student')}
							disabled={isLoading || isRoutingToLogin}
						>
							<Text style={[styles.roleButtonText, selectedRole === 'student' && styles.roleButtonTextSelected]}>
								Student
							</Text>
						</Pressable>
						<Pressable 
							style={[styles.roleButton, selectedRole === 'teacher' && styles.roleButtonSelected]}
							onPress={() => handleRoleSelection('teacher')}
							disabled={isLoading || isRoutingToLogin}
						>
							<Text style={[styles.roleButtonText, selectedRole === 'teacher' && styles.roleButtonTextSelected]}>
								Teacher
							</Text>
						</Pressable>
						<Pressable 
							style={[styles.roleButton, selectedRole === 'parent' && styles.roleButtonSelected]}
							onPress={() => handleRoleSelection('parent')}
							disabled={isLoading || isRoutingToLogin}
						>
							<Text style={[styles.roleButtonText, selectedRole === 'parent' && styles.roleButtonTextSelected]}>
								Parent
							</Text>
						</Pressable>
					</View>
					{selectedRole !== 'student' && (
						<Text style={styles.restrictionText}>
							👨‍🏫 {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}s must be added by administrator
						</Text>
					)}
				</View>
				
				<TextInput
					placeholder="Username *"
					value={formData.username}
					onChangeText={(value) => updateFormData('username', value)}
					style={styles.input}
					autoCapitalize="none"
					editable={!isLoading && !isRoutingToLogin}
				/>
				
				<TextInput
					placeholder="Email *"
					value={formData.email}
					onChangeText={(value) => updateFormData('email', value)}
					style={styles.input}
					autoCapitalize="none"
					keyboardType="email-address"
					editable={!isLoading && !isRoutingToLogin}
				/>
				
				<TextInput
					placeholder="First Name *"
					value={formData.firstName}
					onChangeText={(value) => updateFormData('firstName', value)}
					style={styles.input}
					editable={!isLoading && !isRoutingToLogin}
				/>
				
				<TextInput
					placeholder="Last Name *"
					value={formData.lastName}
					onChangeText={(value) => updateFormData('lastName', value)}
					style={styles.input}
					editable={!isLoading && !isRoutingToLogin}
				/>
				
				<TextInput
					placeholder="Phone Number"
					value={formData.phoneNumber}
					onChangeText={(value) => updateFormData('phoneNumber', value)}
					style={styles.input}
					keyboardType="phone-pad"
					editable={!isLoading && !isRoutingToLogin}
				/>
				
				<TextInput
					placeholder="Password *"
					value={formData.password}
					onChangeText={(value) => updateFormData('password', value)}
					style={styles.input}
					secureTextEntry
					editable={!isLoading && !isRoutingToLogin}
				/>
				
				<TextInput
					placeholder="Confirm Password *"
					value={formData.confirmPassword}
					onChangeText={(value) => updateFormData('confirmPassword', value)}
					style={styles.input}
					secureTextEntry
					editable={!isLoading && !isRoutingToLogin}
				/>
				
				<Pressable 
					style={[styles.button, (isLoading || isRoutingToLogin) && styles.buttonDisabled]} 
					onPress={onRegister}
					disabled={isLoading || isRoutingToLogin}
				>
					{isLoading ? (
						<View style={styles.loadingContainer}>
							<ActivityIndicator color="white" size="small" />
							<Text style={styles.loadingText}>Creating account...</Text>
						</View>
					) : (
						<Text style={styles.buttonText}>Register </Text>
					)}
				</Pressable>
				
				<Pressable 
					style={styles.loginButton}
					onPress={() => {
						setIsRoutingToLogin(true);
						router.push('/choose');
					}}
					disabled={isLoading || isRoutingToLogin}
				>
					{isRoutingToLogin ? (
						<View style={styles.loadingContainer}>
							<ActivityIndicator color="#1d4ed8" size="small" />
							<Text style={styles.loginText}>Opening login...</Text>
						</View>
					) : (
						<Text style={styles.loginText}>Already have an account? Login</Text>
					)}
				</Pressable>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
		marginBottom:'40',
		marginTop:'10',
	},
	content: {
		flex: 1,
		justifyContent: 'center',
		padding: 24,
		gap: 16,
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 8,
	},
	roleContainer: {
		marginBottom: 10,
	},
	roleLabel: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 10,
		color: '#374151',
	},
	roleButtons: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 8,
	},
	roleButton: {
		flex: 1,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#d1d5db',
		backgroundColor: '#f9fafb',
		alignItems: 'center',
	},
	roleButtonSelected: {
		backgroundColor: '#1d4ed8',
		borderColor: '#1d4ed8',
	},
	roleButtonText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#374151',
	},
	roleButtonTextSelected: {
		color: '#ffffff',
	},
	restrictionText: {
		fontSize: 12,
		color: '#dc2626',
		fontWeight: '500',
		textAlign: 'center',
		marginTop: 4,
	},
	input: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 16,
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
	loginButton: {
		alignItems: 'center',
		marginTop: 16,
	},
	loginText: {
		color: '#1d4ed8',
		fontSize: 14,
		fontWeight: '500',
	},
});
