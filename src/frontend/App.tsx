import { useState, useCallback } from "react";
import { MessageSquare } from "lucide-react";
import { Layout } from "./components/Layout";
import LogsPage from "./components/LogsPage";
import ChatModal from "./components/ChatModal";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";

function App() {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleRerunFromLog = useCallback((prompt: string) => {
    setChatInitialPrompt(prompt);
    setChatOpen(true);
  }, []);

  const handleChatOpenChange = useCallback((open: boolean) => {
    setChatOpen(open);
    if (!open) {
      setChatInitialPrompt(undefined);
    }
  }, []);

  // Secondary bar with only Test button
  const secondaryBar = (
    <Button
      size="sm"
      className="h-8 px-3 gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
      onClick={() => setChatOpen(true)}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      Test
    </Button>
  );

  return (
    <>
      <Layout secondaryBar={secondaryBar}>
        {/* Main Content - Log Browser with integrated filter bar */}
        <div className="bg-white rounded-xl border shadow-sm h-[calc(100vh-140px)]">
          <LogsPage
            refreshTrigger={refreshTrigger}
            onRefresh={handleRefresh}
            onRerun={handleRerunFromLog}
          />
        </div>
      </Layout>
      
      <ChatModal 
        open={chatOpen} 
        onOpenChange={handleChatOpenChange} 
        onSuccess={() => {
          handleRefresh();
          window.dispatchEvent(new CustomEvent("refresh-logs"));
        }}
        initialPrompt={chatInitialPrompt}
      />

      <Toaster />
    </>
  );
}

export default App;
