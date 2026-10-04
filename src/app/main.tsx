import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from '@/app/store'
import App from '@/app/App'
import '@/shared/styles/index.css'
import { installClientVersionFetch } from '@/shared/api/clientVersionFetch'
import { installPreloadErrorReload } from '@/shared/lib/preloadError'

installClientVersionFetch();
installPreloadErrorReload();

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
  </Provider>
);
