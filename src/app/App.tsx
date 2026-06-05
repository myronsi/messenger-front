import { BrowserRouter } from 'react-router-dom';
import MessengerApp from '@/pages/messenger/MessengerApp';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';

const App = () => (
  <LanguageProvider>
    <BrowserRouter>
      <MessengerApp />
    </BrowserRouter>
  </LanguageProvider>
);

export default App;
