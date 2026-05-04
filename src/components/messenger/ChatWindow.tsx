import { useState } from 'react';
import Icon from '@/components/ui/icon';
import type { Dialog } from './DialogList';

interface Message {
  id: number;
  text: string;
  time: string;
  mine: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

const mockMessages: Message[] = [
  { id: 1, text: 'Привет! Как дела с проектом?', time: '14:10', mine: false },
  { id: 2, text: 'Всё идёт по плану, завтра будет готова первая версия', time: '14:12', mine: true, status: 'read' },
  { id: 3, text: 'Отлично! Можем созвониться сегодня?', time: '14:25', mine: false },
  { id: 4, text: 'Конечно, давай в 15:00', time: '14:28', mine: true, status: 'read' },
  { id: 5, text: 'Хорошо, давай созвонимся в 15:00', time: '14:32', mine: false },
];

interface ChatWindowProps {
  dialog: Dialog | null;
}

export default function ChatWindow({ dialog }: ChatWindowProps) {
  const [message, setMessage] = useState('');

  if (!dialog) {
    return (
      <div className="chat-empty flex flex-col items-center justify-center h-full gap-4">
        <div className="w-20 h-20 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center">
          <Icon name="MessageSquare" size={36} className="text-[var(--text-muted)]" />
        </div>
        <div className="text-center">
          <p className="text-[var(--text-secondary)] font-medium mb-1">Выберите диалог</p>
          <p className="text-sm text-[var(--text-muted)]">Начните общение или выберите существующий чат</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="chat-header">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${dialog.color} flex items-center justify-center text-xs font-semibold text-white flex-shrink-0`}>
            {dialog.avatar}
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)] leading-tight">{dialog.name}</p>
            <p className="text-xs text-emerald-400 leading-tight">
              {dialog.online ? 'В сети' : 'Был(а) недавно'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="icon-btn" title="Голосовой звонок">
            <Icon name="Phone" size={18} />
          </button>
          <button className="icon-btn" title="Видеозвонок">
            <Icon name="Video" size={18} />
          </button>
          <button className="icon-btn" title="Поиск в чате">
            <Icon name="Search" size={18} />
          </button>
          <button className="icon-btn" title="Ещё">
            <Icon name="MoreVertical" size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 flex flex-col gap-2">
        <div className="text-center mb-2">
          <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-2)] px-3 py-1 rounded-full">Сегодня</span>
        </div>
        {mockMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`message-bubble ${msg.mine ? 'mine' : 'theirs'}`}>
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <div className={`flex items-center gap-1 mt-1 ${msg.mine ? 'justify-end' : 'justify-start'}`}>
                <span className="text-[10px] opacity-60">{msg.time}</span>
                {msg.mine && msg.status === 'read' && (
                  <Icon name="CheckCheck" size={12} className="text-[var(--accent)] opacity-80" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input-area">
        <button className="icon-btn" title="Прикрепить файл">
          <Icon name="Paperclip" size={18} />
        </button>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Написать сообщение..."
          className="chat-input"
          onKeyDown={(e) => e.key === 'Enter' && setMessage('')}
        />
        <button className="icon-btn" title="Эмодзи">
          <Icon name="Smile" size={18} />
        </button>
        <button
          className="send-btn"
          onClick={() => setMessage('')}
          title="Отправить"
        >
          <Icon name="Send" size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}
