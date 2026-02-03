import { createApp } from "@mchen-lab/app-kit/backend";
import { Request, Response } from "express";
import express from "express";
import axios from "axios";
import path from "path";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { initDb, logCall, getLogs, countLogs, getUniqueTags } from "./db.js";
import { llmService } from "./llmManager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Config Interface
interface GlobalConfig {
    providers: {
        [key: string]: {
            api_key?: string;
            base_url?: string;
            [key: string]: any;
        };
    };
    model_names: string;
}

const defaultConfig: GlobalConfig = {
    providers: {
        openrouter: {
            api_key: "",
            base_url: "https://openrouter.ai/api/v1"
        },
        ollama: {
            base_url: "http://localhost:11434/v1"
        }
    },
    model_names: "google/gemini-2.0-flash-exp:free"
};

// 2. Initialize App-Kit
const appKit = createApp({
    appName: "Simple LLM Service",
    defaultConfig,
    disableStatic: true,  // We handle static serving ourselves for Vite dev mode
    recreateMissingConfig: true
});

const isProduction = process.env.NODE_ENV === "production";

const app = appKit.app;
let globalConfig = appKit.config as GlobalConfig;

// Initialize DB
initDb();

// Python service removed in favor of direct Node.js implementation

// 3. API Routes

// Settings API
app.get("/api/settings", (_req: Request, res: Response) => {
    res.json(appKit.config);
});

app.post("/api/settings", async (req: Request, res: Response) => {
    try {
        const newSettings = req.body;
        
        // Update appKit.config directly so saveConfig saves the right data
        if (newSettings.providers) {
            (appKit.config as GlobalConfig).providers = newSettings.providers;
        }
        if (newSettings.model_names !== undefined) {
            (appKit.config as GlobalConfig).model_names = newSettings.model_names;
        }
        
        // Update globalConfig reference too
        globalConfig = appKit.config as GlobalConfig;
        
        await appKit.saveConfig();
        res.json({ status: "success", settings: globalConfig });
    } catch (e: any) {
        res.status(500).json({ status: "error", detail: e.message });
    }
});

// Logs API
app.get("/api/logs", (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string || "1");
        const limit = parseInt(req.query.limit as string || "50");
        const offset = (page - 1) * limit;
        
        const filters = {
            tag: req.query.tag as string,
            start_date: req.query.start_date as string,
            end_date: req.query.end_date as string
        };
        
        const logs = getLogs(limit, offset, filters);
        const total = countLogs(filters); // Need to implement count
        
        res.json({
            data: logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

app.get("/api/logs/tags", (_req: Request, res: Response) => {
    try {
        const tags = getUniqueTags();
        res.json(tags);
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// Generate API - Direct Node.js Implementation
app.post("/api/generate", async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { model, prompt, response_format, schema, tag, mode } = req.body;
    
    try {
        // Call the internal Node.js service directly
        const result = await llmService.generate({
            model: model || 'gpt-4o',
            prompt: prompt,
            response_format: response_format,
            schema: schema,
            mode: mode || 'auto',  // auto, json, tools
            providers: (appKit.config as GlobalConfig).providers
        });

        const duration_ms = Date.now() - startTime;
        
        if (result.status === 'error') {
             // Log error
            logCall({
                model,
                prompt,
                response: null,
                duration_ms,
                error: result.error || null,
                metadata: { format: response_format, schema },
                response_meta: null,
                tag
            });
            return res.status(500).json({ detail: result.error });
        }

        // Log success
        logCall({
            model,
            prompt,
            response: result.data, 
            duration_ms,
            error: null,
            metadata: { format: response_format, schema },
            response_meta: result.response_meta,
            tag
        });
        
        // Return structured response with response_meta if available (gen_dict)
        if (result.response_meta) {
            res.json({ data: result.data, response_meta: result.response_meta });
        } else {
            // gen_text - return data directly for backward compatibility
            res.json(result.data);
        }
        
    } catch (e: any) {
        const errorMsg = e.message || "Internal Server Error";
        logCall({
            model,
            prompt,
            response: null,
            duration_ms: Date.now() - startTime,
            error: errorMsg,
            metadata: { format: response_format, schema },
            response_meta: null,
            tag
        });
        res.status(500).json({ detail: errorMsg });
    }
});

// Start Hook
async function start() {
    await appKit.initialize();
    
    // Start Node.js LLM Service
    await llmService.start();
    
    const PORT = process.env.PORT || 31160;
    
    // Create HTTP server (allows sharing with Vite HMR WebSocket)
    const server = createServer(app);

    // Frontend Serving Logic
    if (isProduction) {
        const distPath = path.join(__dirname, "../../dist");
        app.use(express.static(distPath));
        app.get("*", (_req: Request, res: Response) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
    } else {
        try {
            const vite = await import("vite");
            const frontendDir = path.resolve(__dirname, "../frontend");
            const viteServer = await vite.createServer({
                server: {
                    middlewareMode: true,
                    hmr: { server },  // Share the HTTP server for HMR WebSocket
                },
                appType: "spa",
                root: frontendDir,
                configFile: path.resolve(frontendDir, "../../vite.config.ts"),
            });

            app.use((req, res, next) => {
                if (req.path.startsWith("/api") || req.path.startsWith("/ws")) {
                    return next();
                }
                viteServer.middlewares(req, res, next);
            });

            console.log("🔥 Hot reload enabled via Vite Middleware");
        } catch (e) {
            console.error("Failed to start Vite middleware", e);
        }
    }

    server.listen(Number(PORT), "0.0.0.0", () => {
        console.log(`Node Server running on port ${PORT}`);
    });
}

start();
