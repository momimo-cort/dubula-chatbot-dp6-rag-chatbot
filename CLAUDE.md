# Coding Standards and Architectural Principles

## Core Principles

### 1. Compartmentalization
- Each module/class should have a single, well-defined responsibility
- Avoid tight coupling between components
- Use dependency injection instead of hardcoded dependencies
- Keep business logic separate from infrastructure concerns

### 2. Clean Architecture
- **Single Responsibility Principle**: One reason to change per class/module
- **Interface Segregation**: Define clear contracts between components
- **Dependency Inversion**: Depend on abstractions, not concretions
- **Open/Closed Principle**: Open for extension, closed for modification

### 3. Error Handling
- Handle errors at appropriate levels without unnecessary propagation
- Use specific exception types rather than generic exceptions
- Log errors with appropriate context and severity levels
- Implement proper resource cleanup (use context managers where applicable)
- **No fallback methods**: Fail explicitly when required data is missing rather than implementing fallback logic

### 4. Configuration Management
- Externalize all configuration (environment variables, config files)
- Avoid hardcoded values in business logic
- Use type hints for configuration parameters
- Provide sensible defaults where appropriate
- **No Magic Numbers**: All numeric constants must be defined in configuration classes or constants modules (e.g., `DatabaseConfig.EMBEDDING_DIMENSIONS` instead of hardcoded `256`)

### 5. Logging Standards
- **DEBUG**: Detailed tracing for development/debugging
- **INFO**: Normal operation events (start/stop, connections)
- **WARNING**: Recoverable issues that should be noted
- **ERROR**: Serious problems that affect functionality
- Use structured logging with consistent format
- Include relevant context in log messages

### 6. Code Quality
- Use type hints for all function parameters and return values
- Follow PEP 8 style guidelines
- Keep functions small and focused
- Use descriptive variable and function names
- Add docstrings for public methods and classes

### 7. Testing and Validation
- Write testable code by avoiding side effects
- Use dependency injection to enable mocking
- Separate pure functions from I/O operations
- Validate inputs at module boundaries

## Project-Specific Guidelines

### Settings Storage
- All application settings (heatmap kernel size, sensor colors, etc.) MUST be stored in the database, not files or localStorage
- Create a dedicated `settings` table for configuration storage
- Use key-value pairs with JSON data types for flexible setting storage
- Always fetch settings from database on startup and API calls
- Provide endpoints for reading and writing settings

### Database Layer
- Use repository pattern for data access
- Keep SQL queries in dedicated modules
- Use connection pooling and proper transaction management
- Abstract database-specific logic behind interfaces

### Kafka Integration
- Separate message parsing from consumption logic
- Use factory patterns for creating consumers/producers
- Implement proper error handling and retry logic
- Make broker configuration injectable

### API Layer
- Keep controllers thin - delegate to service layer
- Use consistent error response formats
- Validate inputs at API boundaries
- Implement proper HTTP status codes

### Frontend Integration
- Keep API contracts stable and versioned
- Use consistent data formats
- Implement proper error handling on frontend
- Separate presentation logic from business logic

## Code Review Checklist
- [ ] Single responsibility maintained?
- [ ] Dependencies injected rather than hardcoded?
- [ ] Appropriate error handling implemented?
- [ ] Logging at correct levels with context?
- [ ] Type hints provided?
- [ ] Configuration externalized?
- [ ] No magic numbers - all constants properly defined?
- [ ] Tests can be written for this code?
- [ ] No tight coupling introduced?

## Commands to Run
Before committing changes, run:
```bash
# Add specific linting/testing commands here when identified
# Example: python -m pytest tests/
# Example: python -m flake8 backend/
# Example: python -m mypy backend/
```