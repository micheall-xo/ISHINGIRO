import { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../services/api';
import { AuthContext } from './_layout';

function toTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isMine(message, selfId) {
  const sender = message?.sender;
  if (sender && typeof sender === 'object') return String(sender._id) === String(selfId);
  return String(sender) === String(selfId);
}

function messageAvatar(message, mine, selfPicture, otherPicture) {
  if (mine) {
    return selfPicture || '';
  }
  const sender = message?.sender;
  if (sender && typeof sender === 'object' && sender.profilePicture) {
    return sender.profilePicture;
  }
  return otherPicture || '';
}

function initials(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const selfId = user?.id || user?._id || '';
  const isSmallScreen = width < 430 || height < 820;
  const contactsPreviewLimit = isSmallScreen ? 6 : 14;
  const conversationsPreviewLimit = isSmallScreen ? 6 : 20;

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [calling, setCalling] = useState(false);
  const [showAllContacts, setShowAllContacts] = useState(false);
  const [showAllConversations, setShowAllConversations] = useState(false);

  const filteredContacts = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => String(c.fullName || '').toLowerCase().includes(q));
  }, [contacts, search]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => String(c.userId) === String(selectedUser?.id)) || null,
    [conversations, selectedUser]
  );

  const visibleContacts = useMemo(() => {
    if (showAllContacts) return filteredContacts;
    return filteredContacts.slice(0, contactsPreviewLimit);
  }, [filteredContacts, showAllContacts, contactsPreviewLimit]);

  const visibleConversations = useMemo(() => {
    if (showAllConversations) return conversations;
    return conversations.slice(0, conversationsPreviewLimit);
  }, [conversations, showAllConversations, conversationsPreviewLimit]);

  async function loadContacts() {
    const data = await apiRequest('/messages/contacts');
    setContacts(Array.isArray(data) ? data : []);
  }

  async function loadConversations() {
    const data = await apiRequest('/messages/conversations');
    setConversations(Array.isArray(data) ? data : []);
  }

  async function loadThread(userId) {
    if (!userId) return;
    const data = await apiRequest(`/messages/with/${userId}`);
    setThread(Array.isArray(data) ? data : []);
  }

  async function bootstrap() {
    try {
      setLoading(true);
      await Promise.all([loadContacts(), loadConversations()]);
    } catch (error) {
      Alert.alert('Messages', error.message || 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    const conversationsTimer = setInterval(() => {
      loadConversations().catch(() => {});
    }, 1200);

    return () => clearInterval(conversationsTimer);
  }, []);

  useEffect(() => {
    if (!selectedUser?.id) return undefined;
    loadThread(selectedUser.id);

    const threadTimer = setInterval(() => loadThread(selectedUser.id).catch(() => {}), 1000);

    return () => {
      clearInterval(threadTimer);
    };
  }, [selectedUser?.id]);

  async function onSend() {
    const body = String(draft || '').trim();
    if (!selectedUser?.id || !body) return;
    const nowIso = new Date().toISOString();
    const localId = `tmp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setDraft('');
    setThread((prev) => [
      ...prev,
      {
        _id: localId,
        sender: selfId,
        receiver: selectedUser.id,
        body,
        createdAt: nowIso,
        __localPending: true,
      },
    ]);
    setConversations((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const index = next.findIndex((row) => String(row.userId) === String(selectedUser.id));
      if (index >= 0) {
        next[index] = {
          ...next[index],
          lastMessage: body,
          updatedAt: nowIso,
        };
        const [entry] = next.splice(index, 1);
        next.unshift(entry);
        return next;
      }
      return [
        {
          userId: selectedUser.id,
          fullName: selectedUser.fullName,
          role: selectedUser.role || 'contact',
          profilePicture: selectedUser.profilePicture || '',
          lastMessage: body,
          updatedAt: nowIso,
          unreadCount: 0,
        },
        ...next,
      ];
    });

    try {
      setSending(true);
      const created = await apiRequest('/messages/send', {
        method: 'POST',
        body: { receiverId: selectedUser.id, body },
      });
      setThread((prev) =>
        prev.map((item) =>
          String(item?._id) === localId
            ? { ...(created || item), sender: created?.sender || selfId, receiver: created?.receiver || selectedUser.id }
            : item
        )
      );
      await loadConversations();
    } catch (error) {
      setThread((prev) => prev.filter((item) => String(item?._id) !== localId));
      setDraft(body);
      Alert.alert('Send failed', error.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  function normalizePhone(raw) {
    return String(raw || '').replace(/[^\d+]/g, '');
  }

  async function onAudioCall() {
    if (!selectedUser?.id || calling) return;
    try {
      setCalling(true);
      const profile = await apiRequest(`/messages/profile/${selectedUser.id}`);
      const phone = normalizePhone(profile?.phoneNumber);
      if (!phone) {
        Alert.alert('Audio Call', 'This user has no phone number available.');
        return;
      }
      const telUrl = `tel:${phone}`;
      const can = await Linking.canOpenURL(telUrl);
      if (!can) {
        Alert.alert('Audio Call', 'Calling is not supported on this device.');
        return;
      }
      await Linking.openURL(telUrl);
    } catch (error) {
      Alert.alert('Audio Call', error.message || 'Failed to start audio call.');
    } finally {
      setCalling(false);
    }
  }

  function buildVideoRoomUrl() {
    const a = String(selfId || '').trim();
    const b = String(selectedUser?.id || '').trim();
    const sorted = [a, b].sort();
    const room = `schoolapp-${sorted[0]}-${sorted[1]}`.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
    return `https://meet.jit.si/${room}`;
  }

  async function onVideoCall() {
    if (!selectedUser?.id || calling) return;
    try {
      setCalling(true);
      const url = buildVideoRoomUrl();
      await apiRequest('/messages/send', {
        method: 'POST',
        body: {
          receiverId: selectedUser.id,
          body: `Video call invite: ${url}`,
        },
      });
      await loadConversations();
      const can = await Linking.canOpenURL(url);
      if (!can) {
        Alert.alert('Video Call', 'Could not open video meeting link on this device.');
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Video Call', error.message || 'Failed to start video call.');
    } finally {
      setCalling(false);
    }
  }

  function openProfile(userId) {
    if (!userId) return;
    router.push({ pathname: '/user/[id]', params: { id: String(userId) } });
  }

  if (selectedUser) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={[styles.chatHeader, { paddingTop: Math.max(42, insets.top + 10) }]}>
          <Pressable style={styles.backBtn} onPress={() => setSelectedUser(null)}>
            <Text style={styles.backBtnText}>{'<'}</Text>
          </Pressable>
          <Pressable style={styles.chatHeaderProfile} onPress={() => openProfile(selectedUser.id)}>
            {selectedUser.profilePicture ? (
              <Image source={{ uri: selectedUser.profilePicture }} style={styles.headerAvatarImage} />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Text style={styles.headerAvatarInitial}>{initials(selectedUser.fullName)}</Text>
              </View>
            )}
            <View style={styles.chatHeaderText}>
              <Text style={styles.chatTitle}>{selectedUser.fullName}</Text>
              <Text style={styles.chatMeta}>
                {selectedUser.role?.toUpperCase() || 'CONTACT'}
                {selectedConversation?.unreadCount ? ` - ${selectedConversation.unreadCount} unread` : ''}
              </Text>
            </View>
          </Pressable>
          <View style={styles.callActions}>
            <Pressable style={styles.callBtn} onPress={onAudioCall} disabled={calling}>
              <Text style={styles.callBtnText}>{calling ? '...' : 'Audio'}</Text>
            </Pressable>
            <Pressable style={styles.callBtn} onPress={onVideoCall} disabled={calling}>
              <Text style={styles.callBtnText}>{calling ? '...' : 'Video'}</Text>
            </Pressable>
          </View>
        </View>

        <FlatList
          data={thread}
          keyExtractor={(item, index) => String(item?._id || index)}
          contentContainerStyle={styles.threadWrap}
          renderItem={({ item }) => {
            const mine = isMine(item, selfId);
            const avatarUri = messageAvatar(
              item,
              mine,
              user?.profilePicture || '',
              selectedUser?.profilePicture || ''
            );
            const senderName =
              item?.sender && typeof item.sender === 'object'
                ? `${item.sender.firstName || ''} ${item.sender.lastName || ''}`.trim()
                : mine
                ? user?.fullName || user?.firstName || 'Me'
                : selectedUser?.fullName || 'User';
            return (
              <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                {!mine ? (
                  avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.bubbleAvatarImage} />
                  ) : (
                    <View style={styles.bubbleAvatarFallback}>
                      <Text style={styles.bubbleAvatarInitial}>{initials(senderName)}</Text>
                    </View>
                  )
                ) : null}
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={mine ? styles.bubbleMineText : styles.bubbleTheirText}>{item.body}</Text>
                  <Text style={mine ? styles.bubbleMineMeta : styles.bubbleTheirMeta}>{toTime(item.createdAt)}</Text>
                </View>
                {mine ? (
                  avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.bubbleAvatarImage} />
                  ) : (
                    <View style={styles.bubbleAvatarFallback}>
                      <Text style={styles.bubbleAvatarInitial}>{initials(senderName)}</Text>
                    </View>
                  )
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyThread}>
              <Text style={styles.emptyThreadText}>No messages yet. Start the conversation.</Text>
            </View>
          }
        />

        <View style={[styles.composer, { paddingBottom: Math.max(10, insets.bottom + 6) }]}>
          <TextInput
            style={styles.composerInput}
            placeholder="Type a message..."
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable style={[styles.sendBtn, sending && styles.sendBtnDisabled]} onPress={onSend} disabled={sending}>
            <Text style={styles.sendBtnText}>{sending ? '...' : 'Send'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(14, insets.top + 8), paddingBottom: Math.max(14, insets.bottom + 10) }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1d4ed8" />

      <View style={styles.hero}>
        <Text style={[styles.heroTitle, isSmallScreen && styles.heroTitleSmall]}>Messages</Text>
        <Text style={styles.heroSubtitle}>Secure gateway communication stored in the school database</Text>
        <Pressable style={styles.heroRefresh} onPress={bootstrap}>
          <Text style={styles.heroRefreshText}>Refresh</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#1d4ed8" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : (
        <>
          <View style={styles.panel}>
            <View style={styles.panelHeaderRow}>
              <Text style={styles.panelTitle}>Contacts</Text>
              {filteredContacts.length > contactsPreviewLimit ? (
                <Pressable style={styles.toggleBtn} onPress={() => setShowAllContacts((s) => !s)}>
                  <Text style={styles.toggleBtnText}>{showAllContacts ? 'Show less' : 'Show all'}</Text>
                </Pressable>
              ) : null}
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              value={search}
              onChangeText={setSearch}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contactRow}>
              {visibleContacts.map((contact) => (
                <View key={String(contact.id)} style={styles.contactChip}>
                  <Pressable style={styles.contactIdentity} onPress={() => openProfile(contact.id)}>
                    {contact.profilePicture ? (
                      <Image source={{ uri: contact.profilePicture }} style={styles.contactAvatarImage} />
                    ) : (
                      <View style={styles.contactAvatarFallback}>
                        <Text style={styles.contactAvatarInitial}>{initials(contact.fullName)}</Text>
                      </View>
                    )}
                    <Text style={styles.contactChipName} numberOfLines={1}>{contact.fullName}</Text>
                    <Text style={styles.contactChipRole}>{contact.role}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.contactChatBtn}
                    onPress={() =>
                      setSelectedUser({
                        id: contact.id,
                        fullName: contact.fullName,
                        role: contact.role,
                        profilePicture: contact.profilePicture || '',
                      })
                    }
                  >
                    <Text style={styles.contactChatBtnText}>Chat</Text>
                  </Pressable>
                </View>
              ))}
              {!visibleContacts.length ? <Text style={styles.emptyContacts}>No contacts found.</Text> : null}
            </ScrollView>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeaderRow}>
              <Text style={styles.panelTitle}>Conversations</Text>
              {conversations.length > conversationsPreviewLimit ? (
                <Pressable style={styles.toggleBtn} onPress={() => setShowAllConversations((s) => !s)}>
                  <Text style={styles.toggleBtnText}>{showAllConversations ? 'Show less' : 'Show all'}</Text>
                </Pressable>
              ) : null}
            </View>
            {visibleConversations.map((conv) => (
              <Pressable
                key={String(conv.userId)}
                style={styles.convCard}
                onPress={() =>
                  setSelectedUser({
                    id: conv.userId,
                    fullName: conv.fullName,
                    role: conv.role,
                    profilePicture: conv.profilePicture || '',
                  })
                }
              >
                <View style={styles.convTop}>
                  <Pressable style={styles.convIdentity} onPress={() => openProfile(conv.userId)}>
                    {conv.profilePicture ? (
                      <Image source={{ uri: conv.profilePicture }} style={styles.convAvatarImage} />
                    ) : (
                      <View style={styles.convAvatarFallback}>
                        <Text style={styles.convAvatarInitial}>{initials(conv.fullName)}</Text>
                      </View>
                    )}
                    <Text style={styles.convName} numberOfLines={1}>{conv.fullName}</Text>
                  </Pressable>
                  <Text style={styles.convTime}>{toTime(conv.updatedAt)}</Text>
                </View>
                <Text style={styles.convBody} numberOfLines={1}>
                  {conv.lastMessage}
                </Text>
                <View style={styles.convBottom}>
                  <Text style={styles.convRole}>{conv.role}</Text>
                  {conv.unreadCount > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{conv.unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ))}
            {!visibleConversations.length ? <Text style={styles.emptyConversations}>No conversations yet.</Text> : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f6ff',
  },
  content: {
    padding: 14,
    gap: 12,
  },
  hero: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#1d4ed8',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  heroTitleSmall: {
    fontSize: 24,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  heroRefresh: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroRefreshText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  loadingBox: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  loadingText: {
    color: '#334155',
    fontWeight: '600',
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  panelTitle: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  contactRow: {
    gap: 8,
    paddingRight: 8,
  },
  contactChip: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 130,
    maxWidth: 210,
    alignItems: 'center',
  },
  contactIdentity: {
    alignItems: 'center',
  },
  contactAvatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 6,
  },
  contactAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 6,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarInitial: {
    color: '#1e293b',
    fontWeight: '800',
    fontSize: 12,
  },
  contactChipName: {
    color: '#1e293b',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  contactChipRole: {
    color: '#475569',
    marginTop: 2,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  contactChatBtn: {
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  contactChatBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  emptyContacts: {
    color: '#64748b',
    fontWeight: '600',
    paddingVertical: 8,
  },
  convCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#f8faff',
  },
  convTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  convIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  convAvatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  convAvatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convAvatarInitial: {
    color: '#1e293b',
    fontWeight: '800',
    fontSize: 11,
  },
  convName: {
    color: '#0f172a',
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  convTime: {
    color: '#64748b',
    fontSize: 11,
  },
  convBody: {
    color: '#334155',
    marginTop: 4,
  },
  convBottom: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convRole: {
    color: '#475569',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1d4ed8',
  },
  unreadBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
  },
  emptyConversations: {
    color: '#64748b',
    fontWeight: '600',
    paddingVertical: 8,
  },
  chatHeader: {
    backgroundColor: '#0f172a',
    paddingBottom: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  chatHeaderText: {
    flex: 1,
  },
  chatHeaderProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  callActions: {
    flexDirection: 'row',
    gap: 6,
  },
  callBtn: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  callBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  headerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  headerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitial: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  chatTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  chatMeta: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontSize: 12,
  },
  threadWrap: {
    padding: 10,
    gap: 6,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bubbleAvatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 2,
  },
  bubbleAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#cbd5e1',
  },
  bubbleAvatarInitial: {
    color: '#334155',
    fontSize: 9,
    fontWeight: '800',
  },
  bubbleMine: {
    backgroundColor: '#2563eb',
  },
  bubbleTheirs: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bubbleMineText: {
    color: '#fff',
  },
  bubbleTheirText: {
    color: '#0f172a',
  },
  bubbleMineMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    marginTop: 3,
    textAlign: 'right',
  },
  bubbleTheirMeta: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 3,
    textAlign: 'right',
  },
  emptyThread: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyThreadText: {
    color: '#64748b',
    fontWeight: '600',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
  toggleBtn: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toggleBtnText: {
    color: '#3730a3',
    fontWeight: '700',
    fontSize: 12,
  },
});
