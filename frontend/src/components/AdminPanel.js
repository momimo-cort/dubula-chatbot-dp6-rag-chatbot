import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './AdminPanel.css';

const AdminPanel = ({ isOpen, onClose, clientId }) => {
  const { config, reloadConfig } = useTheme();
  const [formData, setFormData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('branding');
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData(JSON.parse(JSON.stringify(config))); // Deep copy
    }
  }, [config]);

  const handleInputChange = (path, value) => {
    if (!formData) return;

    const pathArray = path.split('.');
    const newFormData = JSON.parse(JSON.stringify(formData));
    
    let current = newFormData;
    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {};
      }
      current = current[pathArray[i]];
    }
    
    current[pathArray[pathArray.length - 1]] = value;
    setFormData(newFormData);

    // Apply preview changes immediately if preview mode is on
    if (previewMode) {
      applyPreviewChanges(newFormData);
    }
  };

  const applyPreviewChanges = (data) => {
    const root = document.documentElement;
    
    // Apply color changes
    if (data.theme?.colors) {
      Object.entries(data.theme.colors).forEach(([key, value]) => {
        if (typeof value === 'string') {
          root.style.setProperty(`--color-${key}`, value);
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([subKey, subValue]) => {
            root.style.setProperty(`--color-${key}-${subKey}`, subValue);
          });
        }
      });
    }

    // Apply typography changes
    if (data.theme?.typography) {
      const { fontFamily, fontSize } = data.theme.typography;
      if (fontFamily) {
        Object.entries(fontFamily).forEach(([key, value]) => {
          root.style.setProperty(`--font-family-${key}`, value);
        });
      }
      if (fontSize) {
        Object.entries(fontSize).forEach(([key, value]) => {
          root.style.setProperty(`--font-size-${key}`, value);
        });
      }
    }

    // Apply other theme properties
    if (data.theme?.borderRadius) {
      root.style.setProperty('--border-radius', data.theme.borderRadius);
    }
    if (data.theme?.spacing?.unit) {
      root.style.setProperty('--spacing-unit', `${data.theme.spacing.unit}px`);
    }
  };

  const handleSave = async () => {
    if (!formData) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: clientId || 'dubula-default',
          config: formData
        })
      });

      if (response.ok) {
        await reloadConfig();
        alert('Configuration saved successfully!');
        if (previewMode) {
          setPreviewMode(false);
        }
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      alert(`Error saving configuration: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setFormData(JSON.parse(JSON.stringify(config)));
      if (previewMode) {
        reloadConfig(); // Reset preview
      }
    }
  };

  const togglePreview = () => {
    if (previewMode) {
      // Turn off preview mode - reload original config
      reloadConfig();
    } else {
      // Turn on preview mode - apply current form data
      applyPreviewChanges(formData);
    }
    setPreviewMode(!previewMode);
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="admin-panel-overlay">
      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Configuration Manager</h2>
          <div className="admin-panel__header-actions">
            <button
              className={`btn-outline ${previewMode ? 'active' : ''}`}
              onClick={togglePreview}
            >
              {previewMode ? '👁️ Preview ON' : '👁️ Preview OFF'}
            </button>
            <button className="btn-outline" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="admin-panel__tabs">
          <button
            className={`admin-tab ${activeTab === 'branding' ? 'active' : ''}`}
            onClick={() => setActiveTab('branding')}
          >
            🎨 Branding
          </button>
          <button
            className={`admin-tab ${activeTab === 'theme' ? 'active' : ''}`}
            onClick={() => setActiveTab('theme')}
          >
            🎭 Theme
          </button>
          <button
            className={`admin-tab ${activeTab === 'ui' ? 'active' : ''}`}
            onClick={() => setActiveTab('ui')}
          >
            🖥️ UI Settings
          </button>
          <button
            className={`admin-tab ${activeTab === 'assistant' ? 'active' : ''}`}
            onClick={() => setActiveTab('assistant')}
          >
            🤖 Assistant
          </button>
          <button
            className={`admin-tab ${activeTab === 'model' ? 'active' : ''}`}
            onClick={() => setActiveTab('model')}
          >
            🧠 Model
          </button>
          <button
            className={`admin-tab ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            ⚙️ Advanced
          </button>
        </div>

        <div className="admin-panel__content">
          {activeTab === 'branding' && (
            <div className="admin-section">
              <h3>Brand Identity</h3>
              
              <div className="form-group">
                <label>Application Name</label>
                <input
                  type="text"
                  className="input-themed"
                  value={formData.branding?.appName || ''}
                  onChange={(e) => handleInputChange('branding.appName', e.target.value)}
                  placeholder="Your App Name"
                />
              </div>

              <div className="form-group">
                <label>Tagline</label>
                <input
                  type="text"
                  className="input-themed"
                  value={formData.branding?.tagline || ''}
                  onChange={(e) => handleInputChange('branding.tagline', e.target.value)}
                  placeholder="Your company tagline"
                />
              </div>

              <div className="form-group">
                <label>Bot Name</label>
                <input
                  type="text"
                  className="input-themed"
                  value={formData.branding?.botName || ''}
                  onChange={(e) => handleInputChange('branding.botName', e.target.value)}
                  placeholder="AI Assistant Name (e.g., Alexandra, Marcus, etc.)"
                />
              </div>

              <div className="form-group">
                <label>Logo URL</label>
                <input
                  type="text"
                  className="input-themed"
                  value={formData.branding?.logo?.primary || ''}
                  onChange={(e) => handleInputChange('branding.logo.primary', e.target.value)}
                  placeholder="/assets/logos/your-logo.png"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Logo Width (px)</label>
                  <input
                    type="number"
                    className="input-themed"
                    value={formData.branding?.logo?.width || 120}
                    onChange={(e) => handleInputChange('branding.logo.width', parseInt(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>Logo Height (px)</label>
                  <input
                    type="number"
                    className="input-themed"
                    value={formData.branding?.logo?.height || 40}
                    onChange={(e) => handleInputChange('branding.logo.height', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="admin-section">
              <h3>Color Scheme</h3>
              
              <div className="color-grid">
                <div className="form-group">
                  <label>Primary Color</label>
                  <input
                    type="color"
                    className="color-input"
                    value={formData.theme?.colors?.primary || '#8B4513'}
                    onChange={(e) => handleInputChange('theme.colors.primary', e.target.value)}
                  />
                  <input
                    type="text"
                    className="input-themed color-text"
                    value={formData.theme?.colors?.primary || '#8B4513'}
                    onChange={(e) => handleInputChange('theme.colors.primary', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Secondary Color</label>
                  <input
                    type="color"
                    className="color-input"
                    value={formData.theme?.colors?.secondary || '#DAA520'}
                    onChange={(e) => handleInputChange('theme.colors.secondary', e.target.value)}
                  />
                  <input
                    type="text"
                    className="input-themed color-text"
                    value={formData.theme?.colors?.secondary || '#DAA520'}
                    onChange={(e) => handleInputChange('theme.colors.secondary', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Accent Color</label>
                  <input
                    type="color"
                    className="color-input"
                    value={formData.theme?.colors?.accent || '#FF6347'}
                    onChange={(e) => handleInputChange('theme.colors.accent', e.target.value)}
                  />
                  <input
                    type="text"
                    className="input-themed color-text"
                    value={formData.theme?.colors?.accent || '#FF6347'}
                    onChange={(e) => handleInputChange('theme.colors.accent', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Background Color</label>
                  <input
                    type="color"
                    className="color-input"
                    value={formData.theme?.colors?.background || '#FFF8DC'}
                    onChange={(e) => handleInputChange('theme.colors.background', e.target.value)}
                  />
                  <input
                    type="text"
                    className="input-themed color-text"
                    value={formData.theme?.colors?.background || '#FFF8DC'}
                    onChange={(e) => handleInputChange('theme.colors.background', e.target.value)}
                  />
                </div>
              </div>

              <h3>Typography</h3>
              
              <div className="form-group">
                <label>Primary Font Family</label>
                <select
                  className="input-themed"
                  value={formData.theme?.typography?.fontFamily?.primary || ''}
                  onChange={(e) => handleInputChange('theme.typography.fontFamily.primary', e.target.value)}
                >
                  <option value="Inter, -apple-system, BlinkMacSystemFont, sans-serif">Inter (Default)</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Helvetica, sans-serif">Helvetica</option>
                  <option value="'Open Sans', sans-serif">Open Sans</option>
                  <option value="'Roboto', sans-serif">Roboto</option>
                  <option value="'Lato', sans-serif">Lato</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                </select>
              </div>

              <div className="form-group">
                <label>Heading Font Family</label>
                <select
                  className="input-themed"
                  value={formData.theme?.typography?.fontFamily?.heading || ''}
                  onChange={(e) => handleInputChange('theme.typography.fontFamily.heading', e.target.value)}
                >
                  <option value="'Playfair Display', Georgia, serif">Playfair Display (Default)</option>
                  <option value="'Montserrat', sans-serif">Montserrat</option>
                  <option value="'Roboto Slab', serif">Roboto Slab</option>
                  <option value="'Source Sans Pro', sans-serif">Source Sans Pro</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Arial, sans-serif">Arial</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'ui' && (
            <div className="admin-section">
              <h3>Chat Interface</h3>
              
              <div className="form-group">
                <label>Welcome Message</label>
                <textarea
                  className="input-themed"
                  rows={3}
                  value={formData.ui?.chat?.welcomeMessage || ''}
                  onChange={(e) => handleInputChange('ui.chat.welcomeMessage', e.target.value)}
                  placeholder="Welcome message shown to users"
                />
              </div>

              <div className="form-group">
                <label>Input Placeholder</label>
                <input
                  type="text"
                  className="input-themed"
                  value={formData.ui?.chat?.placeholder || ''}
                  onChange={(e) => handleInputChange('ui.chat.placeholder', e.target.value)}
                  placeholder="Placeholder text for chat input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.ui?.chat?.showTimestamps || false}
                      onChange={(e) => handleInputChange('ui.chat.showTimestamps', e.target.checked)}
                    />
                    Show Timestamps
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.ui?.chat?.showTypingIndicator || false}
                      onChange={(e) => handleInputChange('ui.chat.showTypingIndicator', e.target.checked)}
                    />
                    Show Typing Indicator
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.ui?.chat?.allowFileUploads || false}
                    onChange={(e) => handleInputChange('ui.chat.allowFileUploads', e.target.checked)}
                  />
                  Allow File Uploads
                </label>
              </div>
            </div>
          )}

          {activeTab === 'assistant' && (
            <div className="admin-section">
              <h3>Bot Personality</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Tone</label>
                  <select
                    className="input-themed"
                    value={formData.assistant?.personality?.tone || 'helpful'}
                    onChange={(e) => handleInputChange('assistant.personality.tone', e.target.value)}
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                    <option value="enthusiastic">Enthusiastic</option>
                    <option value="helpful">Helpful</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Communication Style</label>
                  <select
                    className="input-themed"
                    value={formData.assistant?.personality?.style || 'conversational'}
                    onChange={(e) => handleInputChange('assistant.personality.style', e.target.value)}
                  >
                    <option value="concise">Concise</option>
                    <option value="detailed">Detailed</option>
                    <option value="conversational">Conversational</option>
                    <option value="technical">Technical</option>
                    <option value="educational">Educational</option>
                    <option value="supportive">Supportive</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Formality Level</label>
                <select
                  className="input-themed"
                  value={formData.assistant?.personality?.formality || 'balanced'}
                  onChange={(e) => handleInputChange('assistant.personality.formality', e.target.value)}
                >
                  <option value="very_formal">Very Formal</option>
                  <option value="formal">Formal</option>
                  <option value="balanced">Balanced</option>
                  <option value="informal">Informal</option>
                  <option value="very_informal">Very Informal</option>
                </select>
              </div>

              <h3>Brand Voice</h3>
              
              <div className="form-group">
                <label>Brand Voice Description</label>
                <textarea
                  className="input-themed"
                  rows={3}
                  value={formData.assistant?.brandVoice?.description || ''}
                  onChange={(e) => handleInputChange('assistant.brandVoice.description', e.target.value)}
                  placeholder="Describe the personality and voice of your assistant (e.g., 'Sophisticated hospitality expert focused on luxury service')"
                />
              </div>

              <div className="form-group">
                <label>Key Personality Traits</label>
                <input
                  type="text"
                  className="input-themed"
                  value={(formData.assistant?.brandVoice?.keyTraits || []).join(', ')}
                  onChange={(e) => handleInputChange('assistant.brandVoice.keyTraits', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                  placeholder="knowledgeable, approachable, professional, detail-oriented"
                />
                <small className="form-help">Separate traits with commas</small>
              </div>

              <div className="form-group">
                <label>Do's - What the assistant should do</label>
                <textarea
                  className="input-themed"
                  rows={4}
                  value={(formData.assistant?.brandVoice?.dosList || []).join('\n')}
                  onChange={(e) => handleInputChange('assistant.brandVoice.dosList', e.target.value.split('\n').filter(s => s.trim()))}
                  placeholder="Provide clear, actionable advice&#10;Use industry-specific terminology appropriately&#10;Be encouraging and supportive"
                />
                <small className="form-help">One guideline per line</small>
              </div>

              <div className="form-group">
                <label>Don'ts - What the assistant should avoid</label>
                <textarea
                  className="input-themed"
                  rows={4}
                  value={(formData.assistant?.brandVoice?.dontsList || []).join('\n')}
                  onChange={(e) => handleInputChange('assistant.brandVoice.dontsList', e.target.value.split('\n').filter(s => s.trim()))}
                  placeholder="Give advice that could compromise safety&#10;Be overly technical or intimidating&#10;Provide information outside the domain"
                />
                <small className="form-help">One guideline per line</small>
              </div>

              <div className="form-group">
                <label>Sample Phrases</label>
                <textarea
                  className="input-themed"
                  rows={3}
                  value={(formData.assistant?.brandVoice?.samplePhrases || []).join('\n')}
                  onChange={(e) => handleInputChange('assistant.brandVoice.samplePhrases', e.target.value.split('\n').filter(s => s.trim()))}
                  placeholder="Let me help you with that!&#10;Here's the best practice for this situation...&#10;I'd recommend following these steps..."
                />
                <small className="form-help">Example phrases that reflect your brand voice</small>
              </div>

              <h3>Response Settings</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Response Length</label>
                  <select
                    className="input-themed"
                    value={formData.assistant?.responseSettings?.maxLength || 'medium'}
                    onChange={(e) => handleInputChange('assistant.responseSettings.maxLength', e.target.value)}
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                    <option value="comprehensive">Comprehensive</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.assistant?.responseSettings?.includeExamples || false}
                      onChange={(e) => handleInputChange('assistant.responseSettings.includeExamples', e.target.checked)}
                    />
                    Include Examples
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.assistant?.responseSettings?.useEmojis || false}
                      onChange={(e) => handleInputChange('assistant.responseSettings.useEmojis', e.target.checked)}
                    />
                    Use Emojis
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.assistant?.responseSettings?.askFollowUpQuestions || false}
                    onChange={(e) => handleInputChange('assistant.responseSettings.askFollowUpQuestions', e.target.checked)}
                  />
                  Ask Follow-up Questions
                </label>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.assistant?.responseSettings?.showPrompt || false}
                    onChange={(e) => handleInputChange('assistant.responseSettings.showPrompt', e.target.checked)}
                  />
                  Show Prompt (Debug)
                </label>
                <small className="form-help">Display the full system prompt in chat responses for debugging purposes</small>
              </div>
            </div>
          )}

          {activeTab === 'model' && (
            <div className="admin-section">
              <h3>RAG Model Configuration</h3>
              
              <div className="form-group">
                <label>Documents Directory</label>
                <input
                  type="text"
                  className="input-themed"
                  value={formData.docs_dir || '/app/docs'}
                  onChange={(e) => handleInputChange('docs_dir', e.target.value)}
                  placeholder="/app/docs"
                />
                <small className="form-help">Path to the directory containing training documents</small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Number of Retrievals</label>
                  <input
                    type="number"
                    className="input-themed"
                    min="1"
                    max="20"
                    value={formData.n_retrievals || 4}
                    onChange={(e) => handleInputChange('n_retrievals', parseInt(e.target.value))}
                  />
                  <small className="form-help">How many relevant documents to retrieve for context</small>
                </div>
                
                <div className="form-group">
                  <label>Chat Max Tokens</label>
                  <input
                    type="number"
                    className="input-themed"
                    min="1000"
                    max="8000"
                    value={formData.chat_max_tokens || 3097}
                    onChange={(e) => handleInputChange('chat_max_tokens', parseInt(e.target.value))}
                  />
                  <small className="form-help">Maximum tokens for chat history memory</small>
                </div>
              </div>

              <h3>AI Model Settings</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Model Name</label>
                  <select
                    className="input-themed"
                    value={formData.model_name || 'gpt-3.5-turbo'}
                    onChange={(e) => handleInputChange('model_name', e.target.value)}
                  >
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                  </select>
                  <small className="form-help">OpenAI model to use for responses</small>
                </div>
                
                <div className="form-group">
                  <label>Creativeness (Temperature)</label>
                  <input
                    type="range"
                    className="range-input"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.creativeness || 0.7}
                    onChange={(e) => handleInputChange('creativeness', parseFloat(e.target.value))}
                  />
                  <div className="range-value">
                    {formData.creativeness || 0.7}
                  </div>
                  <small className="form-help">Controls randomness: 0 = deterministic, 2 = very creative</small>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.debug_mode || false}
                    onChange={(e) => handleInputChange('debug_mode', e.target.checked)}
                  />
                  Debug Mode
                </label>
                <small className="form-help">Enable detailed logging and debug information</small>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="admin-section">
              <h3>Advanced Settings</h3>
              
              <div className="form-group">
                <label>Border Radius</label>
                <input
                  type="text"
                  className="input-themed"
                  value={formData.theme?.borderRadius || '8px'}
                  onChange={(e) => handleInputChange('theme.borderRadius', e.target.value)}
                  placeholder="8px"
                />
              </div>

              <div className="form-group">
                <label>Spacing Unit (px)</label>
                <input
                  type="number"
                  className="input-themed"
                  value={formData.theme?.spacing?.unit || 8}
                  onChange={(e) => handleInputChange('theme.spacing.unit', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Animation Duration</label>
                <input
                  type="text"
                  className="input-themed"
                  value={formData.ui?.animations?.duration || '0.2s'}
                  onChange={(e) => handleInputChange('ui.animations.duration', e.target.value)}
                  placeholder="0.2s"
                />
              </div>

              <div className="json-editor">
                <label>Raw JSON Configuration</label>
                <textarea
                  className="input-themed json-textarea"
                  rows={15}
                  value={JSON.stringify(formData, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData(parsed);
                    } catch (error) {
                      // Invalid JSON, don't update
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="admin-panel__footer">
          <button 
            className="btn-outline"
            onClick={handleReset}
            disabled={isSaving}
          >
            Reset Changes
          </button>
          <button 
            className="btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;