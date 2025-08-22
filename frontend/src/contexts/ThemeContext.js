import React, { createContext, useContext, useEffect, useState } from 'react';
import configLoader from '../utils/configLoader';

const ThemeContext = createContext();

// CSS Custom Properties Constants
const CSS_VARIABLES = {
  // Colors
  '--color-primary': 'theme.colors.primary',
  '--color-secondary': 'theme.colors.secondary',
  '--color-accent': 'theme.colors.accent',
  '--color-background': 'theme.colors.background',
  '--color-surface': 'theme.colors.surface',
  '--color-text-primary': 'theme.colors.text.primary',
  '--color-text-secondary': 'theme.colors.text.secondary',
  '--color-text-muted': 'theme.colors.text.muted',
  
  // Typography
  '--font-family-primary': 'theme.typography.fontFamily.primary',
  '--font-family-heading': 'theme.typography.fontFamily.heading',
  '--font-family-monospace': 'theme.typography.fontFamily.monospace',
  '--font-size-base': 'theme.typography.fontSize.base',
  '--font-size-small': 'theme.typography.fontSize.small',
  '--font-size-large': 'theme.typography.fontSize.large',
  
  // Layout
  '--border-radius': 'theme.borderRadius',
  '--spacing-unit': 'theme.spacing.unit',
  '--layout-max-width': 'ui.layout.maxWidth',
  '--layout-header-height': 'ui.layout.headerHeight',
  '--layout-sidebar-width': 'ui.layout.sidebarWidth',
  
  // Chat
  '--chat-max-height': 'ui.chat.maxHeight',
  
  // Animations
  '--animation-duration': 'ui.animations.duration',
  '--animation-easing': 'ui.animations.easing'
};

export const ThemeProvider = ({ children, clientId }) => {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConfiguration();
  }, [clientId]);

  const loadConfiguration = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const clientConfig = await configLoader.loadClientConfig(clientId || 'dubula-default');
      setConfig(clientConfig);
      
      // Apply theme to CSS custom properties
      applyThemeToCSSVariables(clientConfig);
      
    } catch (err) {
      console.error('Failed to load configuration:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const applyThemeToCSSVariables = (config) => {
    const root = document.documentElement;
    
    Object.entries(CSS_VARIABLES).forEach(([cssVar, configPath]) => {
      const value = getNestedValue(config, configPath);
      if (value !== null && value !== undefined) {
        // Handle special cases for units
        const formattedValue = formatCSSValue(cssVar, value);
        root.style.setProperty(cssVar, formattedValue);
      }
    });
    
    // Set dynamic favicon if provided
    const faviconUrl = getNestedValue(config, 'branding.logo.favicon');
    if (faviconUrl) {
      updateFavicon(faviconUrl);
    }
    
    // Update document title
    const appName = getNestedValue(config, 'branding.appName');
    if (appName) {
      document.title = appName;
    }
  };

  const formatCSSValue = (cssVar, value) => {
    // Add 'px' unit to spacing values if they're numbers
    if (cssVar === '--spacing-unit' && typeof value === 'number') {
      return `${value}px`;
    }
    
    // Ensure font families are quoted properly
    if (cssVar.includes('font-family')) {
      return value.includes(',') ? value : `"${value}"`;
    }
    
    return value;
  };

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  };

  const updateFavicon = (faviconUrl) => {
    // Remove existing favicon
    const existingFavicon = document.querySelector('link[rel="icon"]');
    if (existingFavicon) {
      existingFavicon.remove();
    }
    
    // Add new favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = faviconUrl;
    document.head.appendChild(link);
  };

  const getConfigValue = (path, defaultValue = null) => {
    if (!config) return defaultValue;
    return getNestedValue(config, path) || defaultValue;
  };

  const contextValue = {
    config,
    isLoading,
    error,
    getConfigValue,
    reloadConfig: loadConfiguration
  };

  if (isLoading) {
    return (
      <div className="theme-loading">
        <div className="loading-spinner">Loading theme...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="theme-error">
        <h2>Configuration Error</h2>
        <p>{error}</p>
        <button onClick={loadConfiguration}>Retry</button>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;