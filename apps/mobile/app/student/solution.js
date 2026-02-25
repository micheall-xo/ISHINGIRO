import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, TextInput } from 'react-native';
import { useState } from 'react';
import { usePageData } from '../../services/usePageData';


	export default function StudentSolution() {
	const { data } = usePageData('student-solution');
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedSubject, setSelectedSubject] = useState('all');
	
	const solutions = Array.isArray(data.solutions) ? data.solutions : [];

	const subjects = Array.isArray(data.subjects) ? data.subjects : [];

	const getDifficultyColor = (difficulty) => {
		switch (difficulty) {
			case 'Beginner': return '#10b981';
			case 'Intermediate': return '#f59e0b';
			case 'Advanced': return '#ef4444';
			default: return '#6b7280';
		}
	};

	const getSubjectColor = (subject) => {
		switch (subject) {
			case 'Mathematics': return '#3b82f6';
			case 'Physics': return '#8b5cf6';
			case 'Chemistry': return '#f59e0b';
			case 'English': return '#10b981';
			case 'Biology': return '#ef4444';
			default: return '#6b7280';
		}
	};

	const filteredSolutions = solutions.filter(solution => {
		const matchesSearch = solution.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
							solution.description.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesSubject = selectedSubject === 'all' || solution.subject === selectedSubject;
		return matchesSearch && matchesSubject;
	});

	const totalDownloads = solutions.reduce((sum, solution) => sum + solution.downloads, 0);
	const averageRating = solutions.reduce((sum, solution) => sum + solution.rating, 0) / solutions.length;

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			<StatusBar barStyle="light-content" backgroundColor="#06b6d4" />
			
			{/* Header Section */}
			<View style={styles.header}>
				<View style={styles.headerBackground} />
				<View style={styles.headerContent}>
					<View style={styles.headerInfo}>
						<Text style={styles.headerTitle}>ðŸ’¡ Study Solutions</Text>
						{/* <Text style={styles.headerSubtitle}>Access comprehensive study materials</Text> */}
					</View>
					<View style={styles.headerStats}>
						<View style={styles.statItem}>
							<Text style={styles.statNumber}>{solutions.length}</Text>
							<Text style={styles.statLabel}>Solutions</Text>
						</View>
						<View style={styles.statItem}>
							<Text style={styles.statNumber}>{totalDownloads.toLocaleString()}</Text>
							<Text style={styles.statLabel}>Downloads</Text>
						</View>
					</View>
				</View>
			</View>

			{/* Search Bar */}
			<View style={styles.searchContainer}>
				<View style={styles.searchBar}>
					<Text style={styles.searchIcon}>ðŸ”</Text>
					<TextInput
						style={styles.searchInput}
						placeholder="Search solutions..."
						value={searchQuery}
						onChangeText={setSearchQuery}
						placeholderTextColor="#9ca3af"
					/>
				</View>
			</View>

			{/* Subject Filter */}
			<View style={styles.subjectsContainer}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectsScroll}>
					{subjects.map((subject) => (
						<Pressable
							key={subject.id}
							style={[
								styles.subjectButton,
								selectedSubject === subject.id && styles.subjectButtonActive
							]}
							onPress={() => setSelectedSubject(subject.id)}
						>
							<Text style={styles.subjectIcon}>{subject.icon}</Text>
							<Text style={[
								styles.subjectLabel,
								selectedSubject === subject.id && styles.subjectLabelActive
							]}>
								{subject.label}
							</Text>
						</Pressable>
					))}
				</ScrollView>
			</View>

			{/* Quick Stats */}
			<View style={styles.statsContainer}>
				<Text style={styles.sectionTitle}>Overview</Text>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectsScroll}></ScrollView>
					<View style={styles.statsGrid}>
						<View style={styles.statCard}>
							<Text style={styles.statIcon}>â­</Text>
							<Text style={styles.statValue}>{averageRating.toFixed(1)}</Text>
							<Text style={styles.statLabel}>Avg Rating</Text>
						</View>
						<View style={styles.statCard}>
							<Text style={styles.statIcon}>ðŸ“¥</Text>
							<Text style={styles.statValue}>{Math.round(totalDownloads / solutions.length)}</Text>
							<Text style={styles.statLabel}>Avg Downloads</Text>
						</View>
						<View style={styles.statCard}>
							<Text style={styles.statIcon}>ðŸ“…</Text>
							<Text style={styles.statValue}>2025</Text>
							<Text style={styles.statLabel}>Latest</Text>
						</View>
						
					</View>
				
			</View>

			{/* Solutions List */}
			<View style={styles.solutionsContainer}>
				<Text style={styles.sectionTitle}>
					{selectedSubject === 'all' ? 'All Solutions' : `${selectedSubject} Solutions`}
				</Text>
				{filteredSolutions.map((solution) => (
					<View key={solution.id} style={styles.solutionCard}>
						<View style={styles.cardHeader}>
							<View style={styles.solutionInfo}>
								<Text style={styles.solutionIcon}>{solution.icon}</Text>
								<View>
									<Text style={styles.solutionTitle}>{solution.title}</Text>
									<Text style={styles.solutionChapter}>{solution.chapter}</Text>
								</View>
							</View>
							<View style={styles.ratingContainer}>
								<Text style={styles.ratingText}>â­ {solution.rating}</Text>
							</View>
						</View>
						
						<Text style={styles.solutionDescription}>{solution.description}</Text>
						
						<View style={styles.topicsContainer}>
							<Text style={styles.topicsTitle}>Topics Covered:</Text>
							<View style={styles.topicsList}>
								{solution.topics.map((topic, index) => (
									<View key={index} style={styles.topicBadge}>
										<Text style={styles.topicText}>{topic}</Text>
									</View>
								))}
							</View>
						</View>
						
						<View style={styles.cardFooter}>
							<View style={styles.metaInfo}>
								<View style={styles.metaItem}>
									<Text style={styles.metaLabel}>Difficulty</Text>
									<View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(solution.difficulty) + '20' }]}>
										<Text style={[styles.difficultyText, { color: getDifficultyColor(solution.difficulty) }]}>
											{solution.difficulty}
										</Text>
									</View>
								</View>
								<View style={styles.metaItem}>
									<Text style={styles.metaLabel}>Downloads</Text>
									<Text style={styles.metaValue}>{solution.downloads.toLocaleString()}</Text>
								</View>
								<View style={styles.metaItem}>
									<Text style={styles.metaLabel}>File Size</Text>
									<Text style={styles.metaValue}>{solution.fileSize}</Text>
								</View>
							</View>
						</View>
						
						<View style={styles.actionButtons}>
							<Pressable style={styles.downloadButton}>
								<Text style={styles.downloadIcon}>ðŸ“¥</Text>
								<Text style={styles.downloadText}>Download</Text>
							</Pressable>
							<Pressable style={styles.previewButton}>
								<Text style={styles.previewIcon}>ðŸ‘ï¸</Text>
								<Text style={styles.previewText}>Preview</Text>
							</Pressable>
							{/* <Pressable style={styles.bookmarkButton}>
								<Text style={styles.bookmarkIcon}>ðŸ”–</Text>
								<Text style={styles.bookmarkText}>Bookmark</Text>
							</Pressable> */}
						</View>
					</View>
				))}
			</View>
			
			<View style={styles.bottomSpacing} />
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	header: {
		position: 'relative',
		height: 180,
		marginBottom: 24,
	},
	headerBackground: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		height: '100%',
		backgroundColor: '#06b6d4',
		borderBottomLeftRadius: 30,
		borderBottomRightRadius: 30,
		shadowColor: '#06b6d4',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 16,
		elevation: 8,
	},
	headerContent: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingTop: 60,
	},
	headerInfo: {
		flex: 1,
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: '800',
		color: '#ffffff',
		marginBottom: 5,
		letterSpacing: -0.5,
	},
	headerSubtitle: {
		fontSize: 14,
		color: 'rgba(255,255,255,0.9)',
		fontWeight: '500',
	},
	headerStats: {
		flexDirection: 'row',
		gap: 20,
	},
	statItem: {
		alignItems: 'center',
	},
	statNumber: {
		fontSize: 24,
		fontWeight: '800',
		color: '#ffffff',
	},
	statLabel: {
		fontSize: 12,
		color: 'rgba(255,255,255,0.8)',
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	searchContainer: {
		paddingHorizontal: 24,
		marginBottom: 20,
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		borderRadius: 16,
		paddingHorizontal: 16,
		paddingVertical: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 3,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.8)',
	},
	searchIcon: {
		fontSize: 18,
		marginRight: 12,
		color: '#9ca3af',
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: '#1e293b',
	},
	subjectsContainer: {
		marginBottom: 20,
	},
	subjectsScroll: {
		paddingHorizontal: 30,
	},
	subjectButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 20,
		marginRight: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 3,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.8)',
	},
	subjectButtonActive: {
		backgroundColor: '#06b6d4',
		borderColor: '#06b6d4',
	},
	subjectIcon: {
		fontSize: 16,
		marginRight: 8,
	},
	subjectLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#64748b',
	},
	subjectLabelActive: {
		color: '#ffffff',
	},
	statsContainer: {
		paddingHorizontal: 24,
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 22,
		fontWeight: '800',
		color: '#1e293b',
		marginBottom: 16,
		letterSpacing: -0.5,
	},
	statsGrid: {
		flexDirection: 'row',
		gap: 16,
	},
	statCard: {
		flex: 1,
		backgroundColor: '#ffffff',
		padding: 7,
		borderRadius: 29,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 2, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 3,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.8)',
	},
	statIcon: {
		fontSize: 24,
		marginBottom: 12,
	},
	statValue: {
		fontSize: 24,
		fontWeight: '800',
		color: '#1e293b',
		marginBottom: 8,
		letterSpacing: -0.5,
	},
	statLabel: {
		fontSize: 12,
		color: '#64748b',
		fontWeight: '600',
		textAlign: 'center',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	solutionsContainer: {
		paddingHorizontal: 24,
		marginBottom: 32,
	},
	solutionCard: {
		backgroundColor: '#ffffff',
		borderRadius: 20,
		padding: 40,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 6,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.8)',
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 16,
	},
	solutionInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	solutionIcon: {
		fontSize: 32,
		marginRight: 16,
	},
	solutionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1e293b',
		marginBottom: 4,
		lineHeight: 24,
	},
	solutionChapter: {
		fontSize: 14,
		color: '#64748b',
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	ratingContainer: {
		alignItems: 'flex-end',
	},
	ratingText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#f59e0b',
	},
	solutionDescription: {
		fontSize: 14,
		color: '#64748b',
		lineHeight: 20,
		marginBottom: 16,
	},
	topicsContainer: {
		marginBottom: 20,
	},
	topicsTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1e293b',
		marginBottom: 12,
	},
	topicsList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	topicBadge: {
		backgroundColor: '#f1f5f9',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
	},
	topicText: {
		fontSize: 12,
		color: '#64748b',
		fontWeight: '600',
	},
	cardFooter: {
		marginBottom: 20,
	},
	metaInfo: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	metaItem: {
		alignItems: 'center',
		flex: 1,
	},
	metaLabel: {
		fontSize: 12,
		color: '#64748b',
		fontWeight: '600',
		marginBottom: 8,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		textAlign: 'center',
	},
	metaValue: {
		fontSize: 14,
		fontWeight: '700',
		color: '#1e293b',
		textAlign: 'center',
	},
	difficultyBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
	},
	difficultyText: {
		fontSize: 12,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	actionButtons: {
		flexDirection: 'row',
		gap: 6,
	},
	downloadButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#3b82f6',
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 8,
	},
	downloadIcon: {
		fontSize: 6,
		marginRight: 8,
	},
	downloadText: {
		color: '#ffffff',
		fontWeight: '600',
		fontSize: 14,
	},
	previewButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#10b981',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
	},
	previewIcon: {
		fontSize: 16,
		marginRight: 8,
	},
	previewText: {
		color: '#ffffff',
		fontWeight: '600',
		fontSize: 14,
	},
	bookmarkButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f59e0b',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
	},
	bookmarkIcon: {
		fontSize: 16,
		marginRight: 8,
	},
	bookmarkText: {
		color: '#ffffff',
		fontWeight: '600',
		fontSize: 14,
	},
	bottomSpacing: {
		height: 24,
	},
});





