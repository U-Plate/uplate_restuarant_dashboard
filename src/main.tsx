import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import App from './App';
import { AppProvider } from './store/AppContext';
import { AuthProvider } from './auth/AuthContext';
import { AuthGate } from './auth/AuthGate';
import DashboardOverview from './pages/DashboardOverview';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import AdDetail from './pages/AdDetail';
import AdCreate from './pages/AdCreate';
import AdsLibrary from './pages/AdsLibrary';
import Analytics from './pages/Analytics';
import AudienceInsights from './pages/AudienceInsights';
import Settings from './pages/Settings';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthGate>
          <AppProvider>
            <Routes>
              <Route element={<App />}>
                <Route index element={<DashboardOverview />} />
                <Route path="campaigns" element={<Campaigns />} />
                <Route path="campaigns/:id" element={<CampaignDetail />} />
                <Route path="campaigns/:id/ads/new" element={<AdCreate />} />
                <Route path="campaigns/:id/ads/:adId" element={<AdDetail />} />
                <Route path="ads" element={<AdsLibrary />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="audience" element={<AudienceInsights />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </AppProvider>
        </AuthGate>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
