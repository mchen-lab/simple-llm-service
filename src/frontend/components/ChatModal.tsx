import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Send, Loader2, HelpCircle, FileText, FileCode, Copy, Check } from "lucide-react";
import Markdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
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
  initialPrompt?: string;
}

interface GenerateResult {
  data?: any;
  response_meta?: any;
  error?: string;
  model?: string;
  duration_ms?: number;
  metadata?: any;
  usage?: any;
  status?: string;
}

export default function ChatModal({ open, onOpenChange, onSuccess, initialPrompt }: ChatModalProps) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [tag, setTag] = useState("");
  const [responseFormat, setResponseFormat] = useState("text");
  const [schema, setSchema] = useState("");
  const [instructorMode, setInstructorMode] = useState("auto");  // auto, json, tools
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [responseViewMode, setResponseViewMode] = useState<"md" | "plain">("plain");
  // Copy hooks for visual feedback
  const [promptCopied, copyPrompt] = useCopyToClipboard();
  const [responseCopied, copyResponse] = useCopyToClipboard();

  const fetchAvailableModels = async () => {
    try {
      const res = await api.get("/api/settings");
      const names = res.data.model_names || "";
      const models = names.split(/[\n,]+/).map((m: string) => m.trim()).filter((m: string) => m !== "");
      setAvailableModels(models);
      
      if (models.length > 0 && (!model || !models.includes(model))) {
        setModel(models[0]);
      } else if (models.length === 0 && !model) {
        setModel("openrouter:google/gemini-2.0-flash-lite-001");
      }
    } catch (err) {
      console.error("Failed to fetch available models", err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAvailableModels();
      setResult(null);
      setError(null);
      // Pre-fill prompt if provided
      if (initialPrompt) {
        setPrompt(initialPrompt);
      }
    }
  }, [open, initialPrompt]);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const startTime = Date.now();
    try {
      const response = await api.post("/api/generate", {
        model,
        prompt,
        tag: tag || undefined,
        response_format: responseFormat,
        schema: responseFormat === "dict" ? schema || undefined : undefined,
        mode: responseFormat === "dict" ? instructorMode : undefined,
      });
      
      const duration_ms = Date.now() - startTime;
      
      // Handle response structure: gen_dict returns { data, response_meta }, gen_text returns data directly
      const responseData = response.data?.data !== undefined ? response.data.data : response.data;
      const responseMeta = response.data?.response_meta || null;
      
      // Wrap the response in a structured result object
      setResult({
        data: responseData,
        response_meta: responseMeta,
        model: model,
        duration_ms: duration_ms,
      });
      onSuccess();
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.detail || err.message || "Failed to generate";
      setError(errorMsg);
      setResult({ data: null, error: errorMsg, model });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPrompt("");
    setTag("");
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  const syntaxHighlight = (json: string) => {
    if (!json) return "";
    return json
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"([^"]+)":/g, '<span class="text-blue-600">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="text-green-600">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="text-orange-500">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="text-purple-500">$1</span>');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full h-full max-w-full max-h-full sm:max-w-4xl sm:max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogTitle>Chat Test</DialogTitle>
          <DialogDescription className="sr-only">
            Test prompts and view results.
          </DialogDescription>
        </DialogHeader>
        
        {/* Single scrollable container for everything */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="space-y-4">
            {/* Model Selection */}
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
            
            {/* Tag and Format */}
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

            {/* Schema (conditional) */}
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
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h5 className="font-medium text-sm text-primary border-b pb-1">Arrays</h5>
                          <pre className="bg-muted p-3 rounded text-xs border font-mono">
{`tags:[string]
users:[{name:string, id:uuid}]`}
                          </pre>
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
                  className="h-16 text-xs font-mono"
                />
              </div>
            )}

            {/* Instructor Mode (conditional - only for gen_dict) */}
            {responseFormat === "dict" && (
              <div className="grid gap-2">
                <Label htmlFor="modal-mode">Instructor Mode</Label>
                <Select value={instructorMode} onValueChange={setInstructorMode}>
                  <SelectTrigger id="modal-mode" className="h-8 text-sm">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (default)</SelectItem>
                    <SelectItem value="json">JSON (schema in prompt)</SelectItem>
                    <SelectItem value="tools">Tools (function calling)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Prompt */}
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="modal-prompt">Prompt</Label>
                <button
                  onClick={() => copyPrompt(prompt)}
                  className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy prompt"
                  disabled={!prompt}
                >
                  {promptCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <Textarea
                id="modal-prompt"
                placeholder="What's on your mind?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] text-sm"
              />
            </div>

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Generating response...</p>
                </div>
              </div>
            )}

            {/* Result Box */}
            {!loading && result && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {result.error ? 'Error' : 'Response'}
                      </span>
                      <button
                        onClick={() => {
                          const content = result.error 
                            ? result.error 
                            : (typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2));
                          copyResponse(content || "");
                        }}
                        className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy response"
                      >
                        {responseCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {!result.error && (
                      <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
                        <button
                          onClick={() => setResponseViewMode("md")}
                          className={cn(
                            "p-1.5 rounded text-xs flex items-center gap-1 transition-colors",
                            responseViewMode === "md" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                          title="Markdown view"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">MD</span>
                        </button>
                        <button
                          onClick={() => setResponseViewMode("plain")}
                          className={cn(
                            "p-1.5 rounded text-xs flex items-center gap-1 transition-colors",
                            responseViewMode === "plain" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                          title="Plain text view"
                        >
                          <FileCode className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Plain</span>
                        </button>
                      </div>
                    )}
                  </div>
                    {result.error ? (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                      <p className="text-sm text-destructive/80 whitespace-pre-wrap font-mono">{result.error}</p>
                    </div>
                  ) : (
                    <div className="bg-muted/30 rounded-lg border p-4">
                      {responseViewMode === "md" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <Markdown>
                            {typeof result.data === 'string' 
                              ? result.data 
                              : JSON.stringify(result.data, null, 2)}
                          </Markdown>
                        </div>
                      ) : (
                        <div 
                          className="font-mono text-sm whitespace-pre-wrap syntax-highlight"
                          dangerouslySetInnerHTML={{ 
                            __html: syntaxHighlight(
                              typeof result.data === 'string' 
                                ? result.data 
                                : JSON.stringify(result.data, null, 2)
                            ) 
                          }} 
                        />
                      )}
                    </div>
                  )}
                  {/* Response Meta Section */}
                  {result.response_meta && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Response Meta</span>
                      </div>
                      <div className="bg-muted/20 rounded-lg border border-dashed p-3">
                        <div 
                          className="font-mono text-xs whitespace-pre-wrap text-muted-foreground"
                          dangerouslySetInnerHTML={{ 
                            __html: syntaxHighlight(JSON.stringify(result.response_meta, null, 2))
                          }} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata Box */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Metadata</span>
                  <div className="bg-muted/20 p-3 rounded-lg border">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Model</span>
                        <p className="font-medium truncate">{result.model}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Duration</span>
                        <p className="font-medium">{result.duration_ms?.toFixed(0) ?? 'N/A'}ms</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Tokens</span>
                        <p className="font-medium">{result.usage?.total_tokens ?? result.metadata?.usage?.total_tokens ?? 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Status</span>
                        <p className="font-medium">{result.error ? 'Error' : 'Success'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        <DialogFooter className="px-6 py-4 border-t flex-row items-center justify-between sm:justify-between shrink-0">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Close
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={loading || !prompt} className="gap-1.5">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
