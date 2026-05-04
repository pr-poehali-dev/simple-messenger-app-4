import Icon from '@/components/ui/icon';

export default function ProfilePanel() {
  return (
    <div className="panel-section flex flex-col h-full overflow-y-auto scrollbar-thin">
      <div className="px-4 pt-5 pb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Личный кабинет</h2>

        <div className="flex flex-col items-center py-6 gap-3 bg-[var(--surface-2)] rounded-2xl mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
              АИ
            </div>
            <button className="absolute bottom-0 right-0 w-7 h-7 bg-[var(--accent)] rounded-full flex items-center justify-center">
              <Icon name="Camera" size={13} className="text-white" />
            </button>
            <span className="absolute top-1 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[var(--surface-2)]"></span>
          </div>
          <div className="text-center">
            <p className="font-semibold text-[var(--text-primary)]">Артём Иванов</p>
            <p className="text-sm text-[var(--text-muted)]">@artem_ivanov</p>
          </div>
          <div className="flex gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-400">В сети</span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="profile-field">
            <Icon name="User" size={15} className="text-[var(--text-muted)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-muted)]">Имя</p>
              <p className="text-sm text-[var(--text-primary)]">Артём Иванов</p>
            </div>
            <button className="icon-btn-sm"><Icon name="Pencil" size={13} /></button>
          </div>
          <div className="profile-field">
            <Icon name="Phone" size={15} className="text-[var(--text-muted)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-muted)]">Телефон</p>
              <p className="text-sm text-[var(--text-primary)]">+7 (999) 123-45-67</p>
            </div>
            <button className="icon-btn-sm"><Icon name="Pencil" size={13} /></button>
          </div>
          <div className="profile-field">
            <Icon name="Mail" size={15} className="text-[var(--text-muted)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-muted)]">Email</p>
              <p className="text-sm text-[var(--text-primary)]">artem@example.com</p>
            </div>
            <button className="icon-btn-sm"><Icon name="Pencil" size={13} /></button>
          </div>
          <div className="profile-field">
            <Icon name="Info" size={15} className="text-[var(--text-muted)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-muted)]">О себе</p>
              <p className="text-sm text-[var(--text-primary)]">Разработчик, кофеман ☕</p>
            </div>
            <button className="icon-btn-sm"><Icon name="Pencil" size={13} /></button>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--text-secondary)] text-sm hover:bg-[var(--surface-3)] transition-colors">
            <Icon name="LogOut" size={15} />
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}
