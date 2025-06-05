import os
import logging
from typing import Dict, Optional
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import torch
from TTS.api import TTS
import tempfile
import io
import uuid
from pathlib import Path

# Configure logging per CLAUDE.md standards
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TTSConfig:
    """Configuration class to avoid magic numbers"""
    DEFAULT_SPEAKER = "female_1"
    SAMPLE_RATE = 22050
    SUPPORTED_FORMATS = ["wav", "mp3"]
    MAX_TEXT_LENGTH = 1000
    CACHE_DIR = "/tmp/tts_cache"

class TTSService:
    """Text-to-Speech service with configurable voices and accents"""
    
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Initializing TTS service on device: {self.device}")
        
        # Initialize Coqui TTS with multilingual model
        self.tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(self.device)
        
        # Available voices/accents configuration
        self.voice_configs = {
            "american_female": {"speaker": "Ana Florence", "language": "en"},
            "american_male": {"speaker": "Craig Gutsy", "language": "en"},
            "british_female": {"speaker": "Kathleen", "language": "en"},
            "south_african": {"speaker": "Daisy", "language": "en"},
            "neutral": {"speaker": "Ana Florence", "language": "en"}
        }
        
        # Ensure cache directory exists
        Path(TTSConfig.CACHE_DIR).mkdir(exist_ok=True)
        logger.info("TTS service initialized successfully")
    
    def synthesize_speech(self, text: str, voice: str = "neutral", 
                         format: str = "wav") -> Optional[str]:
        """
        Synthesize speech from text with specified voice/accent
        
        Args:
            text: Text to synthesize
            voice: Voice/accent identifier
            format: Output format (wav/mp3)
            
        Returns:
            Path to generated audio file or None if failed
        """
        try:
            if len(text) > TTSConfig.MAX_TEXT_LENGTH:
                raise ValueError(f"Text too long. Max {TTSConfig.MAX_TEXT_LENGTH} characters")
            
            if voice not in self.voice_configs:
                logger.warning(f"Unknown voice '{voice}', using default")
                voice = "neutral"
            
            voice_config = self.voice_configs[voice]
            
            # Generate unique filename
            audio_id = str(uuid.uuid4())
            output_path = f"{TTSConfig.CACHE_DIR}/{audio_id}.{format}"
            
            # Synthesize speech
            logger.debug(f"Synthesizing text with voice '{voice}': {text[:50]}...")
            
            self.tts.tts_to_file(
                text=text,
                speaker=voice_config["speaker"],
                language=voice_config["language"],
                file_path=output_path
            )
            
            logger.info(f"Speech synthesized successfully: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"TTS synthesis failed: {str(e)}")
            return None
    
    def get_available_voices(self) -> Dict[str, Dict]:
        """Get list of available voices/accents"""
        return self.voice_configs

# Flask application
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": "*", "expose_headers": "*"}})

# Initialize TTS service
tts_service = TTSService()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "device": tts_service.device,
        "service": "tts"
    })

@app.route('/voices', methods=['GET'])
def get_voices():
    """Get available voices/accents"""
    try:
        voices = tts_service.get_available_voices()
        return jsonify({"voices": voices})
    except Exception as e:
        logger.error(f"Failed to get voices: {str(e)}")
        return jsonify({"error": "Failed to retrieve voices"}), 500

@app.route('/synthesize', methods=['POST'])
def synthesize():
    """Synthesize text to speech"""
    try:
        data = request.json
        text = data.get('text', '')
        voice = data.get('voice', 'neutral')
        format = data.get('format', 'wav')
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        if format not in TTSConfig.SUPPORTED_FORMATS:
            return jsonify({"error": f"Format must be one of {TTSConfig.SUPPORTED_FORMATS}"}), 400
        
        # Synthesize speech
        audio_path = tts_service.synthesize_speech(text, voice, format)
        
        if not audio_path:
            return jsonify({"error": "Speech synthesis failed"}), 500
        
        # Return audio file
        return send_file(
            audio_path,
            as_attachment=True,
            download_name=f"speech.{format}",
            mimetype=f"audio/{format}"
        )
        
    except Exception as e:
        logger.error(f"Synthesis endpoint error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001, debug=False)