import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// The app shell has no internal scroll container — the window itself
// scrolls. Client-side navigation doesn't reset that like a full page
// load would, so every route change needs to force it back to the top.
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
