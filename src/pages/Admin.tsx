import { useState } from 'react';

import { AccountSettings } from '@/components/Admin/AccountSettings';
import { CategoryManager } from '@/components/Admin/CategoryManager';
import { PhotosTab } from '@/components/Admin/PhotosTab';
import { ProfileSettings } from '@/components/Admin/ProfileSettings';
import { SiteContentSettings } from '@/components/Admin/SiteContentSettings';
import { Login } from '@/components/Auth/Login';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

type Tab = 'photos' | 'categories' | 'settings' | 'content' | 'account';

export function Admin() {
  const { isAuthenticated, isAdmin, user, signOut, isLoading } = useAuth();
  const { t } = useLanguage();

  // noindex: an admin panel has no business in a search index, and robots.txt
  // alone does not stop a page that was linked from somewhere else.
  useDocumentMeta({
    title: t('meta.admin.title'),
    description: t('meta.admin.description'),
    noindex: true,
  });
  const [activeTab, setActiveTab] = useState<Tab>('photos');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-vermillon border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <Login onSuccess={() => {}} />
      </div>
    );
  }

  // UX gating only. RLS (public.is_admin()) is what actually stops a
  // non-admin from writing; this stops us handing them a panel that looks
  // functional and fails at every request.
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6">
        <p className="text-bone-muted">{t('admin.notAuthorised')}</p>
        <button
          type="button"
          onClick={signOut}
          className="micro-caps border-b border-bone-faint pb-2 text-bone transition-colors duration-300 hover:border-vermillon"
        >
          {t('admin.signOut')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 lg:px-12 pt-32 pb-12 bg-white text-ink">
      <header className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-display-sm text-gray-900">Admin Panel</h1>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-gray-500">
            Welcome back, {user?.email}
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="border-b border-gray-300 pb-1.5 text-[10px] uppercase tracking-[0.16em] text-gray-900 transition-colors hover:border-vermillon"
        >
          Sign Out
        </button>
      </header>

      <nav className="flex gap-7 mb-8 border-b border-gray-200">
        {(['photos', 'categories', 'settings', 'content', 'account'] as const).map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 pb-3 text-[11px] uppercase tracking-[0.2em] transition-colors ${
              activeTab === tab
                ? 'border-vermillon text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'photos' && <PhotosTab />}
      {activeTab === 'categories' && <CategoryManager />}
      {activeTab === 'settings' && <ProfileSettings />}
      {activeTab === 'content' && <SiteContentSettings />}
      {activeTab === 'account' && <AccountSettings />}
    </div>
  );
}

export default Admin;
