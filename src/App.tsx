import { Outlet, useLocation, useMatch } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { useApp } from './store/AppContext';

function useRouteHeader(): { title: string; subtitle?: string } {
  const { pathname } = useLocation();
  const campaignMatch = useMatch('/campaigns/:id');
  const adMatch = useMatch('/campaigns/:id/ads/:adId');
  const { state } = useApp();

  if (adMatch) {
    const ad = state.ads[adMatch.params.adId ?? ''];
    return {
      title: ad ? ad.title : 'Ad',
      subtitle: 'Edit creative and audience targeting',
    };
  }
  if (campaignMatch) {
    const c = state.campaigns[campaignMatch.params.id ?? ''];
    return {
      title: c ? c.name : 'Campaign',
      subtitle: 'Ads, targeting, and performance',
    };
  }
  if (pathname.startsWith('/campaigns')) {
    return { title: 'Campaigns', subtitle: 'Plan and run ad campaigns across UPlate' };
  }
  if (pathname.startsWith('/ads')) {
    return { title: 'Ads Library', subtitle: 'All creatives across every campaign' };
  }
  if (pathname.startsWith('/analytics')) {
    return { title: 'Analytics', subtitle: 'Performance across campaigns and ads' };
  }
  if (pathname.startsWith('/audience')) {
    return { title: 'Audience Insights', subtitle: 'Who you are reaching on UPlate' };
  }
  if (pathname.startsWith('/settings')) {
    return { title: 'Settings', subtitle: 'Restaurant profile and preferences' };
  }
  return {
    title: 'Dashboard',
    subtitle: 'Performance snapshot for the last 30 days',
  };
}

export default function App() {
  const header = useRouteHeader();

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}
    >
      <Sidebar />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Topbar title={header.title} subtitle={header.subtitle} />
        <main
          style={{
            flex: 1,
            padding: '0 var(--s-6) var(--s-7)',
            minWidth: 0,
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
