import { useState } from 'react';
import Icon from '@/components/ui/icon';

const allResults = [
  { id: 1, type: 'message', name: 'Алексей Смирнов', text: 'Хорошо, давай созвонимся в 15:00', time: '14:32', avatar: 'АС', color: 'from-violet-400 to-purple-600' },
  { id: 2, type: 'contact', name: 'Мария Козлова', text: 'Дизайнер', time: '', avatar: 'МК', color: 'from-rose-400 to-pink-600' },
  { id: 3, type: 'message', name: 'Команда дизайна', text: 'Макеты готовы, смотри в облаке', time: '13:18', avatar: 'КД', color: 'from-blue-400 to-cyan-600' },
  { id: 4, type: 'contact', name: 'Дмитрий Новиков', text: 'Менеджер', time: '', avatar: 'ДН', color: 'from-amber-400 to-orange-500' },
  { id: 5, type: 'message', name: 'Елена Иванова', text: 'Увидимся на встрече в пятницу', time: 'Вчера', avatar: 'ЕИ', color: 'from-fuchsia-400 to-purple-500' },
];

export default function SearchPanel() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'messages' | 'contacts'>('all');

  const filtered = allResults.filter(r => {
    const matchTab = tab === 'all' || r.type === (tab === 'messages' ? 'message' : 'contact');
    const matchQuery = !query || r.name.toLowerCase().includes(query.toLowerCase()) || r.text.toLowerCase().includes(query.toLowerCase());
    return matchTab && matchQuery;
  });

  return (
    <div className="panel-section flex flex-col h-full">
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Поиск</h2>
        <div className="relative mb-3">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по сообщениям и контактам..."
            className="search-input pl-9"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Icon name="X" size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {(['all', 'messages', 'contacts'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`filter-chip ${tab === t ? 'active' : ''}`}>
              {t === 'all' ? 'Всё' : t === 'messages' ? 'Сообщения' : 'Контакты'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        {!query ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Icon name="Search" size={32} className="text-[var(--text-muted)] opacity-40" />
            <p className="text-sm text-[var(--text-muted)]">Введите запрос для поиска</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Icon name="SearchX" size={32} className="text-[var(--text-muted)] opacity-40" />
            <p className="text-sm text-[var(--text-muted)]">Ничего не найдено</p>
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="contact-item cursor-pointer">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${r.color} flex items-center justify-center text-xs font-semibold text-white flex-shrink-0`}>
                {r.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{r.name}</p>
                  {r.time && <span className="text-xs text-[var(--text-muted)]">{r.time}</span>}
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">{r.text}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${r.type === 'message' ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-emerald-400/20 text-emerald-400'}`}>
                {r.type === 'message' ? 'сообщение' : 'контакт'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
