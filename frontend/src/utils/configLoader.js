/**
 * Configuration Loader for Frontend
 * Loads client configuration from backend API
 */

const CONFIG_ENDPOINT = '/api/config';

class ConfigLoader {
  constructor() {
    this.cache = new Map();
    this.defaultConfig = null;
  }

  /**
   * Load configuration for a specific client
   * @param {string} clientId - Client identifier
   * @returns {Promise<object>} Configuration object
   */
  async loadClientConfig(clientId) {
    // Check cache first
    const cacheKey = clientId || 'default';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`${CONFIG_ENDPOINT}?client=${encodeURIComponent(clientId)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.status} ${response.statusText}`);
      }

      const config = await response.json();
      
      // Cache the configuration
      this.cache.set(cacheKey, config);
      
      return config;
    } catch (error) {
      console.error('Failed to load client configuration:', error);
      
      // Fallback to default configuration
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration
   * @returns {object} Default configuration
   */
  getDefaultConfig() {
    if (!this.defaultConfig) {
      this.defaultConfig = {
        client: {
          id: 'dubula-default',
          name: 'Dubula',
          industry: 'restaurant'
        },
        branding: {
          appName: 'Dubula - Restaurant Training Assistant',
          tagline: 'Ask questions about restaurant service, food handling, and customer service',
          logo: {
            primary: '/assets/logos/dubula-logo.png',
            favicon: '/assets/logos/dubula-favicon.ico',
            width: 120,
            height: 40
          }
        },
        theme: {
          colors: {
            primary: '#8B4513',
            secondary: '#DAA520',
            accent: '#FF6347',
            background: '#FFF8DC',
            surface: '#FFFFFF',
            text: {
              primary: '#2C1810',
              secondary: '#5D4E37',
              muted: '#8B7355'
            }
          },
          typography: {
            fontFamily: {
              primary: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              heading: 'Playfair Display, Georgia, serif',
              monospace: 'Monaco, "Cascadia Code", Consolas, monospace'
            },
            fontSize: {
              base: '16px',
              small: '14px',
              large: '18px'
            }
          },
          borderRadius: '8px',
          spacing: {
            unit: 8
          }
        },
        ui: {
          layout: {
            maxWidth: '1200px',
            headerHeight: '80px',
            sidebarWidth: '300px'
          },
          chat: {
            welcomeMessage: 'Hello! I\'m here to help you with restaurant service questions. What would you like to know?',
            placeholder: 'Ask me about restaurant service, food handling, or customer service...',
            maxHeight: '600px',
            showTimestamps: true,
            showTypingIndicator: true,
            allowFileUploads: false
          },
          animations: {
            enabled: true,
            duration: '0.2s',
            easing: 'ease-in-out'
          }
        }
      };
    }
    
    return this.defaultConfig;
  }

  /**
   * Clear configuration cache
   * @param {string} clientId - Optional client ID to clear specific cache
   */
  clearCache(clientId) {
    if (clientId) {
      this.cache.delete(clientId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Preload configurations for multiple clients
   * @param {string[]} clientIds - Array of client IDs to preload
   */
  async preloadConfigurations(clientIds) {
    const promises = clientIds.map(clientId => this.loadClientConfig(clientId));
    await Promise.allSettled(promises);
  }
}

// Singleton instance
const configLoader = new ConfigLoader();

export default configLoader;