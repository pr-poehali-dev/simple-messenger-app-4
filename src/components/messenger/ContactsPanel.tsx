import Icon from '@/components/ui/icon';

const contacts = [
  { id: 1, name: 'Алексей Смирнов', role: 'Разработчик', online: true, avatar: 'АС', color: 'from-violet-400 to-purple-600' },
  { id: 2, name: 'Мария Козлова', role: 'Дизайнер', online: true, avatar: 'МК', color: 'from-rose-400 to-pink-600' },
  { id: 3, name: 'Дмитрий Новиков', role: 'Менеджер', online: false, avatar: 'ДН', color: 'from-amber-400 to-orange-500' },
  { id: 4, name: 'Елена Иванова', role: 'Аналитик', online: false, avatar: 'ЕИ', color: 'from-fuchsia-400 to-purple-500' },
  { id: 5, name: 'Игорь Петров', role: 'Тестировщик', online: true, avatar: 'ИП', color: 'from-sky-400 to-indigo-500' },
  { id: 6, name: 'Ольга Сидорова', role: 'HR-специалист', online: false, avatar: 'ОС', color: 'from-teal-400 to-emerald-500' },
];

export default function ContactsPanel() {
  const online = contacts.filter(c => c.online);
  const offline = contacts.filter(c => !c.online);

  return (
    <div className="panel-section flex flex-col h-full">
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Контакты</h2>
        <div className="relative mb-3">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input type="text" placeholder="Найти контакт..." className="search-input pl-9" />
        </div>
        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="UserPlus" size={15} className="text-white" />
          Добавить контакт
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        <div className="px-2 mb-2 mt-1">
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">
            В сети — {online.length}
          </span>
        </div>
        {online.map((c) => (
          <div key={c.id} className="contact-item">
            <div className="relative flex-shrink-0">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${c.color} flex items-center justify-center text-xs font-semibold text-white`}>
                {c.avatar}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[var(--surface-2)]"></span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{c.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{c.role}</p>
            </div>
            <div className="flex gap-1">
              <button className="icon-btn-sm" title="Написать">
                <Icon name="MessageSquare" size={14} />
              </button>
              <button className="icon-btn-sm" title="Позвонить">
                <Icon name="Phone" size={14} />
              </button>
            </div>
          </div>
        ))}

        <div className="px-2 mb-2 mt-4">
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">
            Не в сети — {offline.length}
          </span>
        </div>
        {offline.map((c) => (
          <div key={c.id} className="contact-item opacity-60">
            <div className="relative flex-shrink-0">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${c.color} flex items-center justify-center text-xs font-semibold text-white`}>
                {c.avatar}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{c.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{c.role}</p>
            </div>
            <div className="flex gap-1">
              <button className="icon-btn-sm" title="Написать">
                <Icon name="MessageSquare" size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
