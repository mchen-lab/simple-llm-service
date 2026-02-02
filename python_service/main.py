from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
import json
import requests
import os
import time

app = FastAPI(title="Simple LLM Python Service")

class GenerateRequest(BaseModel):
    model: str
    prompt: str
    response_format: Optional[str] = "text"
    schema_str: Optional[str] = Field(default=None, alias="schema")
    tag: Optional[str] = None
    providers: Dict[str, Any] = {}
    
    model_config = {"populate_by_name": True}


def get_provider_config(model: str, providers: Dict[str, Any]):
    """Determine provider and config from model string."""
    if ":" in model:
        provider, actual_model = model.split(":", 1)
    else:
        # Default to OpenRouter if no prefix
        provider = "openrouter"
        actual_model = model
        
    provider = provider.lower()
    
    # Get provider config
    provider_config = providers.get(provider, {})
    
    # Only support OpenRouter and Ollama logic
    api_key = None
    base_url = None

    if provider == "ollama":
        base_url = provider_config.get("base_url", "http://localhost:11434/v1")
    elif provider == "openrouter" or provider in providers:
        provider = "openrouter" # Treat unknown as OpenRouter/OpenAI compatible
        provider_config = providers.get("openrouter", {})
        api_key = provider_config.get("api_key")
        base_url = "https://openrouter.ai/api/v1"
    
    return provider, api_key, base_url, actual_model

def call_provider(model: str, messages: list, providers: Dict[str, Any]) -> tuple[str, dict]:
    """Generic call to compatible APIs."""
    provider, api_key, base_url, actual_model = get_provider_config(model, providers)
    
    if not base_url:
        raise ValueError(f"Could not determine base_url for provider {provider}")

    headers = {
        "Content-Type": "application/json",
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
        
    # OpenRouter specific headers
    if provider == "openrouter":
        headers["HTTP-Referer"] = "http://localhost:31160"
        headers["X-Title"] = "Simple-LLM-Service"
        
    payload = {
        "model": actual_model,
        "messages": messages,
        "temperature": 0.7
    }
    
    endpoint = f"{base_url}/chat/completions"
    
    try:
        print(f"DEBUG: Calling {endpoint} model={actual_model}")
        response = requests.post(
            endpoint,
            headers=headers,
            json=payload,
            timeout=120
        )
        
        if response.status_code != 200:
            raise RuntimeError(f"API Request failed ({provider}): {response.text}")
            
        data = response.json()
        usage = data.get("usage", {})
        content = ""

        if "choices" in data and data["choices"]:
                content = data["choices"][0]["message"]["content"]
        elif "message" in data: # Some Ollama versions?
                content = data["message"]["content"]
        else:
                raise RuntimeError(f"Invalid API response: {data}")
        
        return content, usage
                
    except Exception as e:
            raise RuntimeError(f"Provider call failed: {e}")

@app.post("/generate")
async def generate(req: GenerateRequest):
    try:
        # Detect format
        actual_format = "dict" if req.schema_str else "text"
        if actual_format == "dict" and not req.schema_str:
             raise HTTPException(status_code=400, detail="Schema is required for dict format")

        system_message = "You are a helpful assistant."
        user_message = req.prompt
        
        if actual_format == "dict" and req.schema_str:
            system_message += f"\nYou must respond with a valid JSON object matching this schema: {req.schema_str}"
            user_message += "\nRespond ONLY with the JSON."
        
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]
        
        content, usage = call_provider(req.model, messages, req.providers)
        
        result = content
        if actual_format == "dict":
            # Clean code blocks
            cleaned = content.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                if cleaned.endswith("```"):
                    cleaned = cleaned.rsplit("\n", 1)[0]
            try:
                result = json.loads(cleaned)
            except Exception as e:
                # If failed to parse json, return string but maybe warngin?
                # For now fail
                raise HTTPException(status_code=500, detail=f"Failed to parse JSON: {e} | Content: {cleaned}")

        return {"status": "success", "data": result, "usage": usage}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def health():
    return {"status": "ok", "service": "python-llm"}

if __name__ == "__main__":
    import uvicorn
    # Listen on 0.0.0.0:31161
    uvicorn.run(app, host="0.0.0.0", port=31161)
