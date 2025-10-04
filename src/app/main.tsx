import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from '@/app/store'
import App from '@/app/App'
import '@/shared/styles/index.css'

if (typeof document !== 'undefined') {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
}

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
  </Provider>
);
