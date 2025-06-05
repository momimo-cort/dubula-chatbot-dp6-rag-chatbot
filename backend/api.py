from flask import Flask, request, jsonify
from flask_cors import CORS
from model import RAG
import os
import requests
import logging

# Configure logging per CLAUDE.md standards
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Enable CORS for all domains with more permissive settings
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": "*", "expose_headers": "*"}})

# Initialize RAG system
rag = RAG(
    docs_dir='/app/docs',
    n_retrievals=4,
    chat_max_tokens=3097,
    creativeness=1.2,
)

# Speech service URLs (configured via environment variables)
TTS_SERVICE_URL = os.getenv('TTS_SERVICE_URL', 'http://tts-service:8001')
STT_SERVICE_URL = os.getenv('STT_SERVICE_URL', 'http://stt-service:8002')

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        question = data.get('question', '')
        
        if not question:
            return jsonify({"error": "Question is required"}), 400
        
        answer = rag.ask(question)
        
        return jsonify({
            "question": question,
            "answer": answer
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/speech/tts', methods=['POST'])
def text_to_speech():
    """Convert text to speech using TTS service"""
    try:
        data = request.json
        text = data.get('text', '')
        voice = data.get('voice', 'neutral')
        format = data.get('format', 'wav')
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        # Forward request to TTS service
        response = requests.post(
            f"{TTS_SERVICE_URL}/synthesize",
            json={"text": text, "voice": voice, "format": format},
            timeout=30
        )
        
        if response.status_code == 200:
            return response.content, 200, {
                'Content-Type': f'audio/{format}',
                'Content-Disposition': f'attachment; filename=speech.{format}'
            }
        else:
            logger.error(f"TTS service error: {response.status_code}")
            return jsonify({"error": "TTS service unavailable"}), 503
            
    except requests.exceptions.RequestException as e:
        logger.error(f"TTS service connection error: {str(e)}")
        return jsonify({"error": "TTS service unavailable"}), 503
    except Exception as e:
        logger.error(f"TTS endpoint error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/speech/stt', methods=['POST'])
def speech_to_text():
    """Convert speech to text using STT service"""
    try:
        # Check if audio file is present
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        language = request.form.get('language', 'auto')
        
        # Forward request to STT service
        files = {'audio': (audio_file.filename, audio_file.stream, audio_file.content_type)}
        data = {'language': language}
        
        response = requests.post(
            f"{STT_SERVICE_URL}/transcribe",
            files=files,
            data=data,
            timeout=60
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"STT service error: {response.status_code}")
            return jsonify({"error": "STT service unavailable"}), 503
            
    except requests.exceptions.RequestException as e:
        logger.error(f"STT service connection error: {str(e)}")
        return jsonify({"error": "STT service unavailable"}), 503
    except Exception as e:
        logger.error(f"STT endpoint error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/speech/voices', methods=['GET'])
def get_voices():
    """Get available TTS voices"""
    try:
        response = requests.get(f"{TTS_SERVICE_URL}/voices", timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            return jsonify({"error": "TTS service unavailable"}), 503
    except Exception as e:
        logger.error(f"Voices endpoint error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/speech/languages', methods=['GET'])
def get_languages():
    """Get available STT languages"""
    try:
        response = requests.get(f"{STT_SERVICE_URL}/languages", timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            return jsonify({"error": "STT service unavailable"}), 503
    except Exception as e:
        logger.error(f"Languages endpoint error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/chat_with_speech', methods=['POST'])
def chat_with_speech():
    """Complete chat pipeline: STT -> RAG -> TTS"""
    try:
        # Handle audio input if provided
        if 'audio' in request.files:
            # Transcribe audio to text
            audio_file = request.files['audio']
            language = request.form.get('language', 'auto')
            voice = request.form.get('voice', 'neutral')
            
            files = {'audio': (audio_file.filename, audio_file.stream, audio_file.content_type)}
            data = {'language': language}
            
            stt_response = requests.post(
                f"{STT_SERVICE_URL}/transcribe",
                files=files,
                data=data,
                timeout=60
            )
            
            if stt_response.status_code != 200:
                return jsonify({"error": "Speech transcription failed"}), 500
            
            question = stt_response.json().get('text', '')
        else:
            # Handle text input
            data = request.json or {}
            question = data.get('question', '')
            voice = data.get('voice', 'neutral')
        
        if not question:
            return jsonify({"error": "Question is required"}), 400
        
        # Get answer from RAG
        answer = rag.ask(question)
        
        # Convert answer to speech
        tts_response = requests.post(
            f"{TTS_SERVICE_URL}/synthesize",
            json={"text": answer, "voice": voice, "format": "wav"},
            timeout=30
        )
        
        if tts_response.status_code != 200:
            return jsonify({
                "question": question,
                "answer": answer,
                "audio_error": "TTS generation failed"
            })
        
        # Return both text and audio
        return jsonify({
            "question": question,
            "answer": answer,
            "has_audio": True
        }), 200, {
            'X-Audio-Content': 'available'
        }
        
    except Exception as e:
        logger.error(f"Chat with speech error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)