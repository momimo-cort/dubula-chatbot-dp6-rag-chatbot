# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Philosophy

When implementing code in this repository, adopt the persona of a seasoned software engineer with architecture expertise. Follow these principles:

- **Best Practices**: Apply industry-standard patterns and practices
- **Compartmentalization**: Separate concerns with clear module boundaries
- **No Magic Numbers**: Use named constants and configuration variables
- **Elegant Solutions**: Prioritize clean, maintainable, and scalable implementations
- **Code Quality**: Write self-documenting code with proper abstractions
- **Documentation**: Update this CLAUDE.md file with any major architectural changes or with every commit that affects the system structure

## Refactoring Discipline

**CRITICAL**: When making architectural changes, follow this systematic approach to prevent inconsistencies:

### Before Any Refactor:
1. **Map all dependencies** - Search codebase for all usage patterns:
   ```bash
   grep -r "pattern_to_change" --include="*.py" .
   rg "class_name\(" --type py
   ```
2. **Document the change scope** - List every file that needs updating
3. **Plan the order** - Core classes first, then dependents

### During Refactor:
1. **Change all call sites atomically** - Never leave half-updated code
2. **Update type annotations** - Use the type system to catch inconsistencies
3. **Verify each change immediately** - Don't batch multiple unverified changes

### After Refactor:
1. **Run tests** - Even basic instantiation tests catch constructor mismatches
2. **Search for orphaned patterns** - Look for old code patterns that should have been updated
3. **Update this CLAUDE.md** - Document the new patterns and what changed

## Architecture Overview

This is a RAG (Retrieval-Augmented Generation) chatbot system called "Dubula" designed for restaurant training assistance. The system consists of:

- **Backend**: Python Flask API using LangChain + OpenAI for RAG implementation
- **Frontend**: React application for chat interface
- **Vector Database**: Milvus for document embeddings storage
- **Documents**: PDF training manuals stored in `/docs/manuals/`
- **Containerization**: Full Docker Compose setup with Nginx reverse proxy

### Key Components

- `backend/config_service.py`: **NEW** - Centralized configuration management service
- `backend/model.py`: Core RAG class implementation (uses ConfigService)
- `backend/api.py`: Flask REST API with `/api/chat` and `/api/health` endpoints (uses ConfigService)
- `frontend/src/components/ChatInterface.js`: Main chat UI component
- `docs/manuals/`: Training PDF documents for restaurant operations
- `nginx.conf`: Routes frontend (port 3000) and backend API (port 8000)

### Configuration Architecture (Updated)

**IMPORTANT**: Configuration is passed as a dictionary to RAG:

```python
# Correct pattern - RAG takes config dictionary
config_service = ConfigService()
config = config_service.get_config('client-name')
rag = RAG(config=config)

# All parameters come from config with sensible defaults:
# - docs_dir (default: '/app/docs')
# - n_retrievals (default: 4)
# - chat_max_tokens (default: 3097)
# - model_name (default: 'gpt-3.5-turbo')
# - creativeness (default: 0.7)
```

**Configuration Flow**:
1. `ConfigService` loads and merges default.json + client-specific configs
2. Single RAG instance receives config dictionary on initialization
3. When config changes, `rag.config` is updated directly
4. Admin panel saves configs through `ConfigService.save_config()` and updates `rag.config`

## Development Commands

### Local Development (without Docker)

Backend:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r ../requirements.txt
python api.py  # Runs on port 8000
```

Frontend:
```bash
cd frontend
npm install
npm start  # Runs on port 3000
```

### Docker Development

Start all services:
```bash
docker-compose up --build
```

Individual services:
```bash
docker-compose up milvus-standalone  # Vector database
docker-compose up rag-chatbot       # Backend API
docker-compose up frontend          # React app
```

### Environment Setup

Create `.env` file in root directory:
```bash
OPENAI_API_KEY=""
MILVUS_HOST="localhost"  # or "milvus-standalone" for Docker
MILVUS_PORT="19530"
```

## Service Ports

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Milvus: localhost:19530
- MinIO Console: http://localhost:9001

## Document Management

Training documents are stored in `/docs/manuals/` and automatically indexed by the RAG system. The system supports PDF files and includes restaurant service training manuals.

## API Endpoints

- `POST /api/chat`: Send questions, receive answers
- `GET /api/health`: Health check

Request format for chat:
```json
{
  "question": "How should I greet customers?"
}
```

## Multi-Client Customization Roadmap

The following features should be implemented to make this platform customizable for different clients and industries:

### Content & Knowledge Base
- Design configurable document sources and file type handling per client
- Implement industry-specific terminology and custom glossaries system
- Create flexible content categorization and tagging system
- Add multi-language document processing and response support

### Branding & UI
- Build customizable branding system (logo, colors, fonts, themes)
- Make application name and welcome messages configurable
- Design flexible chat interface layout with configurable components

### Functional Behavior
- Implement configurable response style settings (tone, depth, length)
- Make retrieval parameters configurable (document count, similarity thresholds)
- Add AI model settings configuration (temperature, max tokens, model selection)
- Create industry-specific prompt templates and response formatting

### Access Control & Security
- Implement authentication methods integration (SSO, LDAP, custom)
- Design user roles and permission system
- Build multi-tenant data isolation system
- Add compliance settings for GDPR, HIPAA, and industry requirements

### Integration Points
- Create custom API endpoints and webhook system
- Implement configurable export formats and reporting
- Build configurable notification and communication systems