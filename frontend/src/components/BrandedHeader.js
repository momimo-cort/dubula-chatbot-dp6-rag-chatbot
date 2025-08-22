import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import AdminPanel from './AdminPanel';
import './BrandedHeader.css';

const BrandedHeader = () => {
  const { getConfigValue } = useTheme();
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Get client ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('client') || process.env.REACT_APP_CLIENT_ID || 'dubula-default';
  
  const appName = getConfigValue('branding.appName', 'RAG Chatbot');
  const tagline = getConfigValue('branding.tagline', 'Ask me anything');
  const logoUrl = getConfigValue('branding.logo.primary');
  const logoWidth = getConfigValue('branding.logo.width', 120);
  const logoHeight = getConfigValue('branding.logo.height', 40);

  return (
    <header className="branded-header">
      <div className="branded-header__container theme-container">
        <div className="branded-header__content">
          {logoUrl && (
            <div className="branded-header__logo">
              <img
                src={logoUrl}
                alt={`${appName} Logo`}
                width={logoWidth}
                height={logoHeight}
                onError={(e) => {
                  // Fallback to text if logo fails to load
                  e.target.style.display = 'none';
                  e.target.parentElement.style.display = 'none';
                }}
              />
            </div>
          )}
          
          <div className="branded-header__text">
            <h1 className="branded-header__title">
              {appName}
            </h1>
            {tagline && (
              <p className="branded-header__tagline">
                {tagline}
              </p>
            )}
          </div>
        </div>
        
        <nav className="branded-header__nav">
          <button 
            className="btn-outline branded-header__nav-button"
            onClick={() => setShowAdminPanel(true)}
          >
            ⚙️ Admin
          </button>
          <button className="btn-outline branded-header__nav-button">
            Help
          </button>
        </nav>
        
        <AdminPanel 
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          clientId={clientId}
        />
      </div>
    </header>
  );
};

export default BrandedHeader;