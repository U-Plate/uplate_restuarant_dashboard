import { Outlet } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { MobileChrome } from './components/layout/MobileChrome';
import { ScrollToTop } from './components/layout/ScrollToTop';

export default function App() {
  return (
    <div className="uplate-shell">
      <ScrollToTop />
      <div className="uplate-shell__sidebar">
        <Sidebar />
      </div>
      <div className="uplate-shell__main">
        <MobileChrome />
        <main className="uplate-shell__page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
