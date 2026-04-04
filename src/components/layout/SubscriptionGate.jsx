/**
 * Subscription / inactive-town redirects live in App.jsx (authRoutePolicy) only,
 * so we never double-navigate with AuthContext or a layout effect.
 */
export default function SubscriptionGate({ children }) {
  return children;
}
