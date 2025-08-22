from flask import Flask, request, jsonify
from flask_cors import CORS
from model import RAG
from config_service import ConfigService
import os

app = Flask(__name__)
# Enable CORS for all domains with more permissive settings
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": "*", "expose_headers": "*"}})

# Initialize config service for managing configurations
config_service = ConfigService()

# Initialize single RAG instance with default config
default_config = config_service.get_config('dubula-default')
rag = RAG(config=default_config)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get client configuration"""
    try:
        client_id = request.args.get('client', 'dubula-default')
        config = config_service.get_config(client_id)
        return jsonify(config)
        
    except Exception as e:
        return jsonify({"error": f"Configuration error: {str(e)}"}), 500

@app.route('/api/config', methods=['PUT'])
def save_config():
    """Save client configuration"""
    try:
        data = request.json
        client_id = data.get('clientId', 'dubula-default')
        config = data.get('config', {})
        
        if not config:
            return jsonify({"error": "Configuration data is required"}), 400
        
        success = config_service.save_config(client_id, config)
        
        if success:
            # Check if model parameters changed - if so, recreate RAG instance
            new_config = config_service.get_config(client_id)
            model_params = ['docs_dir', 'n_retrievals', 'chat_max_tokens', 'model_name', 'creativeness']
            
            needs_recreation = any(
                new_config.get(param) != rag.config.get(param) 
                for param in model_params
            )
            
            if needs_recreation:
                # Recreate RAG instance with new config
                global rag
                rag = RAG(config=new_config)
            else:
                # Just update config for non-model parameters
                rag.config = new_config
            
            return jsonify({
                "message": "Configuration saved successfully",
                "clientId": client_id
            })
        else:
            return jsonify({"error": "Failed to save configuration"}), 500
        
    except Exception as e:
        return jsonify({"error": f"Failed to save configuration: {str(e)}"}), 500


@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        question = data.get('question', '')
        
        if not question:
            return jsonify({"error": "Question is required"}), 400
        
        # Get answer from single RAG instance
        result = rag.ask(question)
        
        # Handle both string and dict responses
        if isinstance(result, dict):
            return jsonify({
                "question": question,
                **result
            })
        else:
            return jsonify({
                "question": question,
                "answer": result
            })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)