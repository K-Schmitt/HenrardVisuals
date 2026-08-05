/**
 * App Component - Main Application Entry
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SiteLayout } from '@/components/Layout/SiteLayout';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { SiteContentProvider } from '@/context/SiteContentContext';

// Lazy load pages
const Home = lazy(() => import('@/pages/Home'));
const Contact = lazy(() => import('@/pages/Contact'));
const Admin = lazy(() => import('@/pages/Admin'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink">
      <div className="animate-spin h-8 w-8 border-2 border-bone border-t-transparent rounded-full" />
    </div>
  );
}

function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="font-display text-[clamp(4rem,12vw,9rem)] leading-none mb-6">404</h1>
        <p className="micro-caps text-bone-muted">{t('notFound.message')}</p>
        <a
          href="/"
          className="micro-caps inline-block mt-8 border-b border-bone-faint pb-2 text-bone transition-colors duration-300 hover:border-vermillon"
        >
          {t('notFound.back')}
        </a>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <SiteLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </SiteLayout>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          {/* Below LanguageProvider: it resolves copy for the active locale. */}
          <SiteContentProvider>
            <AppRoutes />
          </SiteContentProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
