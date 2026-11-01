import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthFlowPage } from '@/pages/auth';
import { MessengerApp } from '@/pages/messenger';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import UpdateGate from '@/app/UpdateGate';
import { Toaster as NotificationToaster } from '@/shared/ui/sonner';

// The help page is public and rarely opened, so it is split out of the main bundle.
const DocsPage = lazy(() => import('@/pages/docs').then((module) => ({ default: module.DocsPage })));

const App = () => (
  <LanguageProvider>
    <UpdateGate />
    <NotificationToaster />
    <BrowserRouter>
      <Routes>
        <Route path="/docs" element={<Suspense fallback={null}><DocsPage /></Suspense>} />
        <Route path="*" element={<MessengerApp renderAuthPage={(props) => <AuthFlowPage {...props} />} />} />
      </Routes>
    </BrowserRouter>
  </LanguageProvider>
);

export default App;
