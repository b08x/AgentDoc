import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  FileText, 
  Brain, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  Plus, 
  History, 
  ChevronRight,
  Download,
  Trash2,
  Loader2,
  Sparkles
} from "lucide-react";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import { generateAgentDoc, analyzeMedia, type AgentDoc, type ChatMessage } from "@/lib/gemini";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useHighThinking, setUseHighThinking] = useState(false);
  const [docs, setDocs] = useState<AgentDoc[]>([]);
  const [activeDoc, setActiveDoc] = useState<AgentDoc | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const responseText = await generateAgentDoc(input, messages, useHighThinking);
      const modelMessage: ChatMessage = { role: "model", text: responseText };
      setMessages((prev) => [...prev, modelMessage]);

      // If it looks like a full doc, save it
      if (responseText.includes("# ") || responseText.length > 500) {
        const titleMatch = responseText.match(/^# (.*)/m);
        const title = titleMatch ? titleMatch[1] : "Untitled Agent Doc";
        const newDoc: AgentDoc = {
          id: Date.now().toString(),
          title,
          content: responseText,
          createdAt: new Date().toLocaleString(),
        };
        setDocs((prev) => [newDoc, ...prev]);
        setActiveDoc(newDoc);
      }
    } catch (error) {
      console.error("Generation error:", error);
      setMessages((prev) => [...prev, { role: "model", text: "Sorry, I encountered an error while generating the documentation." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !mediaType) return;

    setIsLoading(true);
    setShowMediaDialog(false);
    
    const userMsg = `[Uploaded ${mediaType}: ${file.name}]`;
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);

    try {
      const analysis = await analyzeMedia(file, mediaType);
      setMessages(prev => [...prev, { role: "model", text: analysis }]);
    } catch (error) {
      console.error("Media analysis error:", error);
      setMessages(prev => [...prev, { role: "model", text: "Failed to analyze the media file." }]);
    } finally {
      setIsLoading(false);
      setMediaType(null);
    }
  };

  const deleteDoc = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
    if (activeDoc?.id === id) setActiveDoc(null);
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-sans overflow-hidden dark">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.05),transparent_70%)] pointer-events-none" />
      {/* Sidebar - History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-80 border-r bg-muted/30 flex flex-col"
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <History className="w-4 h-4" />
                Documentation History
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {docs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No documents generated yet.
                </div>
              ) : (
                docs.map((doc) => (
                  <div 
                    key={doc.id}
                    className={cn(
                      "group p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent",
                      activeDoc?.id === doc.id ? "bg-accent border-primary/50" : "bg-card"
                    )}
                    onClick={() => setActiveDoc(doc)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium text-sm truncate pr-4">{doc.title}</h3>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDoc(doc.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{doc.createdAt}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 border-b flex items-center justify-between px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {!showHistory && (
              <Button variant="ghost" size="icon" onClick={() => setShowHistory(true)}>
                <History className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="font-bold text-lg tracking-tight flex items-center gap-2 text-primary drop-shadow-[0_0_8px_rgba(0,255,255,0.3)]">
                <Sparkles className="w-5 h-5" />
                AgentDoc Architect
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Technical Documentation for Generative AI Agents</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant={useHighThinking ? "default" : "outline"} 
              size="sm" 
              className={cn(
                "gap-2 transition-all duration-500",
                useHighThinking && "shadow-[0_0_15px_rgba(0,255,255,0.4)] border-primary"
              )}
              onClick={() => setUseHighThinking(!useHighThinking)}
            >
              <Brain className={cn("w-4 h-4", useHighThinking && "animate-pulse")} />
              <span className="hidden sm:inline">{useHighThinking ? "High Thinking ON" : "High Thinking OFF"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              setMessages([]);
              setActiveDoc(null);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </header>

        {/* Workspace */}
        <main className="flex-1 flex overflow-hidden">
          {/* Chat Section */}
          <div className={cn(
            "flex flex-col border-r transition-all duration-300",
            activeDoc ? "w-1/2" : "w-full"
          )}>
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
            >
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Welcome to AgentDoc Architect</h2>
                    <p className="text-muted-foreground">
                      Describe your AI agent's purpose, capabilities, and constraints. I'll help you architect and document the entire system.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <Button variant="outline" className="text-xs h-auto py-3 px-4 justify-start text-left" onClick={() => setInput("Architect a multi-agent system for automated code review and security auditing.")}>
                      "Architect a multi-agent system for code review..."
                    </Button>
                    <Button variant="outline" className="text-xs h-auto py-3 px-4 justify-start text-left" onClick={() => setInput("Generate documentation for a customer support agent with RAG and tool-use.")}>
                      "Generate documentation for a support agent..."
                    </Button>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i} 
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm",
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-muted rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Architecting documentation...
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
              <div className="max-w-3xl mx-auto relative flex items-center gap-2">
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9" 
                    onClick={() => {
                      setMediaType('image');
                      setShowMediaDialog(true);
                    }}
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9"
                    onClick={() => {
                      setMediaType('video');
                      setShowMediaDialog(true);
                    }}
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9"
                    onClick={() => {
                      setMediaType('audio');
                      setShowMediaDialog(true);
                    }}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                </div>
                <Input 
                  placeholder="Describe your AI agent..." 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1 pr-12 h-11 rounded-full border-muted-foreground/20 focus-visible:ring-primary"
                />
                <Button 
                  size="icon" 
                  className="absolute right-1 h-9 w-9 rounded-full"
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Documentation Preview Section */}
          <AnimatePresence>
            {activeDoc && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 flex flex-col bg-muted/10 overflow-hidden"
              >
                <div className="p-4 border-b flex items-center justify-between bg-background/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm truncate max-w-[200px]">{activeDoc.title}</h2>
                      <p className="text-[10px] text-muted-foreground">Generated on {activeDoc.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-2">
                      <Download className="w-3 h-3" />
                      Export PDF
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveDoc(null)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-background m-4 rounded-xl border shadow-sm">
                  <div className="max-w-2xl mx-auto markdown-body">
                    <Markdown>{activeDoc.content}</Markdown>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Media Upload Dialog */}
      {showMediaDialog && (
        <Dialog>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="capitalize">Upload {mediaType}</DialogTitle>
              <DialogDescription>
                Upload a {mediaType} file to analyze for technical requirements and architectural patterns.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed rounded-xl border-muted-foreground/20 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="p-4 bg-primary/5 rounded-full mb-4">
                {mediaType === 'image' && <ImageIcon className="w-8 h-8 text-primary" />}
                {mediaType === 'video' && <Video className="w-8 h-8 text-primary" />}
                {mediaType === 'audio' && <Mic className="w-8 h-8 text-primary" />}
              </div>
              <p className="text-sm font-medium">Click to select or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-1">Supports PNG, JPG, MP4, MP3, WAV</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept={mediaType === 'image' ? "image/*" : mediaType === 'video' ? "video/*" : "audio/*"}
                onChange={handleFileUpload}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => {
                setShowMediaDialog(false);
                setMediaType(null);
              }}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
