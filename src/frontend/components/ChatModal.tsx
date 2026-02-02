import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Send, Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ChatModal({ open, onOpenChange, onSuccess }: ChatModalProps) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [tag, setTag] = useState("");
  const [responseFormat, setResponseFormat] = useState("text");
  const [schema, setSchema] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableModels = async () => {
    try {
      const res = await api.get("/api/settings");
      const names = res.data.model_names || "";
      // Split by newline or comma, trim, and filter out empty strings
      const models = names.split(/[\n,]+/).map((m: string) => m.trim()).filter((m: string) => m !== "");
      setAvailableModels(models);
      
      // If we have models and none selected, or current model is not in list, select first
      if (models.length > 0 && (!model || !models.includes(model))) {
        setModel(models[0]);
      } else if (models.length === 0 && !model) {
        // Fallback default if nothing configured
        setModel("openrouter:google/gemini-2.0-flash-lite-001");
      }
    } catch (err) {
      console.error("Failed to fetch available models", err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAvailableModels();
    }
  }, [open]);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError(null);

    try {
      await api.post("/api/generate", {
        model,
        prompt,
        tag: tag || undefined,
        response_format: responseFormat,
        schema: responseFormat === "dict" ? schema || undefined : undefined,
      });
      
      setPrompt("");
      setTag("");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Chat Test</DialogTitle>
          <DialogDescription>
            Quickly test prompts and generate logs.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="modal-model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="modal-model" className="h-8 text-sm">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.length > 0 ? (
                  availableModels.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))
                ) : (
                  <SelectItem value={model || "openrouter:google/gemini-2.0-flash-lite-001"}>
                    {model || "openrouter:google/gemini-2.0-flash-lite-001"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="modal-tag">Tag (Optional)</Label>
              <Input 
                id="modal-tag" 
                value={tag} 
                onChange={(e) => setTag(e.target.value)} 
                placeholder="e.g. test-run" 
                className="h-8 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="modal-format">Format</Label>
              <Select value={responseFormat} onValueChange={setResponseFormat}>
                <SelectTrigger id="modal-format" className="h-8 text-sm">
                  <SelectValue placeholder="Response Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">gen_text</SelectItem>
                  <SelectItem value="dict">gen_dict</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {responseFormat === "dict" && (
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="modal-schema">JSON Schema</Label>
                <Sheet>
                  <SheetTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>String Schema Cheat Sheet</SheetTitle>
                      <SheetDescription>
                        Define schemas with a concise, human-readable syntax.
                      </SheetDescription>
                    </SheetHeader>
                    
                    <div className="space-y-6 mt-6">
                      <div className="space-y-3">
                        <h5 className="font-medium text-sm text-primary border-b pb-1">Basic Usage</h5>
                        <pre className="bg-muted p-3 rounded text-xs border font-mono">
{`name:string
age:int?
email:email`}
                        </pre>
                        <p className="text-xs text-muted-foreground">Comma or newline separated.</p>
                      </div>

                      <div className="space-y-3">
                        <h5 className="font-medium text-sm text-primary border-b pb-1">Modifiers</h5>
                        <div className="text-xs space-y-2">
                          <div className="flex justify-between">
                            <code className="bg-muted px-1 rounded">key:type</code> <span>Required</span>
                          </div>
                          <div className="flex justify-between">
                            <code className="bg-muted px-1 rounded">key:type?</code> <span>Optional</span>
                          </div>
                          <div className="flex justify-between">
                            <code className="bg-muted px-1 rounded">int(0,100)</code> <span>Range</span>
                          </div>
                          <div className="flex justify-between">
                            <code className="bg-muted px-1 rounded">str(min=5)</code> <span>Length</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h5 className="font-medium text-sm text-primary border-b pb-1">Arrays & Nested Objects</h5>
                        <div className="space-y-4">
                          <div>
                            <span className="text-xs text-muted-foreground block mb-1">Simple Arrays</span>
                            <pre className="bg-muted p-3 rounded text-xs border font-mono">
{`tags:[string]
scores:[int]`}
                            </pre>
                          </div>
                          <div>
                             <span className="text-xs text-muted-foreground block mb-1">Object Arrays</span>
                            <pre className="bg-muted p-3 rounded text-xs border font-mono">
{`users:[{
  name:string,
  id:uuid
}]`}
                            </pre>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h5 className="font-medium text-sm text-primary border-b pb-1">Complex Example</h5>
                        <pre className="bg-muted p-3 rounded text-xs border font-mono whitespace-pre-wrap">
{`id:uuid,
name:string(min=1),
price:number(min=0),
tags:[string]?,
inventory:{
  in_stock:bool,
  quantity:int?
}`}
                        </pre>
                      </div>

                      <div className="space-y-3 pt-2">
                        <h5 className="font-medium text-sm text-primary border-b pb-1">Supported Types</h5>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-foreground">Basic:</span> string, int, number, bool<br/>
                          <span className="font-semibold text-foreground">Special:</span> email, url, datetime, date, uuid, phone
                        </p>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              <Textarea
                id="modal-schema"
                placeholder='e.g. name:string, age:int?'
                value={schema}
                onChange={(e) => setSchema(e.target.value)}
                className="h-20 text-xs font-mono"
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="modal-prompt">Prompt</Label>
            <Textarea
              id="modal-prompt"
              placeholder="What's on your mind?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[150px] text-sm"
            />
          </div>
          
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={loading || !prompt} className="min-w-[100px]">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
