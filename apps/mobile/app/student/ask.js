import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, TextInput, Alert, Platform } from 'react-native';
import { useMemo, useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';

const DEFAULT_CATEGORIES = [
  { id: 'all', label: 'All', icon: '📚' },
  { id: 'Mathematics', label: 'Mathematics', icon: '📐' },
  { id: 'Physics', label: 'Physics', icon: '🧲' },
  { id: 'Chemistry', label: 'Chemistry', icon: '🧪' },
  { id: 'English', label: 'English', icon: '📖' },
  { id: 'Biology', label: 'Biology', icon: '🧬' },
];

export default function StudentAsk() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAskForm, setShowAskForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replyingId, setReplyingId] = useState('');
  const [editingPostId, setEditingPostId] = useState('');
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);
  const [openDetails, setOpenDetails] = useState({});
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [assignedClassName, setAssignedClassName] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [form, setForm] = useState({
    type: 'question',
    title: '',
    subject: '',
    category: '',
    content: '',
    tags: '',
    attachments: [],
  });
  const [replyForm, setReplyForm] = useState({});

  async function loadData() {
    try {
      setLoading(true);
      const [response, options] = await Promise.all([
        apiRequest('/teacher-content/qa-posts'),
        apiRequest('/teacher-content/qa-subject-options'),
      ]);
      const profile = await apiRequest('/auth/profile');
      const list = Array.isArray(response?.items) ? response.items : [];
      setQuestions(list);
      setCurrentUserId(String(profile?.id || profile?._id || ''));
      setSubjectOptions(Array.isArray(options?.subjects) ? options.subjects : []);
      setAssignedClassName(String(options?.className || ''));
      const dynamicCategories = [...new Set(list.map((item) => String(item.category || '').trim()).filter(Boolean))];
      const merged = [...DEFAULT_CATEGORIES];
      dynamicCategories.forEach((cat) => {
        if (!merged.find((item) => item.id === cat)) {
          merged.push({ id: cat, label: cat, icon: '🏷️' });
        }
      });
      setCategories(merged);
    } catch (error) {
      Alert.alert('Ask', error.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredQuestions = useMemo(
    () =>
      questions.filter((question) => {
        const matchesSearch =
          String(question.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(question.content || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || String(question.category || '') === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [questions, searchQuery, selectedCategory]
  );

  const answeredCount = questions.filter((q) => q.status === 'answered').length;
  const pendingCount = questions.filter((q) => q.status !== 'answered').length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'answered':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'closed':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  async function pickFileForPost() {
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
          setForm((prev) => ({
            ...prev,
            attachments: [
              ...(Array.isArray(prev.attachments) ? prev.attachments : []),
              {
                name: file.name || 'file',
                mimeType: file.type || '',
                size: Number(file.size || 0),
                dataUrl: String(reader.result || ''),
              },
            ],
          }));
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } catch (error) {
      Alert.alert('Upload failed', 'Could not open file picker');
    }
  }

  async function submitPost() {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Missing fields', 'Title and content are required.');
      return;
    }
    if (!form.subject.trim()) {
      Alert.alert('Missing subject', 'Please choose a subject from the list.');
      return;
    }
    setSaving(true);
    try {
      await apiRequest(editingPostId ? `/teacher-content/qa-posts/${editingPostId}` : '/teacher-content/qa-posts', {
        method: editingPostId ? 'PUT' : 'POST',
        body: {
          type: form.type,
          title: form.title,
          subject: form.subject,
          category: form.category || form.subject,
          content: form.content,
          tags: form.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          attachments: form.attachments || [],
        },
      });
      setForm({
        type: 'question',
        title: '',
        subject: '',
        category: '',
        content: '',
        tags: '',
        attachments: [],
      });
      setEditingPostId('');
      setSubjectMenuOpen(false);
      setShowAskForm(false);
      await loadData();
      Alert.alert('Success', editingPostId ? 'Post updated' : 'Post submitted');
    } catch (error) {
      Alert.alert('Post failed', error.message);
    } finally {
      setSaving(false);
    }
  }

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

  async function pickFileForReply(postId) {
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
      Alert.alert('Reply', 'Add reply text or upload a file.');
      return;
    }
    setReplyingId(postId);
    try {
      await apiRequest(`/teacher-content/qa-posts/${postId}/replies`, {
        method: 'POST',
        body: {
          content,
          attachment,
        },
      });
      setReplyForm((prev) => ({ ...prev, [postId]: { content: '', attachment: null } }));
      await loadData();
    } catch (error) {
      Alert.alert('Reply failed', error.message);
    } finally {
      setReplyingId('');
    }
  }

  async function incrementViews(postId) {
    try {
      await apiRequest(`/teacher-content/qa-posts/${postId}/view`, { method: 'POST' });
      setQuestions((prev) =>
        prev.map((item) => (String(item.id) === String(postId) ? { ...item, views: Number(item.views || 0) + 1 } : item))
      );
    } catch (_) {
      // Silent to keep UI smooth.
    }
  }

  function startEditPost(question) {
    setEditingPostId(String(question.id));
    setForm({
      type: question.type || 'question',
      title: question.title || '',
      subject: question.subject || '',
      category: question.category || question.subject || '',
      content: question.content || '',
      tags: Array.isArray(question.tags) ? question.tags.join(',') : '',
      attachments: Array.isArray(question.attachments) ? question.attachments : [],
    });
    setShowAskForm(true);
    setSubjectMenuOpen(false);
  }

  function cancelEdit() {
    setEditingPostId('');
    setForm({
      type: 'question',
      title: '',
      subject: '',
      category: '',
      content: '',
      tags: '',
      attachments: [],
    });
    setShowAskForm(false);
    setSubjectMenuOpen(false);
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#84cc16" />

      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>📝 Ask Questions</Text>
            <Text style={styles.headerSubtitle}>Get help from teachers and peers</Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{answeredCount}</Text>
              <Text style={styles.statLabel}>Answered</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.askButtonContainer}>
        <Pressable style={styles.askButton} onPress={() => setShowAskForm((prev) => !prev)}>
          <Text style={styles.askIcon}>💬</Text>
          <Text style={styles.askText}>Ask a New Question</Text>
        </Pressable>
      </View>

      {showAskForm ? (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Title"
              value={form.title}
              onChangeText={(value) => setForm((prev) => ({ ...prev, title: value }))}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View style={[styles.searchBar, { marginTop: 10 }]}>
            <Pressable style={styles.subjectPicker} onPress={() => setSubjectMenuOpen((prev) => !prev)}>
              <Text style={styles.searchInput}>
                {form.subject || `Subject${assignedClassName ? ` (${assignedClassName})` : ''}`}
              </Text>
              <Text style={styles.searchIcon}>▼</Text>
            </Pressable>
          </View>
          {subjectMenuOpen ? (
            <View style={styles.subjectList}>
              {subjectOptions.length ? (
                subjectOptions.map((subject) => (
                  <Pressable
                    key={subject}
                    style={styles.subjectOption}
                    onPress={() => {
                      setForm((prev) => ({ ...prev, subject, category: subject }));
                      setSubjectMenuOpen(false);
                    }}
                  >
                    <Text style={styles.subjectOptionText}>{subject}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.metaValue}>No class subjects available.</Text>
              )}
            </View>
          ) : null}
          <View style={[styles.searchBar, { marginTop: 10 }]}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tags CSV (e.g. algebra,fractions)"
              value={form.tags}
              onChangeText={(value) => setForm((prev) => ({ ...prev, tags: value }))}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View style={[styles.searchBar, { marginTop: 10 }]}>
            <TextInput
              style={[styles.searchInput, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Write your question or blog"
              multiline
              value={form.content}
              onChangeText={(value) => setForm((prev) => ({ ...prev, content: value }))}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View style={styles.actionButtons}>
            <Pressable style={styles.answerButton} onPress={pickFileForPost}>
              <Text style={styles.answerIcon}>📎</Text>
              <Text style={styles.answerText}>Upload File</Text>
            </Pressable>
            <Pressable style={styles.answersButton} onPress={submitPost} disabled={saving}>
              <Text style={styles.answersIcon}>✅</Text>
              <Text style={styles.answersText}>{saving ? 'Posting...' : editingPostId ? 'Update' : 'Post'}</Text>
            </Pressable>
          </View>
          {editingPostId ? (
            <Pressable style={[styles.answerButton, { marginTop: 8 }]} onPress={cancelEdit}>
              <Text style={styles.answerIcon}>✖</Text>
              <Text style={styles.answerText}>Cancel Edit</Text>
            </Pressable>
          ) : null}
          {(form.attachments || []).map((item, index) => (
            <Text key={`${item.name}-${index}`} style={styles.metaValue}>
              Attached: {item.name}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search questions..."
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

      <View style={styles.questionsContainer}>
        <Text style={styles.sectionTitle}>
          {selectedCategory === 'all' ? 'All Questions' : `${selectedCategory} Questions`}
        </Text>
        {loading ? <Text style={styles.metaValue}>Loading...</Text> : null}
        {!loading && !filteredQuestions.length ? <Text style={styles.metaValue}>No posts found.</Text> : null}
        {filteredQuestions.map((question) => (
          <View key={question.id} style={styles.questionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.questionInfo}>
                <Text style={styles.questionIcon}>{question.type === 'blog' ? '📰' : '❓'}</Text>
                <View>
                  <Text style={styles.questionTitle}>{question.title}</Text>
                  <Text style={styles.questionSubject}>{question.subject || 'General'}</Text>
                </View>
              </View>
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(question.status)}20` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(question.status) }]}>
                    {String(question.status || 'pending').charAt(0).toUpperCase() + String(question.status || 'pending').slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.questionContent}>{question.content}</Text>

            <View style={styles.tagsContainer}>
              <Text style={styles.tagsTitle}>Tags:</Text>
              <View style={styles.tagsList}>
                {(Array.isArray(question.tags) ? question.tags : []).map((tag, index) => (
                  <View key={`${question.id}-${tag}-${index}`} style={styles.tagBadge}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>

            {(Array.isArray(question.attachments) ? question.attachments : []).length ? (
              <View style={styles.tagsContainer}>
                <Text style={styles.tagsTitle}>Files:</Text>
                {(question.attachments || []).map((file) => (
                  <Pressable key={file.id} style={styles.viewButton} onPress={() => downloadAttachment(file)}>
                    <Text style={styles.viewIcon}>⬇️</Text>
                    <Text style={styles.viewText}>{file.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.questionMeta}>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>👤</Text>
                  <Text style={styles.metaLabel}>Asked by</Text>
                  <Text style={styles.metaValue}>{question.author?.name || '-'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>📅</Text>
                  <Text style={styles.metaLabel}>Asked on</Text>
                  <Text style={styles.metaValue}>{String(question.createdAt || '').slice(0, 10)}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>💬</Text>
                  <Text style={styles.metaLabel}>Answers</Text>
                  <Text style={styles.metaValue}>{Array.isArray(question.replies) ? question.replies.length : 0}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>👁️</Text>
                  <Text style={styles.metaLabel}>Views</Text>
                  <Text style={styles.metaValue}>{Number(question.views || 0)}</Text>
                </View>
              </View>
            </View>

            {(Array.isArray(question.replies) ? question.replies : []).length ? (
              <View style={styles.answerPreview}>
                <Text style={styles.answerTitle}>Latest Reply:</Text>
                <Text style={styles.answerText} numberOfLines={3}>
                  {question.replies[question.replies.length - 1]?.content || 'File response attached'}
                </Text>
              </View>
            ) : null}

            <View style={styles.actionButtons}>
              <Pressable
                style={styles.viewButton}
                onPress={() => {
                  incrementViews(question.id);
                  setOpenDetails((prev) => ({ ...prev, [question.id]: !prev[question.id] }));
                }}
              >
                <Text style={styles.viewIcon}>👁️</Text>
                <Text style={styles.viewText}>View Details</Text>
              </Pressable>
              <Pressable
                style={question.status === 'answered' ? styles.answersButton : styles.answerButton}
                onPress={() =>
                  setReplyForm((prev) => ({
                    ...prev,
                    [question.id]: { ...(prev[question.id] || {}), open: true },
                  }))
                }
              >
                <Text style={question.status === 'answered' ? styles.answersIcon : styles.answerIcon}>💬</Text>
                <Text style={question.status === 'answered' ? styles.answersText : styles.answerText}>
                  {question.status === 'answered' ? 'View Answers' : 'Answer'}
                </Text>
              </Pressable>
            </View>
            {String(question.author?.id || '') === currentUserId ? (
              <View style={[styles.actionButtons, { marginTop: 8 }]}>
                <Pressable style={styles.answersButton} onPress={() => startEditPost(question)}>
                  <Text style={styles.answersIcon}>✏️</Text>
                  <Text style={styles.answersText}>Edit Post</Text>
                </Pressable>
              </View>
            ) : null}

            {openDetails[question.id] ? (
              <View style={{ marginTop: 12 }}>
                <View style={styles.answerPreview}>
                  <Text style={styles.answerTitle}>Details</Text>
                  <Text style={styles.answerText}>Type: {question.type || 'question'}</Text>
                  <Text style={styles.answerText}>Subject: {question.subject || '-'}</Text>
                  <Text style={styles.answerText}>Status: {question.status || 'pending'}</Text>
                  <Text style={styles.answerText}>Last update: {String(question.updatedAt || question.createdAt || '').slice(0, 10)}</Text>
                </View>
              </View>
            ) : null}

            {replyForm[question.id]?.open ? (
              <View style={{ marginTop: 12 }}>
                {(question.replies || []).map((reply) => (
                  <View key={reply.id} style={styles.answerPreview}>
                    <Text style={styles.answerTitle}>
                      {reply.author?.name || 'User'} ({reply.author?.role || ''})
                    </Text>
                    <Text style={styles.answerText}>{reply.content || 'File response'}</Text>
                    {reply.attachment ? (
                      <Pressable style={[styles.viewButton, { marginTop: 8 }]} onPress={() => downloadAttachment(reply.attachment)}>
                        <Text style={styles.viewIcon}>⬇️</Text>
                        <Text style={styles.viewText}>{reply.attachment.name}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <View style={[styles.searchBar, { marginTop: 10 }]}>
                  <TextInput
                    style={[styles.searchInput, { minHeight: 60, textAlignVertical: 'top' }]}
                    placeholder="Write your reply"
                    value={replyForm[question.id]?.content || ''}
                    onChangeText={(value) =>
                      setReplyForm((prev) => ({
                        ...prev,
                        [question.id]: { ...(prev[question.id] || {}), content: value, open: true },
                      }))
                    }
                    multiline
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={[styles.actionButtons, { marginTop: 10 }]}>
                  <Pressable style={styles.answerButton} onPress={() => pickFileForReply(question.id)}>
                    <Text style={styles.answerIcon}>📎</Text>
                    <Text style={styles.answerText}>Upload File</Text>
                  </Pressable>
                  <Pressable style={styles.answersButton} onPress={() => submitReply(question.id)} disabled={replyingId === question.id}>
                    <Text style={styles.answersIcon}>✅</Text>
                    <Text style={styles.answersText}>{replyingId === question.id ? 'Sending...' : 'Send Reply'}</Text>
                  </Pressable>
                </View>
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
    marginBottom: 20,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#84cc16',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#84cc16',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 15,
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
  askButtonContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#84cc16',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#84cc16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  askIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  askText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
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
  subjectPicker: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectList: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  subjectOption: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  subjectOptionText: {
    color: '#1e293b',
    fontWeight: '600',
    fontSize: 14,
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
    marginBottom: 20,
  },
  categoriesScroll: {
    paddingHorizontal: 24,
  },
  categoryButton: {
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
  categoryButtonActive: {
    backgroundColor: '#84cc16',
    borderColor: '#84cc16',
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
  questionsContainer: {
    paddingHorizontal: 6,
    marginBottom: 32,
    elevation: 20,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  questionCard: {
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
  questionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  questionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    lineHeight: 24,
  },
  questionSubject: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 19,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  questionContent: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  tagsContainer: {
    marginBottom: 16,
  },
  tagsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  questionMeta: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
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
  answerPreview: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  answerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  answerText: {
    fontSize: 14,
    color: '#065f46',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  viewIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  viewText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  answersButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  answersIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  answersText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  answerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  answerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  bottomSpacing: {
    height: 24,
  },
});
