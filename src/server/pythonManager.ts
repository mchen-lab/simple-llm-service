
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

export class PythonManager {
  private process: ChildProcess | null = null;
  private serviceDir: string;

  constructor() {
    this.serviceDir = path.resolve(process.cwd(), "python_service");
  }

  /**
   * Get the Python executable path.
   * Uses .venv/bin/python3 for local development if available,
   * falls back to system python3 for Docker environments.
   */
  private getPythonPath(): string {
    const venvPython = path.resolve(process.cwd(), ".venv", "bin", "python3");
    if (fs.existsSync(venvPython)) {
      console.log(`🐍 Using venv Python: ${venvPython}`);
      return venvPython;
    }
    console.log("🐍 Using system Python: python3");
    return "python3";
  }

  public start(): void {
    if (this.process) {
      console.warn("⚠️ Python Service already running.");
      return;
    }

    const pythonPath = this.getPythonPath();
    console.log("Starting Python Service...");
    
    // Run as module to ensure imports work
    this.process = spawn(pythonPath, ["-m", "python_service.main"], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
      cwd: process.cwd(), // Run from root so python_service module is found
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });

    this.process.stdout?.on("data", (data) => {
      console.log(`[Python] ${data.toString().trim()}`);
    });

    this.process.stderr?.on("data", (data) => {
      console.error(`[Python API] ${data.toString().trim()}`);
    });

    this.process.on("exit", (code) => {
      console.log(`🛑 Python Service exited with code ${code}`);
      this.process = null;
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }
      this.process.kill("SIGTERM");
      setTimeout(() => {
        if (this.process) this.process.kill("SIGKILL");
        resolve();
      }, 5000);
    });
  }
}

export const pythonManager = new PythonManager();
