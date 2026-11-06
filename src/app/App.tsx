import { lazy, Suspense } from 'react';
import { ConnectionIndicator } from '@/shared/ui/ConnectionIndicator';
import { BrowserRouter, Route, Routes, useLocation, useNavigate, type Location } from 'react-router-dom';
import { AuthFlowPage, RecoveryEmailLinkPage } from '@/pages/auth';
import { MessengerApp } from '@/pages/messenger';
import { LanguageProvider, useLanguage } from '@/shared/contexts/LanguageContext';
import UpdateGate from '@/app/UpdateGate';
import { Toaster as NotificationToaster } from '@/shared/ui/sonner';
import { ModalSurface } from '@/shared/ui/ModalSurface';

// The help page is public and rarely opened, so it is split out of the main bundle.
const DocsPage = lazy(() => import('@/pages/docs').then((module) => ({ default: module.DocsPage })));

export function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { translations } = useLanguage();
  const previous = (location.state as { docsBackgroundLocation?: Location } | null)?.docsBackgroundLocation;
  const background = location.pathname === '/docs' && previous?.pathname?.startsWith('/') && previous.pathname !== '/docs'
    ? previous : undefined;
  const closeDocs = () => navigate(-1);
  return <>
    <Routes location={background || location}>
      <Route path="/verify-email" element={<RecoveryEmailLinkPage mode="verify" />} />
      <Route path="/reset-password" element={<RecoveryEmailLinkPage mode="reset" />} />
      <Route path="/docs" element={<Suspense fallback={null}><DocsPage /></Suspense>} />
      <Route path="*" element={<MessengerApp renderAuthPage={(props) => <AuthFlowPage {...props} />} />} />
    </Routes>
    {background && (
      <ModalSurface lockScroll label={translations.docsLink} className="fixed inset-0 z-[2000]">
        <Suspense fallback={<div className="h-full bg-black/40" />}>
          <DocsPage onClose={closeDocs} />
        </Suspense>
      </ModalSurface>
    )}
  </>;
}

const App = () => (
  <LanguageProvider>
    <ConnectionIndicator />
    <UpdateGate />
    <NotificationToaster />
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </LanguageProvider>
);

export default App;
