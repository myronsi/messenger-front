import { lazy, Suspense } from 'react';
import { ConnectionIndicator } from '@/shared/ui/ConnectionIndicator';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SessionEntry } from './SessionEntry';
import { HelpSiteRedirect } from './HelpSiteRedirect';
import { LanguageProvider } from '@/shared/contexts/LanguageProvider';
import { AppearanceProvider } from '@/shared/contexts/AppearanceProvider';
import UpdateGate from '@/app/UpdateGate';
import { Toaster as NotificationToaster } from '@/shared/ui/sonner-toaster';
import { ChunkErrorBoundary } from '@/shared/ui/ChunkErrorBoundary';

const RecoveryEmailLinkPage = lazy(() => import('@/pages/auth').then(module => ({ default: module.RecoveryEmailLinkPage })));

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/verify-email" element={<ChunkErrorBoundary><Suspense fallback={null}><RecoveryEmailLinkPage mode="verify" /></Suspense></ChunkErrorBoundary>} />
      <Route path="/reset-password" element={<ChunkErrorBoundary><Suspense fallback={null}><RecoveryEmailLinkPage mode="reset" /></Suspense></ChunkErrorBoundary>} />
      <Route path="/docs/*" element={<HelpSiteRedirect />} />
      <Route path="*" element={<SessionEntry />} />
    </Routes>
  );
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
