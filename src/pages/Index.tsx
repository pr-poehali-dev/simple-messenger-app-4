import { useState } from 'react';
import { useAuth } from '@/components/extensions/auth-email/useAuth';
import AuthPage from './Auth';
import Sidebar from '@/components/messenger/Sidebar';
import DialogList from '@/components/messenger/DialogList';
import ChatWindow from '@/components/messenger/ChatWindow';
import ContactsPanel from '@/components/messenger/ContactsPanel';
import CallsPanel from '@/components/messenger/CallsPanel';
import SearchPanel from '@/components/messenger/SearchPanel';
import NotificationsPanel from '@/components/messenger/NotificationsPanel';
import ArchivePanel from '@/components/messenger/ArchivePanel';
import ProfilePanel from '@/components/messenger/ProfilePanel';
import SettingsPanel from '@/components/messenger/SettingsPanel';
import type { Dialog } from '@/components/messenger/DialogList';

const AUTH_URL = "https://functions.poehali.dev/9d23499c-1556-498e-801e-74e66d3ae884";

export default function Index() {
  const [activeSection, setActiveSection] = useState('dialogs');
  const [selectedDialog, setSelectedDialog] = useState<Dialog | null>(null);

  const auth = useAuth({
    apiUrls: {
      login: `${AUTH_URL}?action=login`,
      register: `${AUTH_URL}?action=register`,
      verifyEmail: `${AUTH_URL}?action=verify-email`,
      refresh: `${AUTH_URL}?action=refresh`,
      logout: `${AUTH_URL}?action=logout`,
      resetPassword: `${AUTH_URL}?action=reset-password`,
    },
  });

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-[var(--text-muted)] text-sm">Загрузка...</div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <AuthPage onSuccess={() => {}} />;
  }

  const hasChatPanel = activeSection === 'dialogs';

  const renderLeftPanel = () => {
    switch (activeSection) {
      case 'dialogs': return <DialogList onSelectDialog={setSelectedDialog} selectedId={selectedDialog?.id ?? null} />;
      case 'contacts': return <ContactsPanel />;
      case 'calls': return <CallsPanel />;
      case 'search': return <SearchPanel />;
      case 'notifications': return <NotificationsPanel />;
      case 'archive': return <ArchivePanel />;
      case 'profile': return <ProfilePanel />;
      case 'settings': return <SettingsPanel />;
      default: return null;
    }
  };

  return (
    <div className="messenger-root">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} notifications={3} />

      <div className="panel-left">
        {renderLeftPanel()}
      </div>

      {hasChatPanel && (
        <div className="panel-chat">
          <ChatWindow dialog={selectedDialog} />
        </div>
      )}

      {!hasChatPanel && (
        <div className="panel-chat flex items-center justify-center">
          <div className="text-center opacity-30">
            <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">💬</span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">Messenger</p>
          </div>
        </div>
      )}
    </div>
  );
}
