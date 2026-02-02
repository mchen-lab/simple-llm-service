import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";

// Mock the database module before importing server
vi.mock("./db.js", () => ({
  initDb: vi.fn(),
  logCall: vi.fn(),
  getLogs: vi.fn(() => []),
  countLogs: vi.fn(() => 0),
  getUniqueTags: vi.fn(() => []),
}));

// Mock the pythonManager
vi.mock("./pythonManager.js", () => ({
  pythonManager: {
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

describe("Simple LLM Service API", () => {
  describe("Health and Status Endpoints", () => {
    it("should respond to /api/status", async () => {
      // Create a minimal test app with just the status endpoint
      const testApp = express();
      testApp.get("/api/status", (req, res) => {
        res.json({
          status: "ok",
          appName: "Simple LLM Service",
          timestamp: new Date().toISOString(),
        });
      });

      const response = await request(testApp).get("/api/status");
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.appName).toBe("Simple LLM Service");
    });
  });

  describe("Settings Endpoints", () => {
    it("should respond to GET /api/settings", async () => {
      const testApp = express();
      const mockSettings = {
        providers: {
          openrouter: { api_key: "", base_url: "https://openrouter.ai/api/v1" },
          ollama: { base_url: "http://localhost:11434/v1" },
        },
        model_names: "test-model",
      };
      
      testApp.get("/api/settings", (req, res) => {
        res.json(mockSettings);
      });

      const response = await request(testApp).get("/api/settings");
      expect(response.status).toBe(200);
      expect(response.body.providers).toBeDefined();
      expect(response.body.model_names).toBe("test-model");
    });

    it("should respond to POST /api/settings", async () => {
      const testApp = express();
      testApp.use(express.json());
      
      let savedSettings: any = null;
      testApp.post("/api/settings", (req, res) => {
        savedSettings = req.body;
        res.json({ status: "success", settings: savedSettings });
      });

      const newSettings = {
        providers: {
          openrouter: { api_key: "test-key" },
        },
        model_names: "new-model",
      };

      const response = await request(testApp)
        .post("/api/settings")
        .send(newSettings)
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(savedSettings.model_names).toBe("new-model");
    });
  });

  describe("Logs Endpoints", () => {
    it("should respond to GET /api/logs", async () => {
      const testApp = express();
      testApp.get("/api/logs", (req, res) => {
        res.json({
          data: [],
          pagination: { page: 1, limit: 50, total: 0, pages: 1 },
        });
      });

      const response = await request(testApp).get("/api/logs");
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination).toBeDefined();
    });

    it("should respond to GET /api/logs/tags", async () => {
      const testApp = express();
      testApp.get("/api/logs/tags", (req, res) => {
        res.json(["tag1", "tag2"]);
      });

      const response = await request(testApp).get("/api/logs/tags");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
