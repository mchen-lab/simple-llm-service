import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Eye, Trash2, Pin, RotateCw, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LogFilterBar } from "./LogFilterBar";

interface LogEntry {
  id: number;
  timestamp: string;
  model: string;
  prompt: string;
  response: any;
  duration_ms: number;
  error?: string;
  metadata?: any;
  locked: boolean;
  tag?: string | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface LogsPageProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

export default function LogsPage({
  refreshTrigger = 0,
  onRefresh,
}: LogsPageProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 20, total: 0, pages: 1 });
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  
  // Detail modal state
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  
  // Rerun state
  const [rerunModel, setRerunModel] = useState("");
  const [rerunFormat, setRerunFormat] = useState<"text" | "dict">("text");
  const [rerunPrompt, setRerunPrompt] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [rerunLoading, setRerunLoading] = useState(false);
  
  // Purge dialog state
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeOption, setPurgeOption] = useState("30d");
  
  // Delete confirm state
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchLogs = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const params: any = { page: pageNum, limit: pagination.limit };
      if (tagFilter !== "all") params.tag = tagFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get("/api/logs", { params });
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, tagFilter, searchQuery]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await api.get("/api/logs/tags");
      const tags = Array.isArray(res.data) ? res.data : [];
      setAvailableTags(tags);
    } catch (err) {
      console.error("Failed to fetch tags", err);
    }
  }, []);

  const handlePurge = async () => {
    try {
      const isCount = purgeOption.endsWith("l");
      const val = purgeOption.slice(0, -1);
      const param = isCount ? `count_to_keep=${val}` : `days_to_keep=${val}`;
      
      await api.delete(`/api/logs?${param}`);
      setPurgeOpen(false);
      setPage(1);
      fetchLogs(1);
    } catch (err) {
      console.error("Failed to purge logs", err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/logs/${id}`);
      setDeleteId(null);
      fetchLogs(page);
    } catch (err) {
      console.error("Failed to delete log", err);
    }
  };

  const toggleLock = async (logId: number, currentLocked: boolean) => {
    try {
      await api.patch(`/api/logs/${logId}`, { locked: !currentLocked });
      setLogs(prev => prev.map(log => 
        log.id === logId ? { ...log, locked: !currentLocked } : log
      ));
    } catch (err) {
      console.error("Failed to toggle lock", err);
    }
  };

  const fetchAvailableModels = useCallback(async () => {
    try {
      const res = await api.get("/api/settings");
      const names = res.data.model_names || "";
      const models = names.split(/[\n,]+/).map((m: string) => m.trim()).filter((m: string) => m !== "");
      setAvailableModels(models);
    } catch (err) {
      console.error("Failed to fetch models", err);
    }
  }, []);

  const handleRerun = async () => {
    if (!selectedLog || !rerunModel || !rerunPrompt.trim()) return;
    setRerunLoading(true);
    try {
      await api.post("/api/generate", {
        model: rerunModel,
        prompt: rerunPrompt,
        tag: selectedLog.tag || undefined,
        response_format: rerunFormat,
        schema: rerunFormat === "dict" && selectedLog.metadata?.schema 
          ? JSON.stringify(selectedLog.metadata.schema) 
          : undefined,
      });
      setSelectedLog(null);
      fetchLogs(page);
      onRefresh?.();
    } catch (err) {
      console.error("Failed to rerun", err);
    } finally {
      setRerunLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLogs(page);
    onRefresh?.();
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleTagFilterChange = (tag: string) => {
    setTagFilter(tag);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Fetch logs when filters change
  useEffect(() => {
    fetchLogs(page);
  }, [page, tagFilter, searchQuery, refreshTrigger]);

  // Fetch tags on mount
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Listen for external refresh events
  useEffect(() => {
    const handleExternalRefresh = () => fetchLogs(page);
    window.addEventListener("refresh-logs", handleExternalRefresh);
    return () => window.removeEventListener("refresh-logs", handleExternalRefresh);
  }, [fetchLogs, page]);

  // Fetch models and initialize rerun state when dialog opens
  useEffect(() => {
    if (selectedLog) {
      fetchAvailableModels();
      setRerunModel(selectedLog.model);
      setRerunFormat(selectedLog.metadata?.format === 'dict' ? 'dict' : 'text');
      setRerunPrompt(selectedLog.prompt);
    }
  }, [selectedLog, fetchAvailableModels]);

  return (
    <div className="flex flex-col h-full">
      {/* Filter Bar */}
      <LogFilterBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        tagFilter={tagFilter}
        onTagFilterChange={handleTagFilterChange}
        availableTags={availableTags}
        page={page}
        totalPages={pagination.pages}
        total={pagination.total}
        onPageChange={handlePageChange}
        onRefresh={handleRefresh}
        onPurge={() => setPurgeOpen(true)}
        loading={loading}
      />

      {/* Logs Table */}
      <div className="flex-1 overflow-auto">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {loading ? "Loading..." : "No logs found."}
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-white">
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-40">Timestamp</TableHead>
                <TableHead className="w-48">Model</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead className="w-20 text-right">Duration</TableHead>
                <TableHead className="w-20 text-center">Status</TableHead>
                <TableHead className="w-24 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const promptPreview = log.prompt.split('\n')[0].substring(0, 80);
                
                return (
                  <TableRow key={log.id} className="group">
                    {/* Pin indicator */}
                    <TableCell className="px-2">
                      <button 
                        onClick={() => toggleLock(log.id, log.locked)}
                        className={cn(
                          "p-1 rounded transition-all",
                          log.locked 
                            ? "text-amber-500" 
                            : "text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-500"
                        )}
                        title={log.locked ? "Unpin log" : "Pin log"}
                      >
                        <Pin className={cn("h-3.5 w-3.5", log.locked && "fill-current")} />
                      </button>
                    </TableCell>
                    
                    {/* Timestamp */}
                    <TableCell className="font-mono text-xs text-slate-600">
                      {new Date(log.timestamp).toLocaleString('sv')}
                    </TableCell>
                    
                    {/* Model */}
                    <TableCell className="text-sm font-medium truncate max-w-48">
                      {log.model}
                    </TableCell>
                    
                    {/* Prompt preview with optional tag */}
                    <TableCell className="text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        {log.tag && (
                          <Badge variant="outline" className="px-1.5 h-5 text-[10px] bg-blue-50/50 text-blue-600 border-blue-200 shrink-0">
                            {log.tag}
                          </Badge>
                        )}
                        <span className="truncate">{promptPreview}{log.prompt.length > 80 && '...'}</span>
                      </div>
                    </TableCell>
                    
                    {/* Duration */}
                    <TableCell className="text-right text-xs text-slate-500 tabular-nums">
                      {log.duration_ms?.toFixed(0) ?? 'N/A'}ms
                    </TableCell>
                    
                    {/* Status */}
                    <TableCell className="text-center">
                      {log.error ? (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Error</Badge>
                      ) : (
                        <Badge className="h-5 px-1.5 text-[10px] bg-green-100 text-green-800 hover:bg-green-200">OK</Badge>
                      )}
                    </TableCell>
                    
                    {/* Actions */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-blue-600"
                          onClick={() => setSelectedLog(log)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-red-600"
                          onClick={() => setDeleteId(log.id)}
                          title="Delete log"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Log Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl h-[55vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Log Detail</span>
              <span className="text-xs font-normal text-muted-foreground mr-8">
                {selectedLog?.timestamp && new Date(selectedLog.timestamp).toLocaleString()}
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Detailed view of the LLM log entry.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="prompt" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 border-b">
              <TabsList className="w-full justify-start h-9 bg-transparent p-0 gap-6">
                <TabsTrigger value="prompt" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-9 text-sm">Prompt</TabsTrigger>
                <TabsTrigger value="response" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-9 text-sm">
                  {selectedLog?.error ? 'Error' : 'Response'}
                </TabsTrigger>
                <TabsTrigger value="meta" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-9 text-sm">Meta</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden px-6 py-4">
              <TabsContent value="prompt" className="h-full m-0">
                <textarea 
                  className="h-full w-full overflow-auto bg-muted/30 p-3 rounded-lg border font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={rerunPrompt}
                  onChange={(e) => setRerunPrompt(e.target.value)}
                  placeholder="Enter prompt..."
                />
              </TabsContent>

              <TabsContent value="response" className="h-full m-0">
                <div className={cn(
                  "h-full overflow-auto p-3 rounded-lg border font-mono text-sm whitespace-pre",
                  selectedLog?.error ? "bg-destructive/5 text-destructive border-destructive/20" : "bg-muted/30"
                )}>
                  {selectedLog?.error ? (
                    <div className="whitespace-pre-wrap">{selectedLog.error}</div>
                  ) : (
                    <div 
                      className="syntax-highlight"
                      dangerouslySetInnerHTML={{ 
                        __html: syntaxHighlight(typeof selectedLog?.response === 'string' ? selectedLog.response : JSON.stringify(selectedLog?.response, null, 2)) 
                      }} 
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="meta" className="h-full m-0 overflow-auto">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Model</span>
                      <p className="font-medium text-sm">{selectedLog?.model}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Execution Time</span>
                      <p className="font-medium text-sm">{selectedLog?.duration_ms?.toFixed(0) ?? 'N/A'}ms</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Token Usage</span>
                      <p className="font-medium text-sm">{selectedLog?.metadata?.usage?.total_tokens ?? 'N/A'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Response Format</span>
                      <p className="font-medium text-sm text-blue-500">{selectedLog?.metadata?.format === 'dict' ? 'gen_dict' : 'gen_text'}</p>
                    </div>
                  </div>

                  {selectedLog?.metadata?.schema && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">JSON Schema</span>
                      <div 
                        className="bg-muted/30 p-2 rounded-md border text-xs overflow-auto max-h-24 font-mono whitespace-pre syntax-highlight"
                        dangerouslySetInnerHTML={{ __html: syntaxHighlight(JSON.stringify(selectedLog.metadata.schema, null, 2)) }}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          {/* Model/Format Selection Row */}
          <div className="px-6 py-3 border-t flex items-center gap-2">
            <Select value={rerunModel} onValueChange={setRerunModel}>
              <SelectTrigger className="h-8 w-[240px] text-xs">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.length > 0 ? (
                  availableModels.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                  ))
                ) : (
                  <SelectItem value={rerunModel || ""} className="text-xs">
                    {rerunModel || "No models configured"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={rerunFormat} onValueChange={(v) => setRerunFormat(v as "text" | "dict")}>
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text" className="text-xs">gen_text</SelectItem>
                <SelectItem value="dict" className="text-xs">gen_dict</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="px-6 py-3 border-t flex-row items-center justify-between sm:justify-between">
            <Button 
              size="sm"
              onClick={handleRerun} 
              disabled={rerunLoading || !rerunModel}
              className="gap-1.5"
            >
              {rerunLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" />
              )}
              Rerun
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Log</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this log entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purge Dialog */}
      <Dialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purge Old Logs</DialogTitle>
            <DialogDescription>
              Delete old logs based on your selection. <strong>Pinned</strong> logs will always be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium whitespace-nowrap">Keep:</span>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                value={purgeOption} 
                onChange={(e) => setPurgeOption(e.target.value)}
              >
                <option value="30l">Last 30 logs</option>
                <option value="1d">Last 1 day</option>
                <option value="2d">Last 2 days</option>
                <option value="3d">Last 3 days</option>
                <option value="7d">Last 1 week</option>
                <option value="30d">Last 1 month</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handlePurge}>Purge Logs</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const syntaxHighlight = (json: string) => {
  if (!json) return "";
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
    let cls = 'text-blue-500';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-purple-500 font-semibold';
      } else {
        cls = 'text-green-600 dark:text-green-400';
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-orange-500';
    } else if (/null/.test(match)) {
      cls = 'text-gray-400';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
}
