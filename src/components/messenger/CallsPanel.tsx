import Icon from '@/components/ui/icon';

const calls = [
  { id: 1, name: 'Алексей Смирнов', type: 'incoming', duration: '12:34', time: 'Сегодня, 14:10', avatar: 'АС', color: 'from-violet-400 to-purple-600', video: false },
  { id: 2, name: 'Мария Козлова', type: 'outgoing', duration: '05:22', time: 'Сегодня, 11:48', avatar: 'МК', color: 'from-rose-400 to-pink-600', video: true },
  { id: 3, name: 'Команда дизайна', type: 'missed', duration: '—', time: 'Вчера, 16:30', avatar: 'КД', color: 'from-blue-400 to-cyan-600', video: false },
  { id: 4, name: 'Дмитрий Новиков', type: 'outgoing', duration: '02:11', time: 'Вчера, 09:15', avatar: 'ДН', color: 'from-amber-400 to-orange-500', video: false },
  { id: 5, name: 'Елена Иванова', type: 'incoming', duration: '08:05', time: 'Пн, 15:40', avatar: 'ЕИ', color: 'from-fuchsia-400 to-purple-500', video: true },
];

const typeConfig = {
  incoming: { icon: 'PhoneIncoming', color: 'text-emerald-400', label: 'Входящий' },
  outgoing: { icon: 'PhoneOutgoing', color: 'text-[var(--accent)]', label: 'Исходящий' },
  missed: { icon: 'PhoneMissed', color: 'text-rose-400', label: 'Пропущенный' },
};

export default function CallsPanel() {
  return (
    <div className="panel-section flex flex-col h-full">
      <div className="px-4 pt-5 pb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Звонки</h2>
        <div className="grid grid-cols-2 gap-2">
          <button className="call-action-btn">
            <Icon name="Phone" size={18} className="text-emerald-400" />
            <span>Голосовой</span>
          </button>
          <button className="call-action-btn">
            <Icon name="Video" size={18} className="text-[var(--accent)]" />
            <span>Видеозвонок</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        <div className="px-2 mb-2">
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">История</span>
        </div>
        {calls.map((call) => {
          const cfg = typeConfig[call.type as keyof typeof typeConfig];
          return (
            <div key={call.id} className="contact-item">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${call.color} flex items-center justify-center text-xs font-semibold text-white flex-shrink-0`}>
                {call.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon name={cfg.icon} fallback="Phone" size={12} className={cfg.color} />
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{call.name}</p>
                  {call.video && <Icon name="Video" size={11} className="text-[var(--text-muted)] flex-shrink-0" />}
                </div>
                <p className="text-xs text-[var(--text-muted)]">{call.time} · {call.duration}</p>
              </div>
              <button className="icon-btn-sm" title="Перезвонить">
                <Icon name={call.video ? 'Video' : 'Phone'} size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
