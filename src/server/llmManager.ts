/**
 * LLM Service Manager (Node.js Implementation)
 * 
 * Replaces the old Python sidecar service with direct Node.js implementation
 * using @instructor-ai/instructor and string-to-zod.
 */
import OpenAI from 'openai';
import Instructor from '@instructor-ai/instructor';
import { z } from 'zod';
import { stringToZodSchema } from '@mchen-lab/string-to-zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Types
export interface GenerateRequest {
    model: string;
    prompt: string;
    response_format?: string;
    schema?: string;
    mode?: string;  // auto, json, tools
    parsedSchema?: z.ZodTypeAny; // For internal use
    providers?: Record<string, any>; // Provider configuration
}

export interface GenerateResponse {
    status: 'success' | 'error';
    data?: any;
    error?: string;
    usage?: any;
    response_meta?: any;
}

export class LLMServiceManager {
    // Default client (fallback)
    private defaultClient: ReturnType<typeof Instructor>;
    private defaultOAI: OpenAI;

    constructor() {
        console.log('Initializing LLM Service (Node.js)...');
        
        // Initialize Default OpenAI Client (from Env)
        this.defaultOAI = new OpenAI({
            apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || 'undefined',
            baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        });

        // Initialize Default Instructor
        this.defaultClient = Instructor({
            client: this.defaultOAI,
            mode: 'TOOLS',
        });
    }

    private getClientForRequest(model: string, providers?: Record<string, any>, mode?: string): ReturnType<typeof Instructor> {
        // Determine Instructor mode
        const instructorMode = this.resolveInstructorMode(mode);
        
        if (!providers) {
            // Return default client with requested mode
            const oai = new OpenAI({
                apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || 'undefined',
                baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
            });
            return Instructor({
                client: oai,
                mode: instructorMode,
            });
        }

        // Determine provider based on model prefix or default
        let providerName = 'openrouter';
        if (model.includes('/') || model.includes(':')) {
            const separator = model.includes(':') ? ':' : '/';
            const parts = model.split(separator);
            if (providers[parts[0]]) {
                providerName = parts[0];
            }
        }
    
        const config = providers[providerName] || {};
    
        // Fallback to env vars if config key is missing
        // For local providers like Ollama, api_key is optional
        let apiKey = config.api_key || (providerName === 'openrouter' ? process.env.OPENROUTER_API_KEY : undefined);
        
        // Check if this is a local provider (no API key required)
        const isLocalProvider = providerName === 'ollama' || config.base_url?.includes('localhost') || config.base_url?.includes('127.0.0.1');

        if (!apiKey && !isLocalProvider) {
            console.warn(`[LLM] No API key found for provider '${providerName}'. Falling back to default.`);
            return this.defaultClient;
        }

        // For local providers without API key, use a dummy value (OpenAI SDK requires a non-empty string)
        if (!apiKey && isLocalProvider) {
            apiKey = 'ollama';  // Dummy key for local providers
        }

        console.log(`[LLM] Using provider: ${providerName}`);
        console.log(`[LLM] Base URL: ${config.base_url}`);
        console.log(`[LLM] Instructor Mode: ${instructorMode}`);
        console.log(`[LLM] Local provider: ${isLocalProvider}`);

        // Create ephemeral client
        const oai = new OpenAI({
            apiKey: apiKey,
            baseURL: config.base_url || (providerName === 'openrouter' ? 'https://openrouter.ai/api/v1' : undefined),
            defaultHeaders: isLocalProvider ? {} : {
                "HTTP-Referer": "http://localhost:31160",
                "X-Title": "Simple LLM Service (Node)",
            }
        });

        return Instructor({
            client: oai,
            mode: instructorMode,
        });
    }

    /**
     * Resolve instructor mode from string to enum
     */
    private resolveInstructorMode(mode?: string): 'TOOLS' | 'JSON' | 'MD_JSON' | 'FUNCTIONS' {
        switch (mode?.toLowerCase()) {
            case 'json':
                return 'JSON';
            case 'tools':
                return 'TOOLS';
            case 'functions':
                return 'FUNCTIONS';
            case 'md_json':
                return 'MD_JSON';
            case 'auto':
            default:
                return 'TOOLS';  // Default to TOOLS mode
        }
    }

