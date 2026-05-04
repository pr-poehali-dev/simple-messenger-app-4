import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/extensions/auth-email/useAuth';
import AuthPage from './Auth';
import Icon from '@/components/ui/icon';

const AUTH_URL = "https://functions.poehali.dev/9d23499c-1556-498e-801e-74e66d3ae884";
const MSG_URL = "https://functions.poehali.dev/3b8d2fac-14a7-464d-9a46-07d9f85ab395";

type Tab = 'calls' | 'chats' | 'find';

interface Conversation {
  id: number;
  partner_id: number;
  partner_name: string;
  partner_email: string;
  partner_uid: string;
  last_message: string;
  last_type: string;
  last_sender_id: number;
  last_message_at: string;
  unread: number;
}

interface Message {
  id: number;
  content: string;
  type: string;
  sender_id: number;
  sender_name: string;
  created_at: string;
  mine: boolean;
  is_read: boolean;
}

interface CallRecord {
  id: number;
  type: string;
  status: string;
  direction: string;
  partner_name: string;
  partner_id: number;
  started_at: string;
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(dt: string) {
  if (!dt) return '';
  const d = new Date(dt);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 86400) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172800) return 'вчера';
  return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
}

const AVATAR_COLORS = [
  '#1d8cf8', '#00d4aa', '#ff6b6b', '#ffa94d', '#9775fa', '#f06595', '#20c997'
];
function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export default function Index() {
  const auth = useAuth({
    apiUrls: {
      login: `${AUTH_URL}?action=login`,
      register: `${AUTH_URL}?action=register`,
      verifyEmail: `${AUTH_URL}?action=verify-email`,
      refresh: `${AUTH_URL}?action=refresh`,
      logout: `${AUTH_URL}?action=logout`,
      resetPassword: `${AUTH_URL}?action=reset-password`,
    },
  });

  const [tab, setTab] = useState<Tab>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [findUid, setFindUid] = useState('');
  const [foundUser, setFoundUser] = useState<{ id: number; name: string; email: string; user_uid: string } | null>(null);
  const [findError, setFindError] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const token = auth.accessToken;

  const authFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    return fetch(url, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) }
    });
  }, [token]);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    const r = await authFetch(`${MSG_URL}?action=conversations`);
    const data = await r.json();
    if (data.conversations) setConversations(data.conversations);
  }, [token, authFetch]);

  const loadMessages = useCallback(async (convId: number) => {
    if (!token) return;
    const r = await authFetch(`${MSG_URL}?action=messages&conversation_id=${convId}`);
    const data = await r.json();
    if (data.messages) setMessages(data.messages);
  }, [token, authFetch]);

  const loadCalls = useCallback(async () => {
    if (!token) return;
    const r = await authFetch(`${MSG_URL}?action=calls`);
    const data = await r.json();
    if (data.calls) setCalls(data.calls);
  }, [token, authFetch]);

  useEffect(() => {
    if (!token) return;
    loadConversations();
  }, [token, loadConversations]);

  useEffect(() => {
    if (tab === 'calls') loadCalls();
  }, [tab, loadCalls]);

  useEffect(() => {
    if (!activeConv) return;
    loadMessages(activeConv.id);
    pollRef.current = setInterval(() => loadMessages(activeConv.id), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeConv, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || !activeConv) return;
    const text = inputText.trim();
    setInputText('');
    await authFetch(`${MSG_URL}?action=send`, {
      method: 'POST',
      body: JSON.stringify({ conversation_id: activeConv.id, content: text, type: 'text' })
    });
    await loadMessages(activeConv.id);
    await loadConversations();
  };

  const findUser = async () => {
    setFoundUser(null);
    setFindError('');
    if (!findUid.trim()) return;
    const r = await authFetch(`${MSG_URL}?action=find-user&uid=${findUid.trim()}`);
    const data = await r.json();
    if (data.user) setFoundUser(data.user);
    else setFindError(data.error || 'Не найден');
  };

  const startChat = async (partnerId: number) => {
    const r = await authFetch(`${MSG_URL}?action=start-conversation`, {
      method: 'POST',
      body: JSON.stringify({ partner_id: partnerId })
    });
    const data = await r.json();
    if (data.conversation_id) {
      await loadConversations();
      setTab('chats');
      setFoundUser(null);
      setFindUid('');
    }
  };

  const logCall = async (partnerId: number, type: 'voice' | 'video') => {
    await authFetch(`${MSG_URL}?action=log-call`, {
      method: 'POST',
      body: JSON.stringify({ callee_id: partnerId, type, status: 'ended' })
    });
    alert(type === 'voice' ? 'Голосовой звонок (WebRTC в разработке)' : 'Видеозвонок (WebRTC в разработке)');
  };

  const openConv = (conv: Conversation) => {
    setActiveConv(conv);
    setIsChatOpen(true);
    loadConversations();
  };

  const user = auth.user as { id: number; email: string; name: string | null; user_uid?: string } | null;

  if (auth.isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1117' }}>
        <div style={{ color: '#8896a3', fontSize: 14 }}>Загрузка...</div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <AuthPage auth={auth} />;
  }

  const myUid = user?.user_uid || '—';

  // === CHAT SCREEN ===
  if (isChatOpen && activeConv) {
    const partner = activeConv;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0e1117', maxWidth: 480, margin: '0 auto', position: 'relative' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#17212b', borderBottom: '1px solid #1f2936' }}>
          <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: '#5eadd4', cursor: 'pointer', padding: 4 }}>
            <Icon name="ArrowLeft" size={22} />
          </button>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarColor(partner.partner_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff', flexShrink: 0 }}>
            {getInitials(partner.partner_name)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>{partner.partner_name}</div>
            <div style={{ color: '#8896a3', fontSize: 12 }}>ID: {partner.partner_uid}</div>
          </div>
          <button onClick={() => logCall(partner.partner_id, 'voice')} style={{ background: 'none', border: 'none', color: '#5eadd4', cursor: 'pointer', padding: 6 }}>
            <Icon name="Phone" size={20} />
          </button>
          <button onClick={() => logCall(partner.partner_id, 'video')} style={{ background: 'none', border: 'none', color: '#5eadd4', cursor: 'pointer', padding: 6 }}>
            <Icon name="Video" size={20} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {messages.length === 0 && (
            <div style={{ color: '#8896a3', textAlign: 'center', marginTop: 40, fontSize: 14 }}>Напишите первое сообщение</div>
          )}
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.mine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '8px 12px', borderRadius: msg.mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.mine ? '#2b5278' : '#17212b',
                color: '#fff', fontSize: 14, lineHeight: 1.4
              }}>
                <div>{msg.content}</div>
                <div style={{ fontSize: 11, color: '#8896a3', textAlign: 'right', marginTop: 2 }}>
                  {formatTime(msg.created_at)}
                  {msg.mine && <span style={{ marginLeft: 4 }}>{msg.is_read ? '✓✓' : '✓'}</span>}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#17212b', borderTop: '1px solid #1f2936' }}>
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Сообщение..."
            style={{ flex: 1, background: '#242f3d', border: 'none', borderRadius: 22, padding: '10px 16px', color: '#fff', fontSize: 14, outline: 'none' }}
          />
          <button onClick={sendMessage} style={{ width: 42, height: 42, borderRadius: '50%', background: '#2b5278', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Icon name="Send" size={18} className="text-white" />
          </button>
        </div>
      </div>
    );
  }

  // === MAIN SCREEN ===
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0e1117', maxWidth: 480, margin: '0 auto' }}>

      {/* === CHATS TAB === */}
      {tab === 'chats' && (
        <>
          <div style={{ padding: '14px 16px 10px', background: '#17212b', borderBottom: '1px solid #1f2936', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>Чаты</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#8896a3' }}>ID: {myUid}</span>
              <button onClick={() => auth.logout()} style={{ background: 'none', border: 'none', color: '#8896a3', cursor: 'pointer', padding: 4 }} title="Выйти">
                <Icon name="LogOut" size={18} />
              </button>
            </div>
          </div>

          <div style={{ padding: '8px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#242f3d', borderRadius: 10, padding: '8px 12px', gap: 8 }}>
              <Icon name="Search" size={16} style={{ color: '#8896a3' }} />
              <input placeholder="Поиск" style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 14, flex: 1 }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 && (
              <div style={{ textAlign: 'center', color: '#8896a3', padding: 40, fontSize: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                Нет чатов. Найдите человека по ID во вкладке "Поиск"
              </div>
            )}
            {conversations.map(conv => (
              <button key={conv.id} onClick={() => openConv(conv)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #1f2936', textAlign: 'left' }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: avatarColor(conv.partner_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#fff', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }}>
                  {getInitials(conv.partner_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.partner_name}</span>
                    <span style={{ color: '#8896a3', fontSize: 12, flexShrink: 0, marginLeft: 8 }}>{formatTime(conv.last_message_at)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                    <span style={{ color: '#8896a3', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>
                      {conv.last_type === 'voice' ? '🎤 Аудио' : conv.last_type === 'video' ? '📹 Видео' : conv.last_message || ''}
                    </span>
                    {conv.unread > 0 && (
                      <span style={{ background: '#2b5278', color: '#5eadd4', fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '1px 7px', flexShrink: 0 }}>{conv.unread}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* === CALLS TAB === */}
      {tab === 'calls' && (
        <>
          <div style={{ padding: '14px 16px 10px', background: '#17212b', borderBottom: '1px solid #1f2936' }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>Звонки</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {calls.length === 0 && (
              <div style={{ textAlign: 'center', color: '#8896a3', padding: 40, fontSize: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📞</div>
                История звонков пуста
              </div>
            )}
            {calls.map(call => (
              <div key={call.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #1f2936' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: avatarColor(call.partner_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0 }}>
                  {getInitials(call.partner_name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{call.partner_name}</div>
                  <div style={{ color: call.direction === 'incoming' ? '#4dbb5e' : '#8896a3', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {call.direction === 'incoming' ? '↙' : '↗'} {call.type === 'video' ? 'Видеозвонок' : 'Голосовой'} · {formatTime(call.started_at)}
                  </div>
                </div>
                <Icon name={call.type === 'video' ? 'Video' : 'Phone'} size={18} style={{ color: '#5eadd4' }} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* === FIND TAB === */}
      {tab === 'find' && (
        <>
          <div style={{ padding: '14px 16px 10px', background: '#17212b', borderBottom: '1px solid #1f2936' }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>Найти по ID</div>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ color: '#8896a3', fontSize: 13, marginBottom: 12 }}>
              Ваш ID: <span style={{ color: '#5eadd4', fontWeight: 700 }}>{myUid}</span> — поделитесь с друзьями
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={findUid}
                onChange={e => setFindUid(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && findUser()}
                placeholder="Введите ID пользователя"
                style={{ flex: 1, background: '#242f3d', border: '1px solid #2f3f51', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
              />
              <button onClick={findUser} style={{ background: '#2b5278', border: 'none', borderRadius: 10, padding: '10px 16px', color: '#5eadd4', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                Найти
              </button>
            </div>
            {findError && <div style={{ color: '#e05c5c', marginTop: 10, fontSize: 13 }}>{findError}</div>}
            {foundUser && (
              <div style={{ marginTop: 16, background: '#17212b', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: avatarColor(foundUser.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#fff' }}>
                  {getInitials(foundUser.name || foundUser.email)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{foundUser.name || foundUser.email}</div>
                  <div style={{ color: '#8896a3', fontSize: 12 }}>ID: {foundUser.user_uid}</div>
                </div>
                <button onClick={() => startChat(foundUser.id)} style={{ background: '#2b5278', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#5eadd4', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  Написать
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* === BOTTOM TAB BAR === */}
      <div style={{ display: 'flex', background: '#17212b', borderTop: '1px solid #1f2936', flexShrink: 0 }}>
        {([
          { id: 'calls', icon: 'Phone', label: 'Звонки' },
          { id: 'chats', icon: 'MessageCircle', label: 'Чаты' },
          { id: 'find', icon: 'Search', label: 'Поиск' },
        ] as { id: Tab; icon: string; label: string }[]).map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '10px 0 8px', background: 'none', border: 'none', cursor: 'pointer',
            color: tab === item.id ? '#5eadd4' : '#8896a3'
          }}>
            <Icon name={item.icon} size={22} />
            <span style={{ fontSize: 11, fontWeight: tab === item.id ? 600 : 400 }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}