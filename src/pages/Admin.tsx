import { useState } from 'react';

import { AccountSettings } from '@/components/Admin/AccountSettings';
import { CategoryManager } from '@/components/Admin/CategoryManager';
import { PhotosTab } from '@/components/Admin/PhotosTab';
import { ProfileSettings } from '@/components/Admin/ProfileSettings';
import { Login } from '@/components/Auth/Login';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

type Tab = 'photos' | 'categories' | 'settings' | 'account';

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
        <div className="animate-spin h-8 w-8 border-2 border-accent-500 border-t-transparent rounded-full" />
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
        <p className="text-gray-400">{t('admin.notAuthorised')}</p>
        <button
          type="button"
          onClick={signOut}
          className="px-4 py-2 border border-white text-sm uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
        >
          {t('admin.signOut')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 lg:px-12 pt-32 pb-12 bg-white text-black">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-display-sm text-gray-900">Admin Panel</h1>
          <p className="text-body-md text-gray-500 mt-1">Welcome back, {user?.email}</p>
        </div>
        <button
            type="button"
          onClick={signOut}
          className="px-4 py-2 bg-gray-100 text-gray-900 rounded-elegant hover:bg-gray-200 transition-colors"
        >
          Sign Out
        </button>
      </header>

      <nav className="flex gap-4 mb-8 border-b border-gray-200">
        {(['photos', 'categories', 'settings', 'account'] as const).map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'photos' && <PhotosTab />}
      {activeTab === 'categories' && <CategoryManager />}
      {activeTab === 'settings' && <ProfileSettings />}
      {activeTab === 'account' && <AccountSettings />}
    </div>
  );
}

export default Admin;