    /**
     * Extract the actual model name, stripping provider prefix
     * e.g., "ollama:qwen3:8b" -> "qwen3:8b"
     *       "openrouter:google/gemini-2.5-flash-lite" -> "google/gemini-2.5-flash-lite"
     */
    private getModelName(modelWithPrefix: string): string {
        // Known provider prefixes
        const providers = ['openrouter', 'ollama', 'openai', 'anthropic'];
        
        for (const provider of providers) {
            if (modelWithPrefix.startsWith(`${provider}:`)) {
                return modelWithPrefix.substring(provider.length + 1);
            }
        }
        
        // No known prefix found, return as-is
        return modelWithPrefix;
    }

    /**
     * Generate structured output from LLM
     */
    async generate(req: GenerateRequest): Promise<GenerateResponse> {
        try {
            console.log(`Generating with model: ${req.model}, mode: ${req.mode || 'auto'}`);
            
            // Get appropriate client (default or configured)
            const client = this.getClientForRequest(req.model, req.providers, req.mode);
            
            // 1. Determine Schema
            let schema: z.ZodTypeAny;
            let response_model_name = "Response";

            if (req.schema && req.response_format !== 'text') {
                // Parse string schema to Zod
                try {
                    schema = stringToZodSchema(req.schema);
                    response_model_name = "StructuredResponse";
                } catch (e: any) {
                    return {
                        status: 'error',
                        error: `Invalid schema syntax: ${e.message}`
                    };
                }
            } else {
                 return this.generateText(req, client);
            }

            // 2. Call LLM with Instructor
            const modelName = this.getModelName(req.model);
            const result = await client.chat.completions.create({
                model: modelName,
                messages: [{ role: 'user', content: req.prompt }],
                response_model: {
                    schema: schema as any,
                    name: response_model_name,
                },
                max_retries: 3,
            });

            // Instructor returns the parsed object directly
            // If it has _meta, extract it separately for logging
            let cleanData = result;
            let responseMeta: any = null;
            if (result && typeof result === 'object' && '_meta' in result) {
                // Remove _meta and return only the actual data
                const { _meta, ...data } = result as any;
                cleanData = data;
                responseMeta = _meta;
            }

            return {
                status: 'success',
                data: cleanData,
                response_meta: responseMeta,
                usage: { total_tokens: 0 } 
            };

        } catch (error: any) {
            console.error('LLM Generation Error:', error);
            return {
                status: 'error',
                error: error.message || 'Unknown error occurred'
            };
        }
    }

    /**
     * Handle text-only generation using the selected client
     */
    private async generateText(req: GenerateRequest, client: ReturnType<typeof Instructor>): Promise<GenerateResponse> {
        try {
            // Access raw OpenAI client from Instructor wrapper if possible, or just use Instructor with simple schema?
            // Instructor-JS doesn't confuse standard completion if we ignore response_model? 
            // Actually client.chat.completions.create is typed to expect response_model if generic is used...
            // But checking types, Instructor returns a modified client.
            // Let's assume we can call it without response_model for raw text?
            // Instructor-JS documentation says it patches the client.
            // If we don't pass response_model, it might behave like standard OAI?
            // Let's try.
            
            // CAST to any to bypass strict typing if needed, mostly for 'mode' compatibility checks
            const modelName = this.getModelName(req.model);
            console.log(`[LLM] Text generation: original="${req.model}", using model="${modelName}"`);
            const completion = await (client.chat.completions as any).create({
                model: modelName,
                messages: [{ role: 'user', content: req.prompt }],
                stream: false
            });

            const content = completion.choices[0]?.message?.content || '';
            return {
                status: 'success',
                data: content,
                usage: completion.usage
            };
        } catch (error: any) {
             console.error('LLM Text Generation Error:', error);
            return {
                status: 'error',
                error: error.message || 'Unknown error occurred'
            };
        }
    }

    // Lifecycle methods (kept for compatibility with index.ts, but effectively no-ops)
    async start(): Promise<void> {
        console.log('LLM Service handling requests internally (no external process).');
    }

    async stop(): Promise<void> {
        console.log('LLM Service stopped.');
    }

    async restart(): Promise<void> {
        console.log('LLM Service restarted.');
    }

    // Health check
    async health(): Promise<boolean> {
        return true; // Always healthy as it's in-process
    }
}

// Singleton instance
export const llmService = new LLMServiceManager();
