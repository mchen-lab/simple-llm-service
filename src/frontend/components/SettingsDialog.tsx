import { useState, useEffect } from "react";
import { ConfigDialog, ConfigTab } from "./ConfigDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface ProviderConfig {
  api_key?: string;
  base_url?: string;
}

interface AppSettings {
  providers: {
    openrouter?: ProviderConfig;
    ollama?: ProviderConfig;
  };
  model_names: string;
}

export function SettingsDialog() {
  // Data States
  const [settings, setSettings] = useState<AppSettings>({
    providers: {
      openrouter: { api_key: "" },
      ollama: { base_url: "http://localhost:11434/v1" }
    },
    model_names: ""
  });
  const [showApiKey, setShowApiKey] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        // Convert commas to newlines for model_names display
        if (data.model_names) {
          data.model_names = data.model_names.replace(/,/g, "\n");
        }
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load configuration");
    }
  };

  const handleSave = async () => {
    // Convert newlines back to commas for storage
    const settingsToSave = { ...settings };
    if (settingsToSave.model_names) {
      settingsToSave.model_names = settingsToSave.model_names.replace(/\n/g, ",");
    }

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsToSave)
    });

    if (!res.ok) {
      throw new Error("Failed to save settings");
    }
  };

  const updateProviderField = (provider: "openrouter" | "ollama", field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        [provider]: {
          ...prev.providers[provider],
          [field]: value
        }
      }
    }));
  };

  const tabs: ConfigTab[] = [
    {
      id: "providers",
      label: "Providers",
      content: (
        <div className="space-y-6">
          {/* OpenRouter Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider border-b pb-1">OpenRouter</h3>
            <div className="space-y-1.5">
              <Label htmlFor="openrouter-key" className="text-xs">API Key</Label>
              <div className="relative">
                <Input
                  id="openrouter-key"
                  type={showApiKey ? "text" : "password"}
                  value={settings.providers?.openrouter?.api_key || ""}
                  onChange={(e) => updateProviderField("openrouter", "api_key", e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="pr-9 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showApiKey ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Ollama Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider border-b pb-1">Ollama</h3>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ollama-url" className="text-right text-xs">Base URL</Label>
              <Input
                id="ollama-url"
                className="col-span-3"
                value={settings.providers?.ollama?.base_url || ""}
                onChange={(e) => updateProviderField("ollama", "base_url", e.target.value)}
                placeholder="http://localhost:11434/v1"
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: "models",
      label: "Model Names",
      content: (
        <div className="space-y-2 h-full flex flex-col">
          <Label className="text-xs text-muted-foreground">
            Allowed model names (one per line or comma-separated)
          </Label>
          <Textarea
            className="flex-1 font-mono text-sm resize-none min-h-[200px]"
            placeholder="openrouter:google/gemini-2.0-flash-exp&#10;ollama:llama3"
            value={settings.model_names || ""}
            onChange={(e) => setSettings(prev => ({ ...prev, model_names: e.target.value }))}
          />
        </div>
      )
    }
  ];

  return (
    <ConfigDialog
      title="LLM Configuration"
      tabs={tabs}
      onSave={handleSave}
    />
  );
}
