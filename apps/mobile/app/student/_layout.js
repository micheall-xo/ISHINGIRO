import { Drawer } from 'expo-router/drawer';

export default function StudentDrawerLayout() {
	return (
		<Drawer
			screenOptions={{
				headerShown: false,
				drawerActiveTintColor: '#1d4ed8',
				drawerInactiveTintColor: '#111827',
			}}
		>
			<Drawer.Screen name="index" options={{ title: 'Home' }} />
			<Drawer.Screen name="homework" options={{ title: 'Homework' }} />
			<Drawer.Screen name="results-list" options={{ title: 'Results' }} />
			<Drawer.Screen name="result-first" options={{ title: 'Result - First Term' }} />
			<Drawer.Screen name="result-second" options={{ title: 'Result - Second Term' }} />
			<Drawer.Screen name="notices" options={{ title: 'Notices' }} />
			<Drawer.Screen name="exam-routine" options={{ title: 'Exam Routine' }} />
			<Drawer.Screen name="solution" options={{ title: 'Solution' }} />
			<Drawer.Screen name="question-list" options={{ title: 'Question List' }} />
			<Drawer.Screen name="ask" options={{ title: 'Ask Question' }} />
			<Drawer.Screen name="quiz" options={{ title: 'Quiz' }} />
			<Drawer.Screen name="profile" options={{ title: 'Student Profile' }} />
			<Drawer.Screen name="plans" options={{ title: 'Create Plans' }} />
			<Drawer.Screen name="reminders" options={{ title: 'Set Reminders' }} />
			<Drawer.Screen name="special-days" options={{ title: 'Special Days' }} />
			<Drawer.Screen name="learning-path" options={{ title: 'Learning Path' }} />
		</Drawer>
	);
}


