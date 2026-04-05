import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import MarketingDomainApp from './MarketingDomainApp';
import { isMarketingOnlyHost } from './lib/hostPolicy';
import './index.css';

const marketing = typeof window !== 'undefined' && isMarketingOnlyHost();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {marketing ? <MarketingDomainApp /> : <App />}
  </React.StrictMode>
);
