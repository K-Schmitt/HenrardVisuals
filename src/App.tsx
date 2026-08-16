/**
 * App Component - Main Application Entry
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SiteLayout } from '@/components/Layout/SiteLayout';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { SiteContentProvider } from '@/context/SiteContentContext';

// Lazy load pages
const Home = lazy(() => import('@/pages/Home'));
const Contact = lazy(() => import('@/pages/Contact'));
const Admin = lazy(() => import('@/pages/Admin'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink">
      <div className="animate-spin h-8 w-8 border-2 border-bone border-t-transparent rounded-full" />
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
