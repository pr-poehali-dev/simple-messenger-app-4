import Icon from '@/components/ui/icon';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  notifications: number;
}

const navItems = [
  { id: 'dialogs', icon: 'MessageSquare', label: 'Диалоги' },
  { id: 'contacts', icon: 'Users', label: 'Контакты' },
  { id: 'calls', icon: 'Phone', label: 'Звонки' },
  { id: 'search', icon: 'Search', label: 'Поиск' },
  { id: 'notifications', icon: 'Bell', label: 'Уведомления' },
  { id: 'archive', icon: 'Archive', label: 'Архив' },
];

export default function Sidebar({ activeSection, onSectionChange, notifications }: SidebarProps) {
  return (
    <aside className="sidebar-nav flex flex-col items-center py-6 gap-1">
      <div className="mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent-gradient flex items-center justify-center">
          <Icon name="Zap" size={20} className="text-white" />
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`nav-btn group relative ${activeSection === item.id ? 'active' : ''}`}
            title={item.label}
          >
            <Icon name={item.icon} fallback="Circle" size={20} />
            {item.id === 'notifications' && notifications > 0 && (
              <span className="notif-badge">{notifications}</span>
            )}
            <span className="nav-tooltip">{item.label}</span>
          </button>
        ))}
      </nav>

      <button
        onClick={() => onSectionChange('settings')}
        className={`nav-btn group relative mt-auto ${activeSection === 'settings' ? 'active' : ''}`}
        title="Настройки"
      >
        <Icon name="Settings" size={20} />
        <span className="nav-tooltip">Настройки</span>
      </button>

      <button
        onClick={() => onSectionChange('profile')}
        className={`mt-3 relative ${activeSection === 'profile' ? 'ring-2 ring-[var(--accent)]' : ''} rounded-full`}
        title="Профиль"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-sm font-semibold text-white">
          АИ
        </div>
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[var(--surface-1)]"></span>
      </button>
    </aside>
  );
}