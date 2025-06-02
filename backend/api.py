from flask import Flask, request, jsonify
from flask_cors import CORS
from model import RAG
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Initialize RAG system
rag = RAG(
    docs_dir='/app/docs',
    n_retrievals=4,
    chat_max_tokens=3097,
    creativeness=1.2,
)

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)