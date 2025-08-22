/**
 * Configuration Management System
 * Handles loading and merging of client-specific configurations
 */

const DEFAULT_CONFIG_PATH = './default.json';
const CLIENT_CONFIG_BASE_PATH = './clients/';

class ConfigManager {
  constructor() {
    this.config = null;
    this.defaultConfig = null;
  }

  /**
   * Load default configuration
   */
  async loadDefaultConfig() {
    try {
      const defaultConfig = await import(DEFAULT_CONFIG_PATH, { assert: { type: 'json' } });
      this.defaultConfig = defaultConfig.default;
      return this.defaultConfig;
    } catch (error) {
      throw new Error(`Failed to load default configuration: ${error.message}`);
    }
  }

  /**
   * Load client-specific configuration
   * @param {string} clientId - Client identifier
   */
  async loadClientConfig(clientId) {
    if (!clientId) {
      throw new Error('Client ID is required');
    }

    try {
      // Load default config first
      if (!this.defaultConfig) {
        await this.loadDefaultConfig();
      }

      // Load client-specific config
      const clientConfigPath = `${CLIENT_CONFIG_BASE_PATH}${clientId}.json`;
      const clientConfig = await import(clientConfigPath, { assert: { type: 'json' } });

      // Deep merge configurations
      this.config = this.deepMerge(this.defaultConfig, clientConfig.default);
      
      return this.config;
    } catch (error) {
      console.warn(`Failed to load client config for ${clientId}, falling back to default:`, error.message);
      this.config = this.defaultConfig;
      return this.config;
    }
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment() {
    const envConfig = {
      client: {
        id: process.env.CLIENT_ID,
        name: process.env.CLIENT_NAME,
        industry: process.env.CLIENT_INDUSTRY
      },
      branding: {
        appName: process.env.APP_NAME,
        tagline: process.env.APP_TAGLINE
      },
      theme: {
        colors: {
          primary: process.env.THEME_PRIMARY_COLOR,
          secondary: process.env.THEME_SECONDARY_COLOR,
          background: process.env.THEME_BACKGROUND_COLOR
        }
      }
    };

    // Remove undefined values
    const cleanEnvConfig = this.removeUndefined(envConfig);
    
    if (this.config && Object.keys(cleanEnvConfig).length > 0) {
      this.config = this.deepMerge(this.config, cleanEnvConfig);
    }

    return this.config;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get specific configuration value by path
   * @param {string} path - Dot notation path (e.g., 'theme.colors.primary')
   * @param {*} defaultValue - Default value if path not found
   */
  get(path, defaultValue = null) {
    if (!this.config) {
      return defaultValue;
    }

    return path.split('.').reduce((obj, key) => {
      return obj && obj[key] !== undefined ? obj[key] : defaultValue;
    }, this.config);
  }

  /**
   * Deep merge two objects
   * @param {object} target - Target object
   * @param {object} source - Source object to merge
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (this.isObject(source[key]) && this.isObject(result[key])) {
          result[key] = this.deepMerge(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Check if value is an object
   * @param {*} item - Item to check
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Remove undefined values from object
   * @param {object} obj - Object to clean
   */
  removeUndefined(obj) {
    const cleaned = {};
    
    for (const [key, value] in Object.entries(obj)) {
      if (value !== undefined) {
        if (this.isObject(value)) {
          const cleanedNested = this.removeUndefined(value);
          if (Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested;
          }
        } else {
          cleaned[key] = value;
        }
      }
    }
    
    return cleaned;
  }

  /**
   * Validate configuration against schema
   * @param {object} config - Configuration to validate
   * @param {object} schema - JSON schema
   */
  validateConfig(config, schema) {
    // Basic validation - in production, use a proper JSON schema validator
    const requiredFields = schema.required || [];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Required field missing: ${field}`);
      }
    }

    return true;
  }
}

// Singleton instance
const configManager = new ConfigManager();

export default configManager;