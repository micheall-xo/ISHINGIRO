import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, TextInput, Alert, Platform } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../services/api';

export default function TeacherSolutions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState('');
  const [moderatingId, setModeratingId] = useState('');
  const [replyForm, setReplyForm] = useState({});

  async function loadPosts() {
    try {
      setLoading(true);
      const response = await apiRequest('/teacher-content/qa-posts');
      setPosts(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      Alert.alert('Solutions', error.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  const subjects = useMemo(() => {
    const list = [...new Set(posts.map((item) => String(item.subject || '').trim()).filter(Boolean))];
    return [{ id: 'all', name: 'All', icon: '📚' }, ...list.map((name) => ({ id: name.toLowerCase(), name, icon: '📘' }))];
  }, [posts]);

  const classes = useMemo(() => [{ id: 'all', name: 'All', icon: '🏫' }, ...[...new Set(posts.map((item) => String(item.category || '').trim()).filter(Boolean))].map((name) => ({ id: name.toLowerCase(), name, icon: '🎓' }))], [posts]);

  const filteredSolutions = useMemo(
    () =>
      posts.filter((solution) => {
        if (selectedSubject !== 'all' && String(solution.subject || '').toLowerCase() !== selectedSubject) return false;
        if (selectedClass !== 'all' && String(solution.category || '').toLowerCase() !== selectedClass) return false;
        if (searchQuery && !String(solution.title || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      }),
    [posts, selectedSubject, selectedClass, searchQuery]
  );

  const stats = {
    total: posts.length,
    published: posts.filter((s) => s.status === 'answered').length,
    draft: posts.filter((s) => s.status !== 'answered').length,
    totalViews: posts.reduce((sum, s) => sum + Number(s.views || 0), 0),
    averageRating: posts.length
      ? (posts.reduce((sum, s) => sum + (Array.isArray(s.replies) ? s.replies.length : 0), 0) / posts.length).toFixed(1)
      : '0.0',
  };

  const getStatusColor = (status) => {
    if (status === 'answered') return '#10b981';
    if (status === 'pending') return '#f59e0b';
    if (status === 'closed') return '#6b7280';
    return '#6b7280';
  };

  const getRatingColor = (rating) => {
    const n = Number(rating || 0);
    if (n >= 4.5) return '#10b981';
    if (n >= 4.0) return '#f59e0b';
    return '#ef4444';
  };

  function downloadAttachment(attachment) {
    if (!attachment?.dataUrl) return;
    if (Platform.OS !== 'web') {
      Alert.alert('Download', 'File download is available on web in this build.');
      return;
    }
    const link = document.createElement('a');
    link.href = attachment.dataUrl;
    link.download = attachment.name || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function pickReplyFile(postId) {
    if (Platform.OS !== 'web') {
      Alert.alert('Upload', 'File picker is available on web in this build.');
      return;
    }
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          setReplyForm((prev) => ({
            ...prev,
            [postId]: {
              ...(prev[postId] || {}),
              attachment: {
                name: file.name || 'file',
                mimeType: file.type || '',
                size: Number(file.size || 0),
                dataUrl: String(reader.result || ''),
              },
            },
          }));
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } catch (error) {
      Alert.alert('Upload failed', 'Could not open file picker');
    }
  }

  async function submitReply(postId) {
    const payload = replyForm[postId] || {};
    const content = String(payload.content || '').trim();
    const attachment = payload.attachment || null;
    if (!content && !attachment) {
      Alert.alert('Reply', 'Add reply text or a file.');
      return;
    }
    setReplyingId(postId);
    try {
      await apiRequest(`/teacher-content/qa-posts/${postId}/replies`, {
        method: 'POST',
        body: { content, attachment },
      });
      setReplyForm((prev) => ({ ...prev, [postId]: { content: '', attachment: null } }));
      await loadPosts();
    } catch (error) {
      Alert.alert('Reply failed', error.message);
    } finally {
      setReplyingId('');
    }
  }

  async function moderatePost(postId, status) {
    setModeratingId(postId);
    try {
      await apiRequest(`/teacher-content/qa-posts/${postId}/status`, {
        method: 'PATCH',
        body: { status },
      });
      await loadPosts();
      Alert.alert('Moderation', status === 'closed' ? 'Post closed' : 'Post reopened');
    } catch (error) {
      Alert.alert('Moderation failed', error.message);
    } finally {
      setModeratingId('');
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#ef4444" />

      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>💡 Educational Solutions</Text>
            <Text style={styles.headerSubtitle}>Create and share learning resources</Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Solutions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.averageRating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.selectionContainer}>
        <Text style={styles.sectionTitle}>Select Subject</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectsScroll}>
          {subjects.map((subject) => (
            <Pressable
              key={subject.id}
              style={[styles.subjectCard, selectedSubject === subject.id && styles.subjectCardActive]}
              onPress={() => setSelectedSubject(subject.id)}
            >
              <Text style={styles.subjectIcon}>{subject.icon}</Text>
              <Text style={styles.subjectName}>{subject.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.selectionContainer}>
        <Text style={styles.sectionTitle}>Select Class</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classesScroll}>
          {classes.map((classItem) => (
            <Pressable
              key={classItem.id}
              style={[styles.classCard, selectedClass === classItem.id && styles.classCardActive]}
              onPress={() => setSelectedClass(classItem.id)}
            >
              <Text style={styles.classIcon}>{classItem.icon}</Text>
              <Text style={styles.className}>{classItem.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.overviewContainer}>
        <Text style={styles.sectionTitle}>Solutions Overview</Text>
        <View style={styles.overviewGrid}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewIcon}>📚</Text>
            <Text style={styles.overviewNumber}>{stats.total}</Text>
            <Text style={styles.overviewLabel}>Total</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewIcon}>✅</Text>
            <Text style={styles.overviewNumber}>{stats.published}</Text>
            <Text style={styles.overviewLabel}>Published</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewIcon}>📝</Text>
            <Text style={styles.overviewNumber}>{stats.draft}</Text>
            <Text style={styles.overviewLabel}>Pending</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewIcon}>👁️</Text>
            <Text style={styles.overviewNumber}>{stats.totalViews}</Text>
            <Text style={styles.overviewLabel}>Views</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search solutions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <View style={styles.solutionsContainer}>
        <Text style={styles.sectionTitle}>Educational Solutions</Text>
        {loading ? <Text style={styles.metaText}>Loading...</Text> : null}
        {!loading && !filteredSolutions.length ? <Text style={styles.metaText}>No posts found.</Text> : null}
        {filteredSolutions.map((solution) => (
          <View key={solution.id} style={styles.solutionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.subjectInfo}>
                <Text style={styles.subjectIcon}>{solution.type === 'blog' ? '📰' : '❓'}</Text>
                <View>
                  <Text style={styles.subjectName}>{solution.subject || 'General'}</Text>
                  <Text style={styles.className}>{solution.category || '-'}</Text>
                </View>
              </View>
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(solution.status)}20` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(solution.status) }]}>
                    {String(solution.status || 'pending').charAt(0).toUpperCase() + String(solution.status || 'pending').slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.solutionTitle}>{solution.title}</Text>
            <Text style={styles.topic}>Topic: {solution.subject || '-'}</Text>
            <Text style={styles.content}>{solution.content}</Text>

            <View style={styles.metadata}>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>👨‍🏫</Text>
                <Text style={styles.metaText}>{solution.author?.name || '-'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📅</Text>
                <Text style={styles.metaText}>{String(solution.createdAt || '').slice(0, 10)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>👁️</Text>
                <Text style={styles.metaText}>{Number(solution.views || 0)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📥</Text>
                <Text style={styles.metaText}>{Array.isArray(solution.attachments) ? solution.attachments.length : 0}</Text>
              </View>
            </View>

            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Rating:</Text>
              <View style={styles.ratingStars}>
                <Text style={styles.starIcon}>⭐</Text>
                <Text style={[styles.ratingValue, { color: getRatingColor(4 + Math.min((solution.replies || []).length / 10, 1)) }]}>
                  {(4 + Math.min((solution.replies || []).length / 10, 1)).toFixed(1)}
                </Text>
              </View>
            </View>

            {(solution.attachments || []).map((file) => (
              <Pressable key={file.id} style={styles.viewButton} onPress={() => downloadAttachment(file)}>
                <Text style={styles.viewIcon}>⬇️</Text>
                <Text style={styles.viewText}>{file.name}</Text>
              </Pressable>
            ))}

            <View style={[styles.actionButtons, { marginTop: 10 }]}>
              <Pressable style={styles.viewButton} onPress={() => setReplyForm((prev) => ({ ...prev, [solution.id]: { ...(prev[solution.id] || {}), open: !prev[solution.id]?.open } }))}>
                <Text style={styles.viewIcon}>💬</Text>
                <Text style={styles.viewText}>Reply</Text>
              </Pressable>
              <Pressable style={styles.shareButton} onPress={() => pickReplyFile(solution.id)}>
                <Text style={styles.shareIcon}>📎</Text>
                <Text style={styles.shareText}>Attach</Text>
              </Pressable>
            </View>
            <View style={[styles.actionButtons, { marginTop: 8 }]}>
              {solution.status === 'closed' ? (
                <Pressable
                  style={styles.editButton}
                  onPress={() => moderatePost(solution.id, 'pending')}
                  disabled={moderatingId === solution.id}
                >
                  <Text style={styles.editText}>{moderatingId === solution.id ? 'Updating...' : 'Reopen'}</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.editButton}
                  onPress={() => moderatePost(solution.id, 'closed')}
                  disabled={moderatingId === solution.id}
                >
                  <Text style={styles.editText}>{moderatingId === solution.id ? 'Updating...' : 'Close Post'}</Text>
                </Pressable>
              )}
            </View>

            {replyForm[solution.id]?.open ? (
              <View style={{ marginTop: 12 }}>
                {(solution.replies || []).map((reply) => (
                  <View key={reply.id} style={styles.ratingContainer}>
                    <Text style={styles.metaText}>
                      {reply.author?.name || 'User'}: {reply.content || 'File reply'}
                    </Text>
                    {reply.attachment ? (
                      <Pressable style={styles.shareButton} onPress={() => downloadAttachment(reply.attachment)}>
                        <Text style={styles.shareText}>Download</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <View style={styles.searchBar}>
                  <TextInput
                    style={[styles.searchInput, { minHeight: 60, textAlignVertical: 'top' }]}
                    multiline
                    placeholder="Write answer"
                    value={replyForm[solution.id]?.content || ''}
                    onChangeText={(value) =>
                      setReplyForm((prev) => ({
                        ...prev,
                        [solution.id]: { ...(prev[solution.id] || {}), content: value, open: true },
                      }))
                    }
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <Pressable style={[styles.editButton, { marginTop: 10 }]} onPress={() => submitReply(solution.id)} disabled={replyingId === solution.id}>
                  <Text style={styles.editText}>{replyingId === solution.id ? 'Sending...' : 'Send Answer'}</Text>
                </Pressable>
              </View>
            ) : null}
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
    height: 280,
    marginBottom: 29,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#ef4444',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  headerContent: {
    flex: 0,
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
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
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
  selectionContainer: {
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
  subjectsScroll: {
    paddingHorizontal: 0,
  },
  subjectCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginRight: 16,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  subjectCardActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  subjectIcon: {
    fontSize: 24,
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  classesScroll: {
    paddingHorizontal: 0,
  },
  classCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginRight: 16,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  classCardActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  classIcon: {
    fontSize: 24,
    marginBottom: 12,
  },
  className: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  overviewContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  overviewCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  overviewIcon: {
    fontSize: 24,
    marginBottom: 12,
  },
  overviewNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
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
  solutionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  solutionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
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
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  solutionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 26,
  },
  topic: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 12,
  },
  content: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 9,
    borderRadius: 12,
  },
  viewIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  viewText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 11,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  editText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  shareIcon: {
    fontSize: 12,
    marginRight: 8,
  },
  shareText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomSpacing: {
    height: 24,
  },
});
