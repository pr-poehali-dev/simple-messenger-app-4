import Icon from '@/components/ui/icon';

const archived = [
  { id: 1, name: 'Проект Альфа', lastMessage: 'Закрыто. Финальный отчёт отправлен.', time: '12 янв', avatar: 'ПА', color: 'from-slate-400 to-slate-600' },
  { id: 2, name: 'Стас Волков', lastMessage: 'Спасибо за совместную работу!', time: '8 янв', avatar: 'СВ', color: 'from-zinc-400 to-zinc-600' },
  { id: 3, name: 'HR-рассылка', lastMessage: 'Корпоратив состоится 25 декабря', time: '28 дек', avatar: 'HR', color: 'from-neutral-400 to-neutral-600' },
  { id: 4, name: 'Тех. поддержка', lastMessage: 'Тикет #3912 закрыт', time: '15 дек', avatar: 'ТП', color: 'from-stone-400 to-stone-600' },
  { id: 5, name: 'Команда бета', lastMessage: 'Проект завершён успешно!', time: '2 дек', avatar: 'КБ', color: 'from-gray-400 to-gray-600' },
];

export default function ArchivePanel() {
  return (
    <div className="panel-section flex flex-col h-full">
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Архив</h2>
        <p className="text-xs text-[var(--text-muted)] mb-3">Завершённые и скрытые диалоги</p>
        <div className="relative">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input type="text" placeholder="Поиск в архиве..." className="search-input pl-9" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        {archived.map((item) => (
          <div key={item.id} className="dialog-item w-full text-left opacity-70 hover:opacity-100">
            <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-xs font-semibold text-white flex-shrink-0`}>
              {item.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <span className="font-medium text-sm text-[var(--text-secondary)] truncate">{item.name}</span>
                <span className="text-xs text-[var(--text-muted)] flex-shrink-0 ml-2">{item.time}</span>
              </div>
              <span className="text-xs text-[var(--text-muted)] truncate block">{item.lastMessage}</span>
            </div>
            <button className="icon-btn-sm opacity-50 hover:opacity-100" title="Разархивировать">
              <Icon name="ArchiveRestore" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
