import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProspectWelcomeView from '@/pages/ProspectWelcomeView';
import { getConfiguredAppOrigin } from '@/lib/hostPolicy';

/**
 * Minimal router for marketing-only hosts (e.g. code-enforce.com).
 * No Base44 AuthProvider — no login gate. All app CTAs jump to VITE_APP_ORIGIN (default www.code-enforcepro.com).
 */
function MarketingHome() {
  const origin = getConfiguredAppOrigin();

  const signIn = () => {
    const back = `${origin}/dashboard`;
    window.location.assign(`${origin}/login?from_url=${encodeURIComponent(back)}`);
  };

  const subscribe = () => {
    window.location.assign(`${origin}/subscribe?new=true`);
  };

  return (
    <ProspectWelcomeView
      linkBase={origin}
      onSignIn={signIn}
      onSubscribeNewTown={subscribe}
      marketingSiteFooter
    />
  );
}

export default function MarketingDomainApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MarketingHome />} />
        <Route path="/welcome" element={<MarketingHome />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
