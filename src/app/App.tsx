import { BrowserRouter } from 'react-router-dom';
import { AuthFlowPage } from '@/pages/auth';
import { MessengerApp } from '@/pages/messenger';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import UpdateGate from '@/app/UpdateGate';

const App = () => (
  <LanguageProvider>
    <UpdateGate />
    <BrowserRouter>
      <MessengerApp renderAuthPage={(props) => <AuthFlowPage {...props} />} />
    </BrowserRouter>
  </LanguageProvider>
);

export default App;
