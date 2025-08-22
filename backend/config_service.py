import os
import json
from typing import Dict, Optional, Any


class ConfigService:
    """Centralized configuration service for handling client configs."""
    
    def __init__(self, config_base_path: str = '/app/config'):
        self.config_base_path = config_base_path
        self._cache: Dict[str, Dict] = {}
        self._default_config: Optional[Dict] = None
    
    def get_config(self, client_id: str = 'dubula-default') -> Dict[str, Any]:
        """Get merged configuration for a client."""
        if client_id not in self._cache:
            self._cache[client_id] = self._load_merged_config(client_id)
        return self._cache[client_id]
    
    def save_config(self, client_id: str, config: Dict[str, Any]) -> bool:
        """Save client configuration and update cache."""
        try:
            # Ensure clients directory exists
            clients_dir = os.path.join(self.config_base_path, 'clients')
            os.makedirs(clients_dir, exist_ok=True)
            
            # Calculate only the overrides (diff from default)
            default_config = self._get_default_config()
            client_overrides = self._calculate_config_diff(default_config, config)
            
            # Validate configuration structure
            if not self._validate_config_structure(client_overrides):
                raise ValueError("Invalid configuration structure")
            
            # Save client config file
            client_config_path = os.path.join(clients_dir, f'{client_id}.json')
            with open(client_config_path, 'w') as f:
                json.dump(client_overrides, f, indent=2, ensure_ascii=False)
            
            # Update cache
            self._cache[client_id] = config
            
            return True
            
        except Exception as e:
            print(f"Error saving config for {client_id}: {str(e)}")
            return False
    
    def invalidate_cache(self, client_id: Optional[str] = None) -> None:
        """Invalidate configuration cache."""
        if client_id:
            self._cache.pop(client_id, None)
        else:
            self._cache.clear()
            self._default_config = None
    
    def _load_merged_config(self, client_id: str) -> Dict[str, Any]:
        """Load and merge default and client configurations."""
        default_config = self._get_default_config()
        client_config = self._get_client_config(client_id)
        
        return self._deep_merge_configs(default_config, client_config)
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration with caching."""
        if self._default_config is None:
            default_config_path = os.path.join(self.config_base_path, 'default.json')
            try:
                with open(default_config_path, 'r') as f:
                    self._default_config = json.load(f)
            except FileNotFoundError:
                raise FileNotFoundError("Default configuration not found")
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid default configuration: {str(e)}")
        
        return self._default_config.copy()
    
    def _get_client_config(self, client_id: str) -> Dict[str, Any]:
        """Get client-specific configuration."""
        client_config_path = os.path.join(self.config_base_path, 'clients', f'{client_id}.json')
        
        if not os.path.exists(client_config_path):
            return {}
        
        try:
            with open(client_config_path, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            print(f"Warning: Invalid client configuration for {client_id}: {str(e)}")
            return {}
    
    def _deep_merge_configs(self, base_config: Dict, override_config: Dict) -> Dict:
        """Deep merge two configuration dictionaries."""
        result = base_config.copy()
        
        for key, value in override_config.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge_configs(result[key], value)
            else:
                result[key] = value
        
        return result
    
    def _calculate_config_diff(self, default_config: Dict, new_config: Dict) -> Dict:
        """Calculate differences between default and new config."""
        def diff_recursive(default: Dict, new: Dict) -> Dict:
            result = {}
            
            for key, new_value in new.items():
                if key not in default:
                    # New key not in default, include it
                    result[key] = new_value
                elif isinstance(new_value, dict) and isinstance(default[key], dict):
                    # Both are dicts, recurse
                    nested_diff = diff_recursive(default[key], new_value)
                    if nested_diff:  # Only include if there are differences
                        result[key] = nested_diff
                elif new_value != default[key]:
                    # Values are different, include the new value
                    result[key] = new_value
            
            return result
        
        return diff_recursive(default_config, new_config)
    
    def _validate_config_structure(self, config: Dict) -> bool:
        """Validate configuration structure."""
        try:
            if not isinstance(config, dict):
                return False
            
            # Validate client section
            if 'client' in config:
                client = config['client']
                if not isinstance(client, dict):
                    return False
                if 'id' in client and not isinstance(client['id'], str):
                    return False
            
            # Validate theme section
            if 'theme' in config:
                theme = config['theme']
                if not isinstance(theme, dict):
                    return False
                
                if 'colors' in theme and not isinstance(theme['colors'], dict):
                    return False
            
            # Validate UI section
            if 'ui' in config and not isinstance(config['ui'], dict):
                return False
            
            # Validate assistant section
            if 'assistant' in config:
                assistant = config['assistant']
                if not isinstance(assistant, dict):
                    return False
                
                # Validate nested structures
                for section in ['personality', 'brandVoice', 'responseSettings']:
                    if section in assistant and not isinstance(assistant[section], dict):
                        return False
            
            return True
            
        except Exception:
            return False