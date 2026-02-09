# Simple Llm Service

This project was bootstrapped with [@mchen-lab/app-kit](https://github.com/mchen-lab/app-kit).

## Getting Started

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Initialize Git (Recommended)**
    To capture the commit hash for the "About" dialog, initialize a git repository and make an initial commit:
    ```bash
    git init && git add . && git commit -m "initial commit"
    ```

3.  **Start Development Server**
    Use the provided `restart.sh` script to start the server. This script handles port cleanup and log rotation:
    ```bash
    ./restart.sh
    ```
    Alternatively, you can run `npm run dev`.

4.  **Build for Production**
    ```bash
    npm run build
    ```

## LLM API

### Generate Endpoint

**POST** `/api/generate`

Generate text or structured output from an LLM.

#### Request Body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Model identifier (e.g., `openrouter:google/gemini-2.0-flash-exp:free`, `ollama:qwen3:8b`) |
| `prompt` | string | Yes | The input prompt |
| `response_format` | string | No | `gen_text` (default) or `gen_dict` for structured output |
| `schema` | string | No | String-schema definition (required when `response_format` is `gen_dict`) |
| `tag` | string | No | Custom tag for log filtering |
| `mode` | string | No | Instructor mode: `auto` (default), `json`, or `tools` |

#### Response Formats

**`gen_text`** - Returns plain text:
```json
"The generated text response"
```

**`gen_dict`** - Returns structured JSON:
```json
{
  "data": { "name": "John", "age": 25 },
  "response_meta": { "model": "...", "usage": {...} }
}
```

#### String-Schema Syntax

Uses [@mchen-lab/string-to-zod](https://www.npmjs.com/package/@mchen-lab/string-to-zod) for schema definitions:

| Type | Example | Description |
|------|---------|-------------|
| Basic types | `{name:str, age:int, active:bool}` | String, integer, boolean |
| Arrays | `{tags:[string]}` | Array of strings |
| Nested objects | `user:{name:str, age:int}` | Nested object |
| Array of objects | `items:[{name:str, price:int}]` | Array of objects |
| Optional fields | `{bio:str?}` | Optional field with `?` |
| Enums | `{status:enum(pending, done)}` | Enumerated values |

#### Examples

**Text Generation:**
```bash
curl -X POST http://localhost:31160/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter:google/gemini-2.0-flash-exp:free",
    "prompt": "Explain quantum computing in one sentence",
    "response_format": "gen_text"
  }'
```

**Structured Output:**
```bash
curl -X POST http://localhost:31160/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter:google/gemini-2.0-flash-exp:free",
    "prompt": "Create a user named Alice who is 30 years old",
    "response_format": "gen_dict",
    "schema": "user:{name:str, age:int}"
  }'
```

**Array of Objects:**
```bash
curl -X POST http://localhost:31160/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter:google/gemini-2.0-flash-exp:free",
    "prompt": "List 3 fruits with prices",
    "response_format": "gen_dict",
    "schema": "items:[{name:str, price:int}]"
  }'
```

### Model Format

Models are specified as `provider:model_name`:
- **OpenRouter**: `openrouter:google/gemini-2.0-flash-exp:free`
- **Ollama**: `ollama:qwen3:8b`

## Configuration & Persistence
 
This project follows specific standards for configuration and data management:

-   **`DATA_DIR`**: Location for configuration files (defaults to `./data`). All UI settings are saved to `data/settings.json`.
-   **`LOGS_DIR`**: Location for persistent log files (defaults to `./logs`). The server automatically appends logs to `logs/app.log`.

### Environment Overrides
You can override default configuration keys using environment variables. For example, to override `exampleSetting`:
```bash
EXAMPLE_SETTING="custom-value" ./restart.sh
```

## Project Structure

```
├── data/           # Persistent configuration (settings.json)
├── logs/           # Persistent application logs (app.log)
├── src/
│   ├── server/     # Backend logic (Express + AppKit)
│   └── frontend/   # Frontend React application
└── libs/           # Local dependencies (app-kit.tgz)
```

