import { lazy, Suspense } from 'react';
import { ConnectionIndicator } from '@/shared/ui/ConnectionIndicator';
import { BrowserRouter, Route, Routes, useLocation, useNavigate, type Location } from 'react-router-dom';
import { SessionEntry } from './SessionEntry';
import { LanguageProvider, useLanguage } from '@/shared/contexts/LanguageContext';
import { AppearanceProvider } from '@/shared/contexts/AppearanceContext';
import UpdateGate from '@/app/UpdateGate';
import { Toaster as NotificationToaster } from '@/shared/ui/sonner';
import { ModalSurface } from '@/shared/ui/ModalSurface';
import { useAppWorkerRegistration } from '@/shared/lib/useAppWorkerRegistration';
import { ChunkErrorBoundary } from '@/shared/ui/ChunkErrorBoundary';

// The help page is public and rarely opened, so it is split out of the main bundle.
const RecoveryEmailLinkPage = lazy(() => import('@/pages/auth').then(module => ({ default: module.RecoveryEmailLinkPage })));
const DocsPage = lazy(() => import('@/pages/docs').then(({ DocsPage }) => ({
  default: function DocsWithWorker(props: React.ComponentProps<typeof DocsPage>) {
    useAppWorkerRegistration();
    return <DocsPage {...props} />;
  },
})));

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
      <Route path="/verify-email" element={<ChunkErrorBoundary><Suspense fallback={null}><RecoveryEmailLinkPage mode="verify" /></Suspense></ChunkErrorBoundary>} />
      <Route path="/reset-password" element={<ChunkErrorBoundary><Suspense fallback={null}><RecoveryEmailLinkPage mode="reset" /></Suspense></ChunkErrorBoundary>} />
      <Route path="/docs" element={<ChunkErrorBoundary key={location.pathname}><Suspense fallback={null}><DocsPage /></Suspense></ChunkErrorBoundary>} />
      <Route path="*" element={<SessionEntry />} />
    </Routes>
    {background && (
      <ChunkErrorBoundary key={location.pathname}>
        <ModalSurface lockScroll label={translations.docsLink} className="fixed inset-0 z-[2000]">
          <Suspense fallback={<div className="h-full bg-black/40" />}>
            <DocsPage onClose={closeDocs} />
          </Suspense>
        </ModalSurface>
      </ChunkErrorBoundary>
    )}
  </>;
}

const App = () => (
  <AppearanceProvider>
    <LanguageProvider>
      <ConnectionIndicator />
      <UpdateGate />
      <NotificationToaster />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </LanguageProvider>
  </AppearanceProvider>
);

export default App;
