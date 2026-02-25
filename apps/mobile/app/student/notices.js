import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, TextInput, Alert, ActivityIndicator, Share } from 'react-native';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';

export default function StudentNotices() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState([]);
  const [categories, setCategories] = useState([{ id: 'all', label: 'All', icon: '📰' }]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await apiRequest('/teacher-content/student/notices');
        const nextNotices = Array.isArray(response?.notices) ? response.notices : [];
        const nextCategories = Array.isArray(response?.categories) ? response.categories : [];
        setNotices(nextNotices);
        setCategories(nextCategories.length ? nextCategories : [{ id: 'all', label: 'All', icon: '📰' }]);
      } catch (error) {
        Alert.alert('Notices', error.message || 'Failed to load notices');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredNotices = notices.filter((notice) => {
    const title = String(notice.title || '').toLowerCase();
    const content = String(notice.content || '').toLowerCase();
    const matchesSearch =
      title.includes(String(searchQuery || '').toLowerCase()) ||
      content.includes(String(searchQuery || '').toLowerCase());
    const matchesCategory = selectedCategory === 'all' || notice.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const unreadCount = notices.filter((notice) => !notice.isRead).length;

  async function markRead(notice) {
    try {
      if (!notice?.notificationId || notice?.isRead) return;
      await apiRequest(`/notifications/${notice.notificationId}/read`, { method: 'PUT' });
      setNotices((prev) =>
        prev.map((item) => (String(item.id) === String(notice.id) ? { ...item, isRead: true } : item))
      );
    } catch (error) {
      Alert.alert('Notices', error.message || 'Failed to update notice');
    }
  }

  async function shareNotice(notice) {
    try {
      await Share.share({
        title: String(notice?.title || 'Notice'),
        message: `${String(notice?.title || '')}\n\n${String(notice?.content || '')}`,
      });
    } catch (error) {
      Alert.alert('Notices', error.message || 'Failed to share notice');
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#f59e0b" />

      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>📢 School Notices</Text>
            <Text style={styles.headerSubtitle}>Stay updated with school news</Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{unreadCount}</Text>
              <Text style={styles.statLabel}>Unread</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{notices.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search notices..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              style={[styles.categoryButton, selectedCategory === category.id && styles.categoryButtonActive]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={[styles.categoryLabel, selectedCategory === category.id && styles.categoryLabelActive]}>
                {category.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.noticesContainer}>
        <Text style={styles.sectionTitle}>
          {selectedCategory === 'all'
            ? 'All Notices'
            : `${categories.find((c) => c.id === selectedCategory)?.label || 'Category'} Notices`}
        </Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#f59e0b" />
            <Text style={styles.loadingText}>Loading notices...</Text>
          </View>
        ) : filteredNotices.length === 0 ? (
          <Text style={styles.emptyText}>No notices available.</Text>
        ) : (
          filteredNotices.map((notice) => (
            <View key={notice.id} style={[styles.noticeCard, !notice.isRead && styles.unreadCard]}>
              <View style={styles.cardHeader}>
                <View style={styles.noticeInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.noticeIcon}>{notice.icon || '📢'}</Text>
                    <Text style={styles.noticeTitle}>{notice.title}</Text>
                    {!notice.isRead && <View style={styles.unreadIndicator} />}
                  </View>
                  <Text style={styles.noticeAuthor}>By {notice.author || 'School'}</Text>
                </View>
                <View style={styles.priorityContainer} />
              </View>

              <Text style={styles.noticeContent}>{notice.content}</Text>

              <View style={styles.cardFooter}>
                <View style={styles.dateTime}>
                  <Text style={styles.dateText}>{notice.date}</Text>
                  <Text style={styles.timeText}>{notice.time}</Text>
                </View>
                <View style={styles.actionButtons}>
                  <Pressable style={styles.readButton} onPress={() => markRead(notice)}>
                    <Text style={styles.readIcon}>👁️</Text>
                    <Text style={styles.readText}>Read More</Text>
                  </Pressable>
                  <Pressable style={styles.shareButton} onPress={() => shareNotice(notice)}>
                    <Text style={styles.shareIcon}>📤</Text>
                    <Text style={styles.shareText}>Share</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}
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
    backgroundColor: '#f59e0b',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#f59e0b',
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
    paddingHorizontal: 14,
    paddingTop: 60,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '400',
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
  categoriesContainer: {
    marginBottom: 24,
  },
  categoriesScroll: {
    paddingHorizontal: 24,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
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
  categoryButtonActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryLabelActive: {
    color: '#ffffff',
  },
  noticesContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  noticeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  noticeInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  noticeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e293b',
    flex: 1,
    lineHeight: 16,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
    marginLeft: 8,
  },
  noticeAuthor: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  priorityContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  noticeContent: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  dateTime: {
    alignItems: 'center',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '600',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 7,
    color: '#64748b',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 9,
  },
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  readIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  readText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  shareIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  shareText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  bottomSpacing: {
    height: 24,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    color: '#64748b',
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748b',
    fontWeight: '600',
  },
});
