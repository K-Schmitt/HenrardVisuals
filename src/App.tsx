/**
 * App Component - Main Application Entry
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { SiteLayout } from '@/components/Layout/SiteLayout';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';

// Lazy load pages
const Home = lazy(() => import('@/pages/Home'));
const Contact = lazy(() => import('@/pages/Contact'));
const Admin = lazy(() => import('@/pages/Admin'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
    </div>
  );
}

function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="font-serif text-6xl text-white mb-4">404</h1>
        <p className="text-gray-400">{t('notFound.message')}</p>
        <a href="/" className="inline-block mt-6 text-white hover:text-gray-300">
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
    <LanguageProvider>
      <AppRoutes />
    </LanguageProvider>
  );
}
