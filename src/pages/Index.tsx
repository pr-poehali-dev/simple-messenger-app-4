import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/extensions/auth-email/useAuth';
import AuthPage from './Auth';
import Icon from '@/components/ui/icon';

const AUTH_URL = "https://functions.poehali.dev/9d23499c-1556-498e-801e-74e66d3ae884";
const MSG_URL = "https://functions.poehali.dev/3b8d2fac-14a7-464d-9a46-07d9f85ab395";

type Tab = 'chats' | 'calls' | 'find';
type Screen = 'main' | 'chat' | 'call';

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
  if (!name) return '?';
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
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

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const COLORS = ['#1d8cf8', '#00d4aa', '#ff6b6b', '#ffa94d', '#9775fa', '#f06595', '#20c997'];
const avatarColor = (id: number) => COLORS[id % COLORS.length];

const S = {
  app: { display: 'flex', flexDirection: 'column' as const, height: '100vh', background: '#0e1117', maxWidth: 480, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#17212b', borderBottom: '1px solid #1f2936', flexShrink: 0 },
  headerTitle: { color: '#fff', fontWeight: 700, fontSize: 20 },
  scroll: { flex: 1, overflowY: 'auto' as const },
  tabBar: { display: 'flex', background: '#17212b', borderTop: '1px solid #1f2936', flexShrink: 0 },
  tabBtn: (active: boolean) => ({ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 3, padding: '10px 0 8px', background: 'none', border: 'none', cursor: 'pointer', color: active ? '#5eadd4' : '#8896a3' }),
  convRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #1a2433', textAlign: 'left' as const },
  avatar: (id: number, size = 50) => ({ width: size, height: size, borderRadius: '50%', background: avatarColor(id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size > 40 ? 18 : 14, color: '#fff', flexShrink: 0 }),
  iconBtn: { background: 'none', border: 'none', color: '#5eadd4', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, background: '#242f3d', border: 'none', borderRadius: 22, padding: '10px 16px', color: '#fff', fontSize: 14, outline: 'none' },
  sendBtn: { width: 42, height: 42, borderRadius: '50%', background: '#2b5278', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  micBtn: (recording: boolean) => ({ width: 42, height: 42, borderRadius: '50%', background: recording ? '#e05c5c' : '#2b5278', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }),
  bubble: (mine: boolean) => ({ maxWidth: '78%', padding: '8px 12px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: mine ? '#2b5278' : '#17212b', color: '#fff', fontSize: 14, lineHeight: 1.4 }),
  empty: { textAlign: 'center' as const, color: '#8896a3', padding: 40, fontSize: 14 },
};

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
  const [screen, setScreen] = useState<Screen>('main');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [findUid, setFindUid] = useState('');
  const [foundUser, setFoundUser] = useState<{ id: number; name: string; email: string; user_uid: string } | null>(null);
  const [findError, setFindError] = useState('');

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // WebRTC call
  const [callScreen, setCallScreen] = useState<{ partnerId: number; partnerName: string; type: 'voice' | 'video'; callId: string; outgoing: boolean } | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const sigPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSigIdRef = useRef(0);

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

  useEffect(() => { if (token) loadConversations(); }, [token, loadConversations]);
  useEffect(() => { if (tab === 'calls') loadCalls(); }, [tab, loadCalls]);

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
    loadMessages(activeConv.id);
    loadConversations();
  };

  // === VOICE RECORDING ===
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    recChunksRef.current = [];
    mr.ondataavailable = e => recChunksRef.current.push(e.data);
    mr.start();
    mediaRecRef.current = mr;
    setRecording(true);
    setRecSeconds(0);
    recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
  };

  const stopRecording = async () => {
    if (!mediaRecRef.current || !activeConv) return;
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    const duration = recSeconds;
    setRecording(false);

    await new Promise<void>(resolve => {
      mediaRecRef.current!.onstop = () => resolve();
      mediaRecRef.current!.stop();
      mediaRecRef.current!.stream.getTracks().forEach(t => t.stop());
    });

    const blob = new Blob(recChunksRef.current, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const b64 = (reader.result as string).split(',')[1];
      await authFetch(`${MSG_URL}?action=upload-voice`, {
        method: 'POST',
        body: JSON.stringify({ conversation_id: activeConv.id, audio: b64, duration })
      });
      loadMessages(activeConv.id);
      loadConversations();
    };
  };

  const cancelRecording = () => {
    if (!mediaRecRef.current) return;
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    mediaRecRef.current.stream.getTracks().forEach(t => t.stop());
    mediaRecRef.current = null;
    setRecording(false);
    setRecSeconds(0);
  };

  // === WEBRTC ===
  const sendSignal = useCallback(async (callId: string, toUserId: number, type: string, payload: object) => {
    await authFetch(`${MSG_URL}?action=signal-send`, {
      method: 'POST',
      body: JSON.stringify({ call_id: callId, to_user_id: toUserId, type, payload })
    });
  }, [authFetch]);

  const createPC = useCallback((callId: string, partnerId: number) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pc.onicecandidate = e => {
      if (e.candidate) sendSignal(callId, partnerId, 'ice', { candidate: e.candidate });
    };
    pc.ontrack = e => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };
    pcRef.current = pc;
    return pc;
  }, [sendSignal]);

  const startCall = async (partnerId: number, partnerName: string, type: 'voice' | 'video') => {
    const callId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    lastSigIdRef.current = 0;
    const pc = createPC(callId, partnerId);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    localStreamRef.current = stream;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    if (type === 'video' && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal(callId, partnerId, 'offer', { sdp: offer, callType: type });
    await authFetch(`${MSG_URL}?action=log-call`, {
      method: 'POST',
      body: JSON.stringify({ callee_id: partnerId, type, status: 'outgoing' })
    });
    setCallScreen({ partnerId, partnerName, type, callId, outgoing: true });
    setScreen('call');

    // Poll for answer/ice
    sigPollRef.current = setInterval(async () => {
      const r = await authFetch(`${MSG_URL}?action=signal-poll&call_id=${callId}&after_id=${lastSigIdRef.current}`);
      const data = await r.json();
      for (const sig of (data.signals || [])) {
        lastSigIdRef.current = sig.id;
        if (sig.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.payload.sdp));
        } else if (sig.type === 'ice') {
          await pc.addIceCandidate(new RTCIceCandidate(sig.payload.candidate));
        } else if (sig.type === 'end') {
          endCall();
        }
      }
    }, 1000);
  };

  const answerCall = async (sig: { callId: string; fromId: number; fromName: string; type: 'voice' | 'video'; offer: RTCSessionDescriptionInit }) => {
    lastSigIdRef.current = 0;
    const pc = createPC(sig.callId, sig.fromId);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: sig.type === 'video' });
    localStreamRef.current = stream;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    await pc.setRemoteDescription(new RTCSessionDescription(sig.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await sendSignal(sig.callId, sig.fromId, 'answer', { sdp: answer });
    setCallScreen({ partnerId: sig.fromId, partnerName: sig.fromName, type: sig.type, callId: sig.callId, outgoing: false });
    setScreen('call');
  };

  const endCall = useCallback(() => {
    if (sigPollRef.current) clearInterval(sigPollRef.current);
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (callScreen) sendSignal(callScreen.callId, callScreen.partnerId, 'end', {});
    setCallScreen(null);
    setScreen('main');
  }, [callScreen, sendSignal]);

  // Poll for incoming calls
  const user = auth.user as { id: number; email: string; name: string | null; user_uid?: string } | null;
  const incomingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const incomingLastSigRef = useRef(0);
  const incomingCallRef = useRef<{ callId: string; fromId: number; fromName: string; type: 'voice' | 'video'; offer: RTCSessionDescriptionInit } | null>(null);
  const [incomingCall, setIncomingCall] = useState<typeof incomingCallRef.current>(null);

  useEffect(() => {
    if (!token || !user?.id) return;
    const myCallId = `incoming-${user.id}`;
    incomingPollRef.current = setInterval(async () => {
      if (screen === 'call') return;
      const r = await authFetch(`${MSG_URL}?action=signal-poll&call_id=incoming-${user.id}&after_id=${incomingLastSigRef.current}`);
      const data = await r.json();
      for (const sig of (data.signals || [])) {
        incomingLastSigRef.current = sig.id;
        if (sig.type === 'offer') {
          setIncomingCall({ callId: sig.payload.callId, fromId: sig.from_user_id, fromName: sig.payload.fromName, type: sig.payload.callType, offer: sig.payload.sdp });
        }
      }
    }, 2000);
    return () => { if (incomingPollRef.current) clearInterval(incomingPollRef.current); };
  }, [token, user?.id, screen, authFetch]);

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

  const openConv = (conv: Conversation) => {
    setActiveConv(conv);
    setScreen('chat');
    loadConversations();
  };

  const myUid = user?.user_uid || '—';

  if (auth.isLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1117' }}><div style={{ color: '#8896a3', fontSize: 14 }}>Загрузка...</div></div>;
  }
  if (!auth.isAuthenticated) return <AuthPage auth={auth} />;

  // === CALL SCREEN ===
  if (screen === 'call' && callScreen) {
    return (
      <div style={{ ...S.app, alignItems: 'center', justifyContent: 'center', background: '#0a0f18' }}>
        {callScreen.type === 'video' && (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
            <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: 120, right: 16, width: 100, height: 140, borderRadius: 12, objectFit: 'cover', zIndex: 10 }} />
          </>
        )}
        <audio ref={remoteAudioRef} autoPlay />
        <div style={{ position: 'relative', zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ ...S.avatar(callScreen.partnerId, 80) }}>{getInitials(callScreen.partnerName)}</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 22 }}>{callScreen.partnerName}</div>
          <div style={{ color: '#8896a3', fontSize: 14 }}>{callScreen.outgoing ? 'Исходящий...' : 'Входящий...'}</div>
        </div>
        <div style={{ position: 'relative', zIndex: 20, marginTop: 60, display: 'flex', gap: 32 }}>
          <button onClick={endCall} style={{ width: 64, height: 64, borderRadius: '50%', background: '#e05c5c', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="PhoneOff" size={28} className="text-white" />
          </button>
        </div>
      </div>
    );
  }

  // === CHAT SCREEN ===
  if (screen === 'chat' && activeConv) {
    const p = activeConv;
    return (
      <div style={S.app}>
        {/* Header */}
        <div style={S.header}>
          <button onClick={() => { setScreen('main'); if (pollRef.current) clearInterval(pollRef.current); }} style={S.iconBtn}>
            <Icon name="ArrowLeft" size={22} />
          </button>
          <div style={{ ...S.avatar(p.partner_id, 36) }}>{getInitials(p.partner_name)}</div>
          <div style={{ flex: 1, marginLeft: 8 }}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{p.partner_name}</div>
            <div style={{ color: '#8896a3', fontSize: 11 }}>ID: {p.partner_uid}</div>
          </div>
          <button onClick={() => startCall(p.partner_id, p.partner_name, 'voice')} style={S.iconBtn}><Icon name="Phone" size={20} /></button>
          <button onClick={() => startCall(p.partner_id, p.partner_name, 'video')} style={S.iconBtn}><Icon name="Video" size={20} /></button>
        </div>

        {/* Messages */}
        <div style={{ ...S.scroll, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {messages.length === 0 && <div style={S.empty}><div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>Напишите первое сообщение</div>}
          {messages.map(msg => {
            const isVoice = msg.type === 'voice';
            let voiceData: { url: string; duration: number } | null = null;
            if (isVoice) { try { voiceData = JSON.parse(msg.content); } catch { voiceData = null; } }
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.mine ? 'flex-end' : 'flex-start' }}>
                <div style={S.bubble(msg.mine)}>
                  {isVoice && voiceData ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
                      <Icon name="Mic" size={16} style={{ color: '#5eadd4', flexShrink: 0 }} />
                      <audio controls src={voiceData.url} style={{ height: 32, flex: 1, minWidth: 120 }} />
                      <span style={{ fontSize: 11, color: '#8896a3', whiteSpace: 'nowrap' }}>{formatDuration(voiceData.duration)}</span>
                    </div>
                  ) : (
                    <div>{msg.content}</div>
                  )}
                  <div style={{ fontSize: 11, color: '#8896a3', textAlign: 'right', marginTop: 2 }}>
                    {formatTime(msg.created_at)}{msg.mine && <span style={{ marginLeft: 4 }}>{msg.is_read ? '✓✓' : '✓'}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#17212b', borderTop: '1px solid #1f2936', flexShrink: 0 }}>
          {recording ? (
            <>
              <button onClick={cancelRecording} style={{ ...S.iconBtn, color: '#8896a3' }}><Icon name="X" size={20} /></button>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#242f3d', borderRadius: 22, padding: '10px 16px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e05c5c', animation: 'pulse 1s infinite' }} />
                <span style={{ color: '#fff', fontSize: 14 }}>Запись {formatDuration(recSeconds)}</span>
              </div>
              <button onClick={stopRecording} style={S.sendBtn}><Icon name="Send" size={18} className="text-white" /></button>
            </>
          ) : (
            <>
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Сообщение..."
                style={S.input}
              />
              {inputText.trim() ? (
                <button onClick={sendMessage} style={S.sendBtn}><Icon name="Send" size={18} className="text-white" /></button>
              ) : (
                <button onClick={startRecording} style={S.micBtn(false)}><Icon name="Mic" size={18} className="text-white" /></button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // === MAIN SCREEN ===
  return (
    <div style={S.app}>
      {/* Incoming call banner */}
      {incomingCall && (
        <div style={{ background: '#1a3a5c', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, color: '#fff', fontSize: 14 }}>📞 Входящий {incomingCall.type === 'video' ? 'видео' : 'голосовой'} от <b>{incomingCall.fromName}</b></div>
          <button onClick={() => { setIncomingCall(null); }} style={{ ...S.iconBtn, color: '#e05c5c' }}><Icon name="PhoneOff" size={20} /></button>
          <button onClick={() => { answerCall(incomingCall!); setIncomingCall(null); }} style={{ ...S.iconBtn, color: '#4dbb5e' }}><Icon name="Phone" size={20} /></button>
        </div>
      )}

      {/* CHATS */}
      {tab === 'chats' && (
        <>
          <div style={S.header}>
            <div style={S.headerTitle}>Чаты</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: '#8896a3' }}>ID: {myUid}</span>
              <button onClick={() => auth.logout()} style={{ ...S.iconBtn, color: '#8896a3' }} title="Выйти"><Icon name="LogOut" size={18} /></button>
            </div>
          </div>
          <div style={{ padding: '8px 12px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#242f3d', borderRadius: 10, padding: '8px 12px', gap: 8 }}>
              <Icon name="Search" size={16} style={{ color: '#8896a3', flexShrink: 0 }} />
              <input placeholder="Поиск" style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 14, flex: 1 }} />
            </div>
          </div>
          <div style={S.scroll}>
            {conversations.length === 0 && (
              <div style={S.empty}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                Нет чатов.<br />Найдите человека по ID во вкладке «Поиск»
              </div>
            )}
            {conversations.map(conv => (
              <button key={conv.id} onClick={() => openConv(conv)} style={S.convRow}>
                <div style={S.avatar(conv.partner_id)}>{getInitials(conv.partner_name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.partner_name}</span>
                    <span style={{ color: '#8896a3', fontSize: 12, flexShrink: 0, marginLeft: 8 }}>{formatTime(conv.last_message_at)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                    <span style={{ color: '#8896a3', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                      {conv.last_type === 'voice' ? '🎤 Голосовое' : conv.last_message || ''}
                    </span>
                    {conv.unread > 0 && <span style={{ background: '#2b5278', color: '#5eadd4', fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '1px 7px', flexShrink: 0 }}>{conv.unread}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* CALLS */}
      {tab === 'calls' && (
        <>
          <div style={S.header}><div style={S.headerTitle}>Звонки</div></div>
          <div style={S.scroll}>
            {calls.length === 0 && <div style={S.empty}><div style={{ fontSize: 40, marginBottom: 12 }}>📞</div>История звонков пуста</div>}
            {calls.map(call => (
              <div key={call.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #1a2433' }}>
                <div style={S.avatar(call.partner_id, 46)}>{getInitials(call.partner_name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{call.partner_name}</div>
                  <div style={{ color: call.direction === 'incoming' ? '#4dbb5e' : '#8896a3', fontSize: 13 }}>
                    {call.direction === 'incoming' ? '↙' : '↗'} {call.type === 'video' ? 'Видеозвонок' : 'Голосовой'} · {formatTime(call.started_at)}
                  </div>
                </div>
                <Icon name={call.type === 'video' ? 'Video' : 'Phone'} size={18} style={{ color: '#5eadd4' }} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* FIND */}
      {tab === 'find' && (
        <>
          <div style={S.header}><div style={S.headerTitle}>Найти по ID</div></div>
          <div style={{ padding: 16 }}>
            <div style={{ background: '#17212b', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: '#8896a3' }}>
              Ваш ID: <span style={{ color: '#5eadd4', fontWeight: 700, fontSize: 16 }}>{myUid}</span>
              <div style={{ marginTop: 4, fontSize: 12 }}>Поделитесь им с друзьями, чтобы они могли найти вас</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={findUid} onChange={e => setFindUid(e.target.value)} onKeyDown={e => e.key === 'Enter' && findUser()}
                placeholder="Введите ID пользователя"
                style={{ flex: 1, background: '#242f3d', border: '1px solid #2f3f51', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }} />
              <button onClick={findUser} style={{ background: '#2b5278', border: 'none', borderRadius: 10, padding: '10px 16px', color: '#5eadd4', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Найти</button>
            </div>
            {findError && <div style={{ color: '#e05c5c', marginTop: 10, fontSize: 13 }}>{findError}</div>}
            {foundUser && (
              <div style={{ marginTop: 16, background: '#17212b', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={S.avatar(foundUser.id, 48)}>{getInitials(foundUser.name || foundUser.email)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{foundUser.name || foundUser.email}</div>
                  <div style={{ color: '#8896a3', fontSize: 12 }}>ID: {foundUser.user_uid}</div>
                </div>
                <button onClick={() => startChat(foundUser.id)} style={{ background: '#2b5278', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#5eadd4', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Написать</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB BAR */}
      <div style={S.tabBar}>
        {([
          { id: 'chats', icon: 'MessageCircle', label: 'Чаты' },
          { id: 'calls', icon: 'Phone', label: 'Звонки' },
          { id: 'find', icon: 'Search', label: 'Поиск' },
        ] as { id: Tab; icon: string; label: string }[]).map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} style={S.tabBtn(tab === item.id)}>
            <Icon name={item.icon} size={22} />
            <span style={{ fontSize: 11, fontWeight: tab === item.id ? 600 : 400 }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}