import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface Dialog {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  avatar: string;
  color: string;
}

const dialogs: Dialog[] = [
  { id: 1, name: 'Алексей Смирнов', lastMessage: 'Хорошо, давай созвонимся в 15:00', time: '14:32', unread: 2, online: true, avatar: 'АС', color: 'from-violet-400 to-purple-600' },
  { id: 2, name: 'Команда дизайна', lastMessage: 'Макеты готовы, смотри в облаке', time: '13:18', unread: 5, online: false, avatar: 'КД', color: 'from-blue-400 to-cyan-600' },
  { id: 3, name: 'Мария Козлова', lastMessage: 'Спасибо за помощь!', time: '12:05', unread: 0, online: true, avatar: 'МК', color: 'from-rose-400 to-pink-600' },
  { id: 4, name: 'Дмитрий Новиков', lastMessage: 'Отчёт отправил на почту', time: '11:47', unread: 0, online: false, avatar: 'ДН', color: 'from-amber-400 to-orange-500' },
  { id: 5, name: 'Поддержка сервиса', lastMessage: 'Ваш запрос #4521 обработан', time: 'Вчера', unread: 1, online: true, avatar: 'ПС', color: 'from-emerald-400 to-teal-600' },
  { id: 6, name: 'Елена Иванова', lastMessage: 'Увидимся на встрече в пятницу', time: 'Вчера', unread: 0, online: false, avatar: 'ЕИ', color: 'from-fuchsia-400 to-purple-500' },
  { id: 7, name: 'Рабочая группа', lastMessage: 'Игорь: план на следующую неделю', time: 'Пн', unread: 12, online: false, avatar: 'РГ', color: 'from-sky-400 to-indigo-500' },
];

interface DialogListProps {
  onSelectDialog: (dialog: Dialog) => void;
  selectedId: number | null;
}

export default function DialogList({ onSelectDialog, selectedId }: DialogListProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = filter === 'unread' ? dialogs.filter(d => d.unread > 0) : dialogs;

  return (
    <div className="panel-section flex flex-col h-full">
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Диалоги</h2>
        <div className="relative mb-3">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Поиск диалогов..."
            className="search-input pl-9"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
          >
            Все
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`filter-chip ${filter === 'unread' ? 'active' : ''}`}
          >
            Непрочитанные
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        {filtered.map((dialog) => (
          <button
            key={dialog.id}
            onClick={() => onSelectDialog(dialog)}
            className={`dialog-item w-full text-left ${selectedId === dialog.id ? 'active' : ''}`}
          >
            <div className="relative flex-shrink-0">
              <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${dialog.color} flex items-center justify-center text-xs font-semibold text-white`}>
                {dialog.avatar}
              </div>
              {dialog.online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[var(--surface-2)]"></span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <span className="font-medium text-sm text-[var(--text-primary)] truncate">{dialog.name}</span>
                <span className="text-xs text-[var(--text-muted)] flex-shrink-0 ml-2">{dialog.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--text-muted)] truncate">{dialog.lastMessage}</span>
                {dialog.unread > 0 && (
                  <span className="unread-badge ml-2">{dialog.unread}</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export type { Dialog };
