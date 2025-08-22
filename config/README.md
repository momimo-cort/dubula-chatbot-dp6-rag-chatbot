# Configuration System

This directory contains the configuration management system for client customization.

## Structure

- `schema.json` - JSON schema defining the configuration structure
- `default.json` - Default configuration used as fallback
- `config.js` - Configuration manager class for loading and merging configs
- `clients/` - Directory containing client-specific configuration files

## Usage

### Loading Configuration

```javascript
import configManager from './config/config.js';

// Load configuration for a specific client
const config = await configManager.loadClientConfig('kove-collection');

// Get specific configuration values
const primaryColor = configManager.get('theme.colors.primary');
const appName = configManager.get('branding.appName');
```

### Environment Variables

Configuration can be overridden using environment variables:

```bash
CLIENT_ID=kove-collection
APP_NAME="Kove Training Assistant"
THEME_PRIMARY_COLOR="#1B2937"
```

### Client Configuration Files

Each client should have their own JSON file in the `clients/` directory:

- `clients/kove-collection.json` - Kove Collection restaurant group
- `clients/[client-id].json` - Other client configurations

## Configuration Hierarchy

1. Default configuration (`default.json`)
2. Client-specific configuration (`clients/[client-id].json`)
3. Environment variables (highest priority)

Later configurations override earlier ones using deep merge.

## Adding New Clients

1. Create a new JSON file in `clients/` directory
2. Follow the schema defined in `schema.json`
3. Override only the values that differ from default
4. Test the configuration loads correctly

## Validation

The configuration system validates against the JSON schema to ensure all required fields are present and values are properly formatted.