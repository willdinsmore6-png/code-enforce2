import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import ProspectWelcomeView from './ProspectWelcomeView';

function subscribeAfterLoginUrl() {
  return `${window.location.origin}/subscribe?new=true`;
}

/**
 * Prospect page inside the main Base44 app (same origin as /dashboard).
 * For code-enforce.com-only marketing deploy, see MarketingDomainApp + main.jsx branch.
 */
export default function ProspectWelcomePage() {
  const { navigateToLogin, user } = useAuth();

  const goSubscribeNewTown = () => {
    if (user) {
      window.location.assign(subscribeAfterLoginUrl());
      return;
    }
    base44.auth.redirectToLogin(subscribeAfterLoginUrl());
  };

  return (
    <ProspectWelcomeView
      linkBase={null}
      onSignIn={() => navigateToLogin()}
      onSubscribeNewTown={goSubscribeNewTown}
      showOpenApp={!!user}
      onOpenApp={() => window.location.assign('/dashboard')}
      marketingSiteFooter={false}
    />
  );
}
