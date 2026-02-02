import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, X, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface LogFilterBarProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  // Tag filter
  tagFilter: string;
  onTagFilterChange: (tag: string) => void;
  availableTags: string[];
  // Pagination
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  // Actions
  onRefresh: () => void;
  onPurge: () => void;
  loading?: boolean;
}

export function LogFilterBar({
  searchQuery,
  onSearchChange,
  tagFilter,
  onTagFilterChange,
  availableTags,
  page,
  totalPages,
  total,
  onPageChange,
  onRefresh,
  onPurge,
  loading = false,
}: LogFilterBarProps) {
  const [inputValue, setInputValue] = useState(searchQuery);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== searchQuery) {
        onSearchChange(inputValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, searchQuery, onSearchChange]);

  // Sync input with external searchQuery changes
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const handleClear = () => {
    setInputValue("");
    onSearchChange("");
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b bg-slate-50/50">
      {/* Search input */}
      <div className="relative w-48">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Search prompts..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="pl-8 pr-8 h-8 text-sm"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-200 transition-colors"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5 text-slate-400" />
          </button>
        )}
      </div>

      {/* Tag Filter Select */}
      <div className="w-36">
        <Select value={tagFilter} onValueChange={onTagFilterChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {availableTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Pagination */}
      <div className="flex items-center gap-1 text-sm text-slate-500">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-1 tabular-nums">
          {page}/{totalPages || 1}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || loading}
          className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="text-slate-400 ml-1">
          ({total.toLocaleString()})
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
          onClick={onPurge}
          title="Purge logs"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground shrink-0"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </div>
  );
}
