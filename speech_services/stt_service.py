import os
import logging
from typing import Optional, Dict
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from faster_whisper import WhisperModel
import tempfile
import io
import uuid
from pathlib import Path
import librosa
import numpy as np

# Configure logging per CLAUDE.md standards
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class STTConfig:
    """Configuration class to avoid magic numbers"""
    MODEL_SIZE = "medium"  # tiny, base, small, medium, large
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    COMPUTE_TYPE = "float16" if torch.cuda.is_available() else "int8"
    MAX_AUDIO_DURATION = 300  # seconds
    SUPPORTED_FORMATS = ["wav", "mp3", "m4a", "ogg", "flac"]
    SAMPLE_RATE = 16000
    CACHE_DIR = "/tmp/stt_cache"

class STTService:
    """Speech-to-Text service using Faster-Whisper with GPU acceleration"""
    
    def __init__(self):
        logger.info(f"Initializing STT service on device: {STTConfig.DEVICE}")
        
        # Initialize Faster-Whisper model
        self.model = WhisperModel(
            STTConfig.MODEL_SIZE,
            device=STTConfig.DEVICE,
            compute_type=STTConfig.COMPUTE_TYPE
        )
        
        # Language detection and transcription settings
        self.transcription_settings = {
            "beam_size": 5,
            "best_of": 5,
            "temperature": 0.0,
            "condition_on_previous_text": False
        }
        
        # Ensure cache directory exists
        Path(STTConfig.CACHE_DIR).mkdir(exist_ok=True)
        logger.info("STT service initialized successfully")
    
    def preprocess_audio(self, audio_path: str) -> Optional[str]:
        """
        Preprocess audio to ensure compatibility with Whisper
        
        Args:
            audio_path: Path to input audio file
            
        Returns:
            Path to preprocessed audio or None if failed
        """
        try:
            # Load audio with librosa (handles multiple formats)
            audio, sr = librosa.load(audio_path, sr=STTConfig.SAMPLE_RATE)
            
            # Check duration
            duration = len(audio) / sr
            if duration > STTConfig.MAX_AUDIO_DURATION:
                logger.warning(f"Audio duration {duration}s exceeds limit {STTConfig.MAX_AUDIO_DURATION}s")
                return None
            
            # Save preprocessed audio
            audio_id = str(uuid.uuid4())
            output_path = f"{STTConfig.CACHE_DIR}/{audio_id}.wav"
            
            # Normalize audio
            audio = audio / np.max(np.abs(audio))
            
            # Save as WAV for Whisper
            import soundfile as sf
            sf.write(output_path, audio, STTConfig.SAMPLE_RATE)
            
            logger.debug(f"Audio preprocessed: {duration:.2f}s duration")
            return output_path
            
        except Exception as e:
            logger.error(f"Audio preprocessing failed: {str(e)}")
            return None
    
    def transcribe_audio(self, audio_path: str, language: Optional[str] = None) -> Dict:
        """
        Transcribe audio file to text
        
        Args:
            audio_path: Path to audio file
            language: Language code (auto-detect if None)
            
        Returns:
            Dictionary with transcription results
        """
        try:
            # Preprocess audio
            processed_path = self.preprocess_audio(audio_path)
            if not processed_path:
                raise ValueError("Audio preprocessing failed")
            
            logger.debug(f"Transcribing audio with language: {language or 'auto-detect'}")
            
            # Transcribe with Faster-Whisper
            segments, info = self.model.transcribe(
                processed_path,
                language=language,
                **self.transcription_settings
            )
            
            # Collect transcription results
            transcription_text = ""
            segment_details = []
            
            for segment in segments:
                transcription_text += segment.text + " "
                segment_details.append({
                    "start": round(segment.start, 2),
                    "end": round(segment.end, 2),
                    "text": segment.text.strip(),
                    "confidence": round(segment.avg_logprob, 3)
                })
            
            result = {
                "text": transcription_text.strip(),
                "language": info.language,
                "language_probability": round(info.language_probability, 3),
                "duration": round(info.duration, 2),
                "segments": segment_details
            }
            
            logger.info(f"Transcription completed: {len(transcription_text)} characters")
            
            # Cleanup preprocessed file
            try:
                os.unlink(processed_path)
            except:
                pass
            
            return result
            
        except Exception as e:
            logger.error(f"Transcription failed: {str(e)}")
            raise
    
    def get_supported_languages(self) -> list:
        """Get list of supported languages"""
        return [
            "en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh",
            "ar", "tr", "pl", "ca", "nl", "sv", "he", "da", "fi", "uk"
        ]

# Flask application
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": "*", "expose_headers": "*"}})

# Initialize STT service
stt_service = STTService()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "device": STTConfig.DEVICE,
        "model_size": STTConfig.MODEL_SIZE,
        "service": "stt"
    })

@app.route('/languages', methods=['GET'])
def get_languages():
    """Get supported languages"""
    try:
        languages = stt_service.get_supported_languages()
        return jsonify({"languages": languages})
    except Exception as e:
        logger.error(f"Failed to get languages: {str(e)}")
        return jsonify({"error": "Failed to retrieve languages"}), 500

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Transcribe audio to text"""
    try:
        # Check if audio file is present
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "No audio file selected"}), 400
        
        # Get optional language parameter
        language = request.form.get('language', None)
        if language == 'auto':
            language = None
        
        # Validate file format
        file_ext = audio_file.filename.split('.')[-1].lower()
        if file_ext not in STTConfig.SUPPORTED_FORMATS:
            return jsonify({
                "error": f"Unsupported format. Use: {STTConfig.SUPPORTED_FORMATS}"
            }), 400
        
        # Save uploaded file temporarily
        audio_id = str(uuid.uuid4())
        temp_path = f"{STTConfig.CACHE_DIR}/{audio_id}.{file_ext}"
        audio_file.save(temp_path)
        
        try:
            # Transcribe audio
            result = stt_service.transcribe_audio(temp_path, language)
            return jsonify(result)
            
        finally:
            # Cleanup temp file
            try:
                os.unlink(temp_path)
            except:
                pass
        
    except Exception as e:
        logger.error(f"Transcription endpoint error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/transcribe_url', methods=['POST'])
def transcribe_url():
    """Transcribe audio from URL"""
    try:
        data = request.json
        audio_url = data.get('url', '')
        language = data.get('language', None)
        
        if not audio_url:
            return jsonify({"error": "Audio URL is required"}), 400
        
        # Download and transcribe (implementation would require additional libraries)
        return jsonify({"error": "URL transcription not implemented yet"}), 501
        
    except Exception as e:
        logger.error(f"URL transcription error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8002, debug=False)