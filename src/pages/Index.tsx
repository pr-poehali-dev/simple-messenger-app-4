import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/extensions/auth-email/useAuth';
import AuthPage from './Auth';
import Icon from '@/components/ui/icon';

const AUTH_URL = "https://functions.poehali.dev/9d23499c-1556-498e-801e-74e66d3ae884";
const MSG_URL = "https://functions.poehali.dev/3b8d2fac-14a7-464d-9a46-07d9f85ab395";

type Tab = 'chats' | 'calls' | 'find' | 'profile';
type Screen = 'main' | 'chat' | 'call';

interface Conversation {
  id: number; partner_id: number; partner_name: string;
  partner_email: string; partner_uid: string; partner_username?: string;
  last_message: string; last_type: string; last_sender_id: number;
  last_message_at: string; unread: number;
}
interface Message {
  id: number; content: string; type: string; sender_id: number;
  sender_name: string; created_at: string; mine: boolean; is_read: boolean;
}
interface CallRecord {
  id: number; type: string; status: string; direction: string;
  partner_name: string; partner_id: number; started_at: string;
}
interface FoundUser {
  id: number; name: string; email: string; user_uid: string; username?: string;
}

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
}
function formatTime(dt: string) {
  if (!dt) return '';
  const d = new Date(dt);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 86400) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172800) return 'вчера';
  return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
}
function formatDuration(sec: number) {
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}
const COLORS = ['#1d8cf8', '#00d4aa', '#ff6b6b', '#ffa94d', '#9775fa', '#f06595', '#20c997'];
const avatarColor = (id: number) => COLORS[id % COLORS.length];

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
  const [myUid, setMyUid] = useState('');
  const [myUsername, setMyUsername] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [findQuery, setFindQuery] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [findError, setFindError] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [incomingCall, setIncomingCall] = useState<{ callId: string; fromId: number; fromName: string; type: 'voice' | 'video'; offer: RTCSessionDescriptionInit } | null>(null);
  const [callScreen, setCallScreen] = useState<{ partnerId: number; partnerName: string; type: 'voice' | 'video'; callId: string; outgoing: boolean } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');

  // Refs
  const tokenRef = useRef<string | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const sigPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSigIdRef = useRef(0);
  const incomingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const incomingLastSigRef = useRef(0);
  const screenRef = useRef<Screen>('main');
  const callDurationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeConvRef = useRef<Conversation | null>(null);

  // Всегда актуальный токен через ref — ключевое исправление 401
  const token = auth.accessToken;
  tokenRef.current = token;
  activeConvRef.current = activeConv;
  screenRef.current = screen;

  const authUser = auth.user as { id: number; email: string; name: string | null; user_uid?: string; username?: string } | null;

  // Стабильный authFetch — читает токен из ref, не пересоздаётся
  const authFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    const t = tokenRef.current;
    return fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { 'X-Authorization': `Bearer ${t}` } : {}),
        ...(opts.headers || {})
      }
    });
  }, []); // пустые зависимости — функция стабильна навсегда

  const loadConversations = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const r = await authFetch(`${MSG_URL}?action=conversations`);
      if (!r.ok) return;
      const data = await r.json();
      if (data.conversations) setConversations(data.conversations);
      if (data.user?.user_uid) setMyUid(data.user.user_uid);
      if (data.user?.name) setProfileName(data.user.name);
      else if (data.user?.email) setProfileName(data.user.email.split('@')[0]);
      if (data.user?.username !== undefined) {
        setMyUsername(data.user.username || '');
        setProfileUsername(data.user.username || '');
      }
    } catch { /* ignore */ }
  }, [authFetch]);

  const loadMessages = useCallback(async (convId: number) => {
    if (!tokenRef.current) return;
    try {
      const r = await authFetch(`${MSG_URL}?action=messages&conversation_id=${convId}`);
      if (!r.ok) return;
      const data = await r.json();
      if (data.messages) setMessages(data.messages);
    } catch { /* ignore */ }
  }, [authFetch]);

  const loadCalls = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const r = await authFetch(`${MSG_URL}?action=calls`);
      if (!r.ok) return;
      const data = await r.json();
      if (data.calls) setCalls(data.calls);
    } catch { /* ignore */ }
  }, [authFetch]);

  // Заполняем профиль сразу из authUser (данные из JWT/refresh — всегда актуальны из БД)
  useEffect(() => {
    if (!authUser) return;
    if (authUser.name) setProfileName(authUser.name);
    else if (authUser.email) setProfileName(authUser.email.split('@')[0]);
    if (authUser.user_uid) setMyUid(authUser.user_uid);
    if (authUser.username !== undefined) {
      setMyUsername(authUser.username || '');
      setProfileUsername(authUser.username || '');
    }
  }, [authUser?.id, authUser?.name, authUser?.user_uid, authUser?.username]); // eslint-disable-line

  // Загружаем данные при появлении токена
  useEffect(() => {
    if (token) loadConversations();
  }, [token]); // eslint-disable-line

  // Вкладки
  useEffect(() => {
    if (tab === 'calls' && token) loadCalls();
    if (tab === 'profile' && token) loadConversations();
    if (tab === 'chats' && token) loadConversations();
  }, [tab]); // eslint-disable-line

  // Поллинг сообщений
  useEffect(() => {
    if (!activeConv) return;
    loadMessages(activeConv.id);
    msgPollRef.current = setInterval(() => {
      if (activeConvRef.current) loadMessages(activeConvRef.current.id);
    }, 3000);
    return () => { if (msgPollRef.current) clearInterval(msgPollRef.current); };
  }, [activeConv?.id]); // eslint-disable-line

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Поллинг входящих звонков — читает screen из ref, без замыкания
  useEffect(() => {
    if (!authUser?.id) return;
    const userId = authUser.id;
    incomingPollRef.current = setInterval(async () => {
      if (!tokenRef.current) return;
      if (screenRef.current === 'call') return; // ref вместо замкнутого state
      try {
        const r = await fetch(
          `${MSG_URL}?action=signal-poll&call_id=incoming-${userId}&after_id=${incomingLastSigRef.current}`,
          { headers: { 'X-Authorization': `Bearer ${tokenRef.current}` } }
        );
        if (!r.ok) return;
        const data = await r.json();
        for (const sig of (data.signals || [])) {
          incomingLastSigRef.current = sig.id;
          if (sig.type === 'offer') {
            setIncomingCall({ callId: sig.payload.callId, fromId: sig.from_user_id, fromName: sig.payload.fromName, type: sig.payload.callType, offer: sig.payload.sdp });
          }
        }
      } catch { /* ignore */ }
    }, 1500);
    return () => { if (incomingPollRef.current) clearInterval(incomingPollRef.current); };
  }, [authUser?.id]);

  const sendMessage = async () => {
    if (!inputText.trim() || !activeConv) return;
    const text = inputText.trim();
    setInputText('');
    try {
      await authFetch(`${MSG_URL}?action=send`, {
        method: 'POST',
        body: JSON.stringify({ conversation_id: activeConv.id, content: text, type: 'text' })
      });
      loadMessages(activeConv.id);
      loadConversations();
    } catch { /* ignore */ }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recChunksRef.current = [];
      mr.ondataavailable = e => recChunksRef.current.push(e.data);
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true); setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch { alert('Нет доступа к микрофону'); }
  };

  const stopRecording = async () => {
    if (!mediaRecRef.current || !activeConv) return;
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    const duration = recSeconds;
    setRecording(false);
    const conv = activeConv;
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
        body: JSON.stringify({ conversation_id: conv.id, audio: b64, duration })
      });
      loadMessages(conv.id);
      loadConversations();
    };
  };

  const cancelRecording = () => {
    if (!mediaRecRef.current) return;
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    mediaRecRef.current.stream.getTracks().forEach(t => t.stop());
    mediaRecRef.current = null;
    setRecording(false); setRecSeconds(0);
  };

  // WebRTC
  // ICE серверы — STUN + публичный TURN для прохождения через NAT/мобильный интернет
  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ];

  const sendSignal = useCallback(async (callId: string, toUserId: number, type: string, payload: object) => {
    if (!tokenRef.current) return;
    try {
      await fetch(`${MSG_URL}?action=signal-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Authorization': `Bearer ${tokenRef.current}` },
        body: JSON.stringify({ call_id: callId, to_user_id: toUserId, type, payload })
      });
    } catch { /* ignore */ }
  }, []);

  const stopCallTimer = useCallback(() => {
    if (callDurationRef.current) { clearInterval(callDurationRef.current); callDurationRef.current = null; }
  }, []);

  const startCallTimer = useCallback(() => {
    setCallDuration(0);
    callDurationRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  }, []);

  const endCall = useCallback(() => {
    if (sigPollRef.current) { clearInterval(sigPollRef.current); sigPollRef.current = null; }
    stopCallTimer();
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    setCallScreen(prev => {
      if (prev) sendSignal(prev.callId, prev.partnerId, 'end', {});
      return null;
    });
    setCallStatus('calling');
    setIsMuted(false);
    setIsCameraOff(false);
    setScreen('main');
  }, [sendSignal, stopCallTimer]);

  // Запуск поллинга сигналов для звонка (работает для обеих сторон)
  const startSigPolling = useCallback((callId: string, pc: RTCPeerConnection) => {
    if (sigPollRef.current) clearInterval(sigPollRef.current);
    lastSigIdRef.current = 0;
    sigPollRef.current = setInterval(async () => {
      if (!tokenRef.current) return;
      try {
        const r = await fetch(
          `${MSG_URL}?action=signal-poll&call_id=${callId}&after_id=${lastSigIdRef.current}`,
          { headers: { 'X-Authorization': `Bearer ${tokenRef.current}` } }
        );
        if (!r.ok) return;
        const data = await r.json();
        for (const sig of (data.signals || [])) {
          lastSigIdRef.current = sig.id;
          if (sig.type === 'answer' && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.payload.sdp));
          } else if (sig.type === 'ice') {
            try { await pc.addIceCandidate(new RTCIceCandidate(sig.payload.candidate)); } catch { /* ignore */ }
          } else if (sig.type === 'end') {
            endCall();
          }
        }
      } catch { /* ignore */ }
    }, 800);
  }, [endCall]);

  const createPC = useCallback((callId: string, partnerId: number) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = e => {
      if (e.candidate) sendSignal(callId, partnerId, 'ice', { candidate: e.candidate });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
        startCallTimer();
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setCallStatus('ended');
        setTimeout(endCall, 1500);
      }
    };

    pc.ontrack = e => {
      const stream = e.streams[0];
      if (remoteAudioRef.current && !remoteAudioRef.current.srcObject) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
    };

    pcRef.current = pc;
    return pc;
  }, [sendSignal, startCallTimer, endCall]); // eslint-disable-line

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  }, []);

  const startCall = async (partnerId: number, partnerName: string, type: 'voice' | 'video') => {
    const callId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const pc = createPC(callId, partnerId);
    try {
      const constraints = { audio: true, video: type === 'video' ? { facingMode: 'user' } : false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      if (type === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === 'video' });
      await pc.setLocalDescription(offer);
      await sendSignal(callId, partnerId, 'offer', { sdp: offer, callType: type });
      authFetch(`${MSG_URL}?action=log-call`, { method: 'POST', body: JSON.stringify({ callee_id: partnerId, type, status: 'outgoing' }) });
      setCallStatus('calling');
      setIsMuted(false); setIsCameraOff(false);
      setCallScreen({ partnerId, partnerName, type, callId, outgoing: true });
      setScreen('call');
      startSigPolling(callId, pc);
    } catch (e) {
      pc.close();
      alert('Нет доступа к микрофону' + (type === 'video' ? '/камере' : ''));
    }
  };

  const answerCall = async (sig: { callId: string; fromId: number; fromName: string; type: 'voice' | 'video'; offer: RTCSessionDescriptionInit }) => {
    const pc = createPC(sig.callId, sig.fromId);
    try {
      const constraints = { audio: true, video: sig.type === 'video' ? { facingMode: 'user' } : false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      if (sig.type === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      await pc.setRemoteDescription(new RTCSessionDescription(sig.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(sig.callId, sig.fromId, 'answer', { sdp: answer });
      setCallStatus('calling');
      setIsMuted(false); setIsCameraOff(false);
      setCallScreen({ partnerId: sig.fromId, partnerName: sig.fromName, type: sig.type, callId: sig.callId, outgoing: false });
      setScreen('call');
      startSigPolling(sig.callId, pc);
    } catch (e) {
      pc.close();
      alert('Нет доступа к микрофону' + (sig.type === 'video' ? '/камере' : ''));
    }
  };

  const findUser = async () => {
    setFoundUser(null); setFindError('');
    const q = findQuery.trim();
    if (!q) return;
    if (!tokenRef.current) { setFindError('Войдите в аккаунт'); return; }
    try {
      const r = await authFetch(`${MSG_URL}?action=find-user&q=${encodeURIComponent(q)}`);
      const data = await r.json();
      if (data.user) setFoundUser(data.user);
      else setFindError(data.error || 'Пользователь не найден');
    } catch { setFindError('Ошибка сети'); }
  };

  const startChat = async (partnerId: number) => {
    try {
      const r = await authFetch(`${MSG_URL}?action=start-conversation`, {
        method: 'POST', body: JSON.stringify({ partner_id: partnerId })
      });
      const data = await r.json();
      if (data.conversation_id) {
        setTab('chats'); setFoundUser(null); setFindQuery('');
        await loadConversations();
      }
    } catch { /* ignore */ }
  };

  const saveProfile = async () => {
    if (!profileName.trim() || !tokenRef.current) return;
    setProfileSaving(true); setProfileMsg('');
    try {
      const r = await authFetch(`${MSG_URL}?action=update-profile`, {
        method: 'POST',
        body: JSON.stringify({ name: profileName.trim(), username: profileUsername.trim() })
      });
      const data = await r.json();
      if (data.ok) {
        setProfileMsg('Сохранено!');
        if (data.username !== undefined) { setMyUsername(data.username || ''); setProfileUsername(data.username || ''); }
        if (data.name) setProfileName(data.name);
      } else {
        setProfileMsg(data.error || 'Ошибка сохранения');
      }
    } catch { setProfileMsg('Ошибка сети'); }
    setProfileSaving(false);
    setTimeout(() => setProfileMsg(''), 3000);
  };

  if (auth.isLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1117' }}>
        <div style={{ color: '#8896a3', fontSize: 15 }}>Загрузка...</div>
      </div>
    );
  }
  if (!auth.isAuthenticated) return <AuthPage auth={auth} />;

  const myName = authUser?.name || authUser?.email || '';
  const myId = authUser?.id || 0;

  // ─── CALL SCREEN ───
  if (screen === 'call' && callScreen) {
    const isVideo = callScreen.type === 'video';
    const statusText = callStatus === 'connected' ? formatDuration(callDuration) : callStatus === 'ended' ? 'Завершается...' : callScreen.outgoing ? 'Вызов...' : 'Входящий...';
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#0a0f18' }}>
        {/* Видео удалённого */}
        {isVideo && (
          <video ref={remoteVideoRef} autoPlay playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {/* Аудио всегда */}
        <audio ref={remoteAudioRef} autoPlay />

        {/* Основной контент */}
        <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24,
          background: isVideo && callStatus === 'connected' ? 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.7) 100%)' : 'transparent' }}>
          {(!isVideo || callStatus !== 'connected') && (
            <>
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: avatarColor(callScreen.partnerId), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700, color: '#fff', boxShadow: '0 0 40px rgba(93,173,212,0.3)' }}>
                {getInitials(callScreen.partnerName)}
              </div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 26, marginTop: 8 }}>{callScreen.partnerName}</div>
            </>
          )}
          <div style={{ color: callStatus === 'connected' ? '#4dbb5e' : '#8896a3', fontSize: 16, fontWeight: callStatus === 'connected' ? 700 : 400 }}>{statusText}</div>
        </div>

        {/* Локальное видео (маленькое) */}
        {isVideo && (
          <video ref={localVideoRef} autoPlay playsInline muted
            style={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', right: 16, width: 90, height: 130, borderRadius: 12, objectFit: 'cover', zIndex: 20, border: '2px solid rgba(255,255,255,0.2)', display: isCameraOff ? 'none' : 'block' }} />
        )}

        {/* Кнопки управления */}
        <div style={{ position: 'relative', zIndex: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, padding: '24px 24px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
          {/* Mute */}
          <button onClick={toggleMute} style={{ width: 60, height: 60, borderRadius: '50%', background: isMuted ? '#e05c5c' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
            <Icon name={isMuted ? 'MicOff' : 'Mic'} size={24} className="text-white" />
          </button>

          {/* Завершить */}
          <button onClick={endCall} style={{ width: 72, height: 72, borderRadius: '50%', background: '#e05c5c', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(224,92,92,0.5)' }}>
            <Icon name="PhoneOff" size={30} className="text-white" />
          </button>

          {/* Camera / Speaker */}
          {isVideo ? (
            <button onClick={toggleCamera} style={{ width: 60, height: 60, borderRadius: '50%', background: isCameraOff ? '#e05c5c' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={isCameraOff ? 'VideoOff' : 'Video'} size={24} className="text-white" />
            </button>
          ) : (
            <button style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="Volume2" size={24} className="text-white" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── CHAT SCREEN ───
  if (screen === 'chat' && activeConv) {
    const p = activeConv;
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#0e1117' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#17212b', borderBottom: '1px solid #1f2936', flexShrink: 0, paddingTop: 'max(10px, env(safe-area-inset-top))' }}>
          <button onClick={() => setScreen('main')} style={{ background: 'none', border: 'none', color: '#5eadd4', cursor: 'pointer', padding: 6, flexShrink: 0 }}>
            <Icon name="ArrowLeft" size={24} />
          </button>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarColor(p.partner_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff', flexShrink: 0 }}>
            {getInitials(p.partner_name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.partner_name}</div>
            <div style={{ color: '#8896a3', fontSize: 11 }}>
              ID: {p.partner_uid}{p.partner_username ? ` · @${p.partner_username}` : ''}
            </div>
          </div>
          <button onClick={() => startCall(p.partner_id, p.partner_name, 'voice')} style={{ background: 'none', border: 'none', color: '#5eadd4', cursor: 'pointer', padding: 6, flexShrink: 0 }}>
            <Icon name="Phone" size={20} />
          </button>
          <button onClick={() => startCall(p.partner_id, p.partner_name, 'video')} style={{ background: 'none', border: 'none', color: '#5eadd4', cursor: 'pointer', padding: 6, flexShrink: 0 }}>
            <Icon name="Video" size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#8896a3', padding: 40, fontSize: 14 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
              Напишите первое сообщение
            </div>
          )}
          {messages.map(msg => {
            const isVoice = msg.type === 'voice';
            let voiceData: { url: string; duration: number } | null = null;
            if (isVoice) { try { voiceData = JSON.parse(msg.content); } catch { voiceData = null; } }
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '78%', padding: '8px 12px', borderRadius: msg.mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.mine ? '#2b5278' : '#17212b', color: '#fff', fontSize: 14, lineHeight: 1.5 }}>
                  {isVoice && voiceData
                    ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
                        <Icon name="Mic" size={15} style={{ color: '#5eadd4', flexShrink: 0 }} />
                        <audio controls src={voiceData.url} style={{ height: 30, flex: 1, minWidth: 120 }} />
                        <span style={{ fontSize: 11, color: '#8896a3', whiteSpace: 'nowrap' }}>{formatDuration(voiceData.duration)}</span>
                      </div>
                    : <div>{msg.content}</div>
                  }
                  <div style={{ fontSize: 11, color: '#8896a3', textAlign: 'right', marginTop: 2 }}>
                    {formatTime(msg.created_at)}{msg.mine && <span style={{ marginLeft: 4 }}>{msg.is_read ? '✓✓' : '✓'}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#17212b', borderTop: '1px solid #1f2936', flexShrink: 0, paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
          {recording ? (
            <>
              <button onClick={cancelRecording} style={{ background: 'none', border: 'none', color: '#8896a3', cursor: 'pointer', padding: 6, flexShrink: 0 }}><Icon name="X" size={22} /></button>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#242f3d', borderRadius: 22, padding: '10px 16px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e05c5c' }} />
                <span style={{ color: '#fff', fontSize: 14 }}>Запись {formatDuration(recSeconds)}</span>
              </div>
              <button onClick={stopRecording} style={{ width: 44, height: 44, borderRadius: '50%', background: '#2b5278', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <Icon name="Send" size={18} className="text-white" />
              </button>
            </>
          ) : (
            <>
              <input value={inputText} onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Сообщение..."
                style={{ flex: 1, background: '#242f3d', border: 'none', borderRadius: 22, padding: '10px 16px', color: '#fff', fontSize: 15, outline: 'none' }}
              />
              {inputText.trim()
                ? <button onClick={sendMessage} style={{ width: 44, height: 44, borderRadius: '50%', background: '#2b5278', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><Icon name="Send" size={18} className="text-white" /></button>
                : <button onClick={startRecording} style={{ width: 44, height: 44, borderRadius: '50%', background: '#2b5278', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><Icon name="Mic" size={18} className="text-white" /></button>
              }
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── MAIN SCREEN ───
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#0e1117' }}>

      {incomingCall && (
        <div style={{ background: '#1a3a5c', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, zIndex: 50 }}>
          <div style={{ flex: 1, color: '#fff', fontSize: 14 }}>
            📞 {incomingCall.type === 'video' ? 'Видеозвонок' : 'Звонок'} от <b>{incomingCall.fromName}</b>
          </div>
          <button onClick={() => setIncomingCall(null)} style={{ background: '#e05c5c', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Откл.</button>
          <button onClick={() => { answerCall(incomingCall); setIncomingCall(null); }} style={{ background: '#4dbb5e', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Принять</button>
        </div>
      )}

      {/* CHATS */}
      {tab === 'chats' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#17212b', borderBottom: '1px solid #1f2936', flexShrink: 0, paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>Чаты</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {myUid && <span style={{ fontSize: 11, color: '#8896a3' }}>ID: {myUid}</span>}
              <button onClick={() => auth.logout()} style={{ background: 'none', border: 'none', color: '#8896a3', cursor: 'pointer', padding: 4 }} title="Выйти">
                <Icon name="LogOut" size={18} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 && (
              <div style={{ textAlign: 'center', color: '#8896a3', padding: '48px 24px', fontSize: 14 }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>💬</div>
                <div style={{ fontWeight: 600, marginBottom: 6, color: '#fff' }}>Нет чатов</div>
                Найдите друга по ID или @никнейму во вкладке «Поиск»
              </div>
            )}
            {conversations.map(conv => (
              <button key={conv.id} onClick={() => { setActiveConv(conv); setScreen('chat'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #1a2433', textAlign: 'left' }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: avatarColor(conv.partner_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#fff', flexShrink: 0 }}>
                  {getInitials(conv.partner_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{conv.partner_name}</span>
                      {conv.partner_username && <span style={{ color: '#5eadd4', fontSize: 12 }}>@{conv.partner_username}</span>}
                    </div>
                    <span style={{ color: '#8896a3', fontSize: 12, flexShrink: 0, marginLeft: 8 }}>{formatTime(conv.last_message_at)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                    <span style={{ color: '#8896a3', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.last_type === 'voice' ? '🎤 Голосовое' : conv.last_message || ''}
                    </span>
                    {conv.unread > 0 && <span style={{ background: '#2b5278', color: '#5eadd4', fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '2px 8px', flexShrink: 0, marginLeft: 6 }}>{conv.unread}</span>}
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
          <div style={{ padding: '12px 16px', background: '#17212b', borderBottom: '1px solid #1f2936', flexShrink: 0, paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>Звонки</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {calls.length === 0 && (
              <div style={{ textAlign: 'center', color: '#8896a3', padding: '48px 24px', fontSize: 14 }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>📞</div>
                <div style={{ fontWeight: 600, marginBottom: 6, color: '#fff' }}>Нет звонков</div>
                История появится здесь
              </div>
            )}
            {calls.map(call => (
              <div key={call.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #1a2433' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: avatarColor(call.partner_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0 }}>
                  {getInitials(call.partner_name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{call.partner_name}</div>
                  <div style={{ color: call.direction === 'incoming' ? '#4dbb5e' : '#8896a3', fontSize: 13, marginTop: 2 }}>
                    {call.direction === 'incoming' ? '↙ Входящий' : '↗ Исходящий'} · {call.type === 'video' ? 'Видео' : 'Голосовой'} · {formatTime(call.started_at)}
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
          <div style={{ padding: '12px 16px', background: '#17212b', borderBottom: '1px solid #1f2936', flexShrink: 0, paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>Найти человека</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <div style={{ background: '#17212b', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ color: '#8896a3', fontSize: 12, marginBottom: 4 }}>Ваш ID и никнейм</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ color: '#5eadd4', fontWeight: 700, fontSize: 26, letterSpacing: 3 }}>{myUid || '...'}</span>
                {myUsername && <span style={{ color: '#a8b4c8', fontSize: 16 }}>@{myUsername}</span>}
              </div>
              <div style={{ color: '#8896a3', fontSize: 12, marginTop: 6 }}>Поделитесь с друзьями, чтобы они могли найти вас</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={findQuery} onChange={e => setFindQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && findUser()}
                placeholder="Введите ID (123456) или @ник"
                style={{ flex: 1, background: '#242f3d', border: '1px solid #2f3f51', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 15, outline: 'none' }}
              />
              <button onClick={findUser} style={{ background: '#2b5278', border: 'none', borderRadius: 10, padding: '12px 18px', color: '#5eadd4', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Найти</button>
            </div>
            {findError && <div style={{ color: '#e05c5c', marginTop: 10, fontSize: 13 }}>{findError}</div>}
            {foundUser && (
              <div style={{ marginTop: 16, background: '#17212b', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: avatarColor(foundUser.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, color: '#fff', flexShrink: 0 }}>
                  {getInitials(foundUser.name || foundUser.email)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{foundUser.name || foundUser.email}</div>
                  <div style={{ color: '#8896a3', fontSize: 12, marginTop: 2 }}>
                    ID: {foundUser.user_uid}
                    {foundUser.username && <span style={{ marginLeft: 8, color: '#5eadd4' }}>@{foundUser.username}</span>}
                  </div>
                </div>
                <button onClick={() => startChat(foundUser.id)} style={{ background: '#2b5278', border: 'none', borderRadius: 10, padding: '10px 16px', color: '#5eadd4', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Написать</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* PROFILE */}
      {tab === 'profile' && (
        <>
          <div style={{ padding: '12px 16px', background: '#17212b', borderBottom: '1px solid #1f2936', flexShrink: 0, paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>Профиль</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0 20px' }}>
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: avatarColor(myId), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 34, color: '#fff' }}>
                {getInitials(myName)}
              </div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginTop: 12 }}>{profileName || myName}</div>
              {myUsername && <div style={{ color: '#5eadd4', fontSize: 15, marginTop: 4 }}>@{myUsername}</div>}
              <div style={{ background: '#1f2d3d', borderRadius: 8, padding: '4px 16px', marginTop: 8 }}>
                <span style={{ color: '#8896a3', fontSize: 12 }}>ID: </span>
                <span style={{ color: '#5eadd4', fontWeight: 700, fontSize: 18, letterSpacing: 3 }}>{myUid || '...'}</span>
              </div>
            </div>

            <div style={{ background: '#17212b', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ color: '#8896a3', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Имя</div>
              <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Ваше имя"
                style={{ width: '100%', background: '#242f3d', border: '1px solid #2f3f51', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />

              <div style={{ color: '#8896a3', fontSize: 12, marginTop: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Никнейм</div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#5eadd4', fontSize: 16, fontWeight: 700, pointerEvents: 'none' }}>@</span>
                <input value={profileUsername}
                  onChange={e => setProfileUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                  placeholder="nickname"
                  maxLength={32}
                  style={{ width: '100%', background: '#242f3d', border: '1px solid #2f3f51', borderRadius: 10, padding: '12px 14px 12px 30px', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ color: '#5e6e85', fontSize: 12, marginTop: 6 }}>Латиница, цифры, _ · 3–32 символа · По нику вас найдут в поиске</div>

              {profileMsg && <div style={{ color: profileMsg === 'Сохранено!' ? '#4dbb5e' : '#e05c5c', fontSize: 13, marginTop: 10, fontWeight: 600 }}>{profileMsg}</div>}
              <button onClick={saveProfile} disabled={profileSaving}
                style={{ width: '100%', background: '#2b5278', border: 'none', borderRadius: 10, padding: '13px 0', color: '#5eadd4', cursor: profileSaving ? 'default' : 'pointer', fontWeight: 600, fontSize: 15, marginTop: 12, opacity: profileSaving ? 0.7 : 1 }}>
                {profileSaving ? 'Сохраняю...' : 'Сохранить'}
              </button>
            </div>

            <div style={{ background: '#17212b', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ color: '#8896a3', fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Аккаунт</div>
              <div style={{ color: '#8896a3', fontSize: 13 }}>Email</div>
              <div style={{ color: '#fff', fontSize: 15, marginBottom: 12 }}>{authUser?.email}</div>
              <div style={{ color: '#8896a3', fontSize: 13 }}>Ваш ID</div>
              <div style={{ color: '#5eadd4', fontSize: 24, fontWeight: 700, letterSpacing: 4 }}>{myUid || '...'}</div>
            </div>

            <button onClick={() => auth.logout()}
              style={{ width: '100%', background: '#2a1f1f', border: '1px solid #4a2020', borderRadius: 12, padding: '14px 0', color: '#e05c5c', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
              Выйти из аккаунта
            </button>
          </div>
        </>
      )}

      {/* TAB BAR */}
      <div style={{ display: 'flex', background: '#17212b', borderTop: '1px solid #1f2936', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {([
          { id: 'chats', icon: 'MessageCircle', label: 'Чаты', badge: conversations.reduce((s, c) => s + c.unread, 0) },
          { id: 'calls', icon: 'Phone', label: 'Звонки', badge: 0 },
          { id: 'find', icon: 'Search', label: 'Поиск', badge: 0 },
          { id: 'profile', icon: 'User', label: 'Профиль', badge: 0 },
        ] as { id: Tab; icon: string; label: string; badge: number }[]).map(item => (
          <button key={item.id} onClick={() => setTab(item.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', color: tab === item.id ? '#5eadd4' : '#8896a3', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <Icon name={item.icon} size={24} />
              {item.badge > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -8, background: '#e05c5c', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 8, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>{item.badge}</span>
              )}
            </div>
            <span style={{ fontSize: 11, fontWeight: tab === item.id ? 600 : 400 }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}