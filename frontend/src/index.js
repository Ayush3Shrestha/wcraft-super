import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/brand.css';
import './styles/shop.css';
import App from './App';
import { loadRates } from './lib/currency';

// Exchange rates for showing prices in the visitor's currency
loadRates();


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

