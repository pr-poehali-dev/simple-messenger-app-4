import { useState } from 'react';
import Icon from '@/components/ui/icon';

export default function SettingsPanel() {
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifCalls, setNotifCalls] = useState(true);
  const [notifSounds, setNotifSounds] = useState(false);
  const [hideLastSeen, setHideLastSeen] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>('dark');

  return (
    <div className="panel-section flex flex-col h-full overflow-y-auto scrollbar-thin">
      <div className="px-4 pt-5 pb-6 space-y-5">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Настройки</h2>

        <section>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium mb-2">Уведомления</p>
          <div className="settings-group space-y-0.5">
            <ToggleRow
              icon="MessageSquare"
              label="Новые сообщения"
              checked={notifMessages}
              onChange={setNotifMessages}
            />
            <ToggleRow
              icon="Phone"
              label="Звонки"
              checked={notifCalls}
              onChange={setNotifCalls}
            />
            <ToggleRow
              icon="Volume2"
              label="Звуки уведомлений"
              checked={notifSounds}
              onChange={setNotifSounds}
            />
          </div>
        </section>

        <section>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium mb-2">Конфиденциальность</p>
          <div className="settings-group space-y-0.5">
            <ToggleRow
              icon="Clock"
              label="Скрывать время посещения"
              checked={hideLastSeen}
              onChange={setHideLastSeen}
            />
            <ToggleRow
              icon="CheckCheck"
              label="Уведомление о прочтении"
              checked={readReceipts}
              onChange={setReadReceipts}
            />
          </div>
        </section>

        <section>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium mb-2">Тема</p>
          <div className="grid grid-cols-3 gap-2">
            {(['dark', 'light', 'auto'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`theme-btn ${theme === t ? 'active' : ''}`}
              >
                <Icon
                  name={t === 'dark' ? 'Moon' : t === 'light' ? 'Sun' : 'Monitor'}
                  size={16}
                  className={theme === t ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}
                />
                <span>{t === 'dark' ? 'Тёмная' : t === 'light' ? 'Светлая' : 'Авто'}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium mb-2">Аккаунт</p>
          <div className="settings-group">
            <button className="settings-link">
              <Icon name="Shield" size={15} className="text-[var(--text-muted)]" />
              <span>Двухфакторная аутентификация</span>
              <Icon name="ChevronRight" size={14} className="ml-auto text-[var(--text-muted)]" />
            </button>
            <button className="settings-link">
              <Icon name="Key" size={15} className="text-[var(--text-muted)]" />
              <span>Изменить пароль</span>
              <Icon name="ChevronRight" size={14} className="ml-auto text-[var(--text-muted)]" />
            </button>
            <button className="settings-link text-rose-400">
              <Icon name="Trash2" size={15} className="text-rose-400" />
              <span>Удалить аккаунт</span>
              <Icon name="ChevronRight" size={14} className="ml-auto text-rose-400/50" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

interface ToggleRowProps {
  icon: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ icon, label, checked, onChange }: ToggleRowProps) {
  return (
    <div className="settings-link">
      <Icon name={icon} fallback="Circle" size={15} className="text-[var(--text-muted)]" />
      <span className="flex-1">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`toggle ${checked ? 'on' : 'off'}`}
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}
