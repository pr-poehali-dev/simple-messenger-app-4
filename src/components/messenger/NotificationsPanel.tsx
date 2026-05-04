import Icon from '@/components/ui/icon';

const notifications = [
  { id: 1, type: 'message', name: 'Алексей Смирнов', text: 'Хорошо, давай созвонимся в 15:00', time: '2 мин назад', read: false, avatar: 'АС', color: 'from-violet-400 to-purple-600' },
  { id: 2, type: 'call', name: 'Мария Козлова', text: 'Пропущенный видеозвонок', time: '1 час назад', read: false, avatar: 'МК', color: 'from-rose-400 to-pink-600' },
  { id: 3, type: 'message', name: 'Команда дизайна', text: '5 новых сообщений', time: '2 часа назад', read: false, avatar: 'КД', color: 'from-blue-400 to-cyan-600' },
  { id: 4, type: 'message', name: 'Поддержка сервиса', text: 'Ваш запрос #4521 обработан', time: 'Вчера', read: true, avatar: 'ПС', color: 'from-emerald-400 to-teal-600' },
  { id: 5, type: 'call', name: 'Дмитрий Новиков', text: 'Пропущенный голосовой звонок', time: 'Вчера', read: true, avatar: 'ДН', color: 'from-amber-400 to-orange-500' },
  { id: 6, type: 'message', name: 'Рабочая группа', text: 'Игорь: план на следующую неделю', time: 'Пн', read: true, avatar: 'РГ', color: 'from-sky-400 to-indigo-500' },
];

const typeIcon = {
  message: { icon: 'MessageSquare', bg: 'bg-[var(--accent)]/20', color: 'text-[var(--accent)]' },
  call: { icon: 'PhoneMissed', bg: 'bg-rose-400/20', color: 'text-rose-400' },
};

export default function NotificationsPanel() {
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="panel-section flex flex-col h-full">
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Уведомления</h2>
          {unread > 0 && (
            <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
              {unread} новых
            </span>
          )}
        </div>
        <button className="text-xs text-[var(--accent)] hover:opacity-80 transition-opacity mt-1">
          Отметить все как прочитанные
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        {notifications.map((n) => {
          const cfg = typeIcon[n.type as keyof typeof typeIcon];
          return (
            <div key={n.id} className={`contact-item relative ${!n.read ? 'bg-[var(--accent)]/5' : ''}`}>
              {!n.read && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[var(--accent)] rounded-full"></span>
              )}
              <div className="relative flex-shrink-0 ml-2">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${n.color} flex items-center justify-center text-xs font-semibold text-white`}>
                  {n.avatar}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${cfg.bg} flex items-center justify-center`}>
                  <Icon name={cfg.icon} fallback="Bell" size={10} className={cfg.color} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <p className={`text-sm font-medium truncate ${n.read ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>{n.name}</p>
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0 ml-2">{n.time}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">{n.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
