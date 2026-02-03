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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialPrompt?: string;
}

interface GenerateResult {
  data?: any;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"prompt" | "result">("prompt");
  const [result, setResult] = useState<GenerateResult | null>(null);

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
      setActiveTab("prompt");
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

    try {
      const response = await api.post("/api/generate", {
        model,
        prompt,
        tag: tag || undefined,
        response_format: responseFormat,
        schema: responseFormat === "dict" ? schema || undefined : undefined,
      });
      
      // Store the result and switch to result tab
      setResult(response.data);
      setActiveTab("result");
      onSuccess();
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.detail || err.message || "Failed to generate";
      setError(errorMsg);
      setResult({ data: null, error: errorMsg, model });
      setActiveTab("result");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPrompt("");
    setTag("");
    setResult(null);
    setError(null);
    setActiveTab("prompt");
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
      <DialogContent className="sm:max-w-[550px] h-[70vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Chat Test</DialogTitle>
          <DialogDescription className="sr-only">
            Test prompts and view results.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "prompt" | "result")} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b">
            <TabsList className="w-full justify-start h-9 bg-transparent p-0 gap-6">
              <TabsTrigger value="prompt" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-9 text-sm">
                Prompt
              </TabsTrigger>
              <TabsTrigger value="result" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-9 text-sm" disabled={!result && !loading}>
                Result
                {loading && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="prompt" className="h-full m-0 overflow-auto px-6 py-4">
              <div className="grid gap-4">
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

                <div className="grid gap-2">
                  <Label htmlFor="modal-prompt">Prompt</Label>
                  <Textarea
                    id="modal-prompt"
                    placeholder="What's on your mind?"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] text-sm"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="result" className="h-full m-0 overflow-auto px-6 py-4">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground">Generating response...</p>
                  </div>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  {result.error ? (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                      <p className="text-sm text-destructive font-medium mb-2">Error</p>
                      <p className="text-sm text-destructive/80 whitespace-pre-wrap">{result.error}</p>
                    </div>
                  ) : (
                    <div className="bg-muted/30 rounded-lg border p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Response</p>
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
                    </div>
                  )}
                  
                  {result.duration_ms && (
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Model: <span className="text-foreground">{result.model}</span></span>
                      <span>Duration: <span className="text-foreground">{result.duration_ms.toFixed(0)}ms</span></span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Submit a prompt to see results</p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
        
        <DialogFooter className="px-6 py-4 border-t flex-row items-center justify-between sm:justify-between">
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
