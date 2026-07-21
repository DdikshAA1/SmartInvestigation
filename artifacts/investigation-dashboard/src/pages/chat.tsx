import { useState, useRef, useEffect } from "react";
import {
  useListConversations,
  useCreateConversation,
  useListMessages,
  useSendMessage,
  getListConversationsQueryKey,
  getListMessagesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Send,
  Lock,
  Plus,
  User,
  Shield,
  Clock,
  AlertOctagon,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
  Cpu,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [typedMessage, setTypedMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversations, isLoading: convsLoading } = useListConversations();
  const createConv = useCreateConversation();

  const { data: messages, isLoading: messagesLoading } = useListMessages(
    selectedConvId || 0
  );

  const sendMessage = useSendMessage();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessage.isPending]);

  const handleStartSession = () => {
    const title = `Confidential Report #${Math.floor(1000 + Math.random() * 9000)}`;
    createConv.mutate({ data: { title } }, {
      onSuccess: (newConv) => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setSelectedConvId(newConv.id);
        toast({ title: "Secure Session Opened", description: `Session ID: ${newConv.title}` });
      },
      onError: () => {
        toast({ title: "Failed to open secure session", variant: "destructive" });
      }
    });
  };

  const handleSendMessage = () => {
    if (!typedMessage.trim() || !selectedConvId) return;

    const content = typedMessage;
    setTypedMessage("");

    sendMessage.mutate(
      { id: selectedConvId, data: { content } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(selectedConvId) });
          // If message contains threat keywords, notify locally as well
          const lower = content.toLowerCase();
          const dangerKeywords = ["kill", "abuse", "violence", "threat", "weapon", "forced", "hurt", "danger", "fight", "assault"];
          if (dangerKeywords.some(keyword => lower.includes(keyword))) {
            toast({
              title: "⚠️ High Priority Triggered",
              description: "A private high-severity Threat Alert has been dispatched to duty supervisors.",
              variant: "destructive",
            });
          }
        },
        onError: () => {
          toast({ title: "Failed to transmit report", variant: "destructive" });
        }
      }
    );
  };

  const activeConv = conversations?.find((c) => c.id === selectedConvId);

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      {/* Title Header */}
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 font-mono text-[10px] py-0.5 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> PRIVATE & CONFIDENTIAL
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">Admin Notification Pipeline Active</span>
        </div>
        <h1 className="text-3xl font-extrabold font-mono tracking-wider uppercase bg-gradient-to-r from-red-400 via-primary to-orange-400 bg-clip-text text-transparent mt-1 flex items-center gap-2">
          <Lock className="h-7 w-7 text-red-500" /> SECURE REPORT INTAKE
        </h1>
      </div>

      <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-1 shrink-0">
        <h2 className="text-xs font-mono font-bold text-primary uppercase tracking-wider">What is this section for?</h2>
        <p className="text-xs font-mono text-muted-foreground leading-relaxed">
          This is a secure, private chat where citizens can report crimes or share anonymous tips. The assistant uses AI to understand the report and will automatically flag urgent threats.
        </p>
      </div>

      {/* Main Panel grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Session list */}
        <Card className={`md:col-span-4 bg-card border-border border-red-500/10 flex flex-col min-h-0 ${selectedConvId ? "hidden md:flex" : "flex"}`}>
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> SECURE THREADS
              </span>
              <Button size="sm" onClick={handleStartSession} disabled={createConv.isPending} className="h-8 font-mono text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5">
                <Plus className="h-3.5 w-3.5" /> NEW INTAKE
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-grow overflow-y-auto p-3 space-y-2 min-h-0">
            {convsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : !conversations?.length ? (
              <div className="text-center py-10 text-muted-foreground font-mono text-xs border border-dashed border-border rounded-lg mt-2">
                No active secure reports found.
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={`p-3 rounded-lg border font-mono text-xs flex items-center justify-between cursor-pointer transition-all ${
                    selectedConvId === c.id
                      ? "bg-red-500/10 border-red-500/30 text-primary-foreground font-bold"
                      : "bg-background border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Lock className={`h-3.5 w-3.5 shrink-0 ${selectedConvId === c.id ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
                    <span className="truncate">{c.title}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Side: Chat Message Screen */}
        <Card className={`md:col-span-8 bg-card border-border border-red-500/10 flex flex-col min-h-0 ${!selectedConvId ? "hidden md:flex" : "flex"}`}>
          {selectedConvId && activeConv ? (
            <>
              {/* Active Header */}
              <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedConvId(null)} className="md:hidden h-8 w-8 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle className="text-sm font-mono font-bold text-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-500" /> {activeConv.title}
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">
                      Status: <span className="text-green-400">Encrypted Intake Channel</span>
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] font-mono border-red-500/20 bg-red-500/5 text-red-400 py-0.5">
                  ALERTS LINKED
                </Badge>
              </CardHeader>

              {/* Message Feed */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {messagesLoading ? (
                  <div className="space-y-4">
                    <div className="flex gap-3"><Skeleton className="h-10 w-2/3 rounded-xl" /></div>
                    <div className="flex justify-end gap-3"><Skeleton className="h-10 w-2/3 rounded-xl" /></div>
                  </div>
                ) : (
                  messages?.map((m) => (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-start gap-2.5`}>
                      {m.role !== "user" && (
                        <div className="h-8 w-8 rounded bg-red-950/40 border border-red-500/20 flex items-center justify-center shrink-0">
                          <Lock className="h-3.5 w-3.5 text-red-500" />
                        </div>
                      )}
                      <div className="flex flex-col space-y-1 max-w-[75%]">
                        <div
                          className={`p-3 rounded-2xl text-xs font-mono leading-relaxed border ${
                            m.role === "user"
                              ? "bg-red-600 text-white border-red-700 rounded-tr-none"
                              : "bg-muted border-border text-foreground rounded-tl-none"
                          }`}
                        >
                          {m.content}
                        </div>
                        <span className={`text-[9px] font-mono text-muted-foreground/60 ${m.role === "user" ? "text-right" : "text-left"}`}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {m.role === "user" && (
                        <div className="h-8 w-8 rounded bg-muted border border-border flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {/* Typing Loader */}
                {sendMessage.isPending && (
                  <div className="flex justify-start items-center gap-2.5">
                    <div className="h-8 w-8 rounded bg-red-950/40 border border-red-500/20 flex items-center justify-center shrink-0 animate-pulse">
                      <Lock className="h-3.5 w-3.5 text-red-500" />
                    </div>
                    <div className="bg-muted border border-border p-3 rounded-2xl rounded-tl-none text-xs font-mono text-muted-foreground flex items-center gap-2">
                      <Cpu className="h-3.5 w-3.5 animate-spin text-red-400" />
                      <span>Support bot analyzing threat vectors...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Quick Prompt Shortcuts */}
              <div className="px-3 pt-2 pb-1 bg-muted/10 border-t border-border/50 shrink-0 flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider shrink-0 mr-1">Quick Help:</span>
                <button
                  type="button"
                  onClick={() => setTypedMessage("Mera bank account se paise kat gaye hain, cyber fraud ho gaya hai.")}
                  className="text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-2 py-1 rounded-md shrink-0 transition-colors"
                >
                  💳 Cyber Fraud (1930)
                </button>
                <button
                  type="button"
                  onClick={() => setTypedMessage("Mera mobile phone lost/chori ho gaya hai. IMEI block kaise karein?")}
                  className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 px-2 py-1 rounded-md shrink-0 transition-colors"
                >
                  📱 Stolen Phone (CEIR)
                </button>
                <button
                  type="button"
                  onClick={() => setTypedMessage("Kisi ne social media par fake account/blackmail shuru kiya hai.")}
                  className="text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 px-2 py-1 rounded-md shrink-0 transition-colors"
                >
                  🛡️ Cyberstalking / Blackmail
                </button>
                <button
                  type="button"
                  onClick={() => setTypedMessage("Mujhe emergency safety ki zaroorat hai, physical threat hai.")}
                  className="text-[10px] font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 px-2 py-1 rounded-md shrink-0 transition-colors"
                >
                  🚨 Emergency Safety (112)
                </button>
              </div>

              {/* Message Ingestion Form */}
              <div className="p-3 border-t border-border bg-muted/20 shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Describe your issue (fraud, theft, harassment, location, evidence)..."
                    className="font-mono text-xs bg-background border-border h-10 flex-grow placeholder-muted-foreground/60"
                  />
                  <Button size="icon" onClick={handleSendMessage} disabled={!typedMessage.trim() || sendMessage.isPending} className="h-10 w-10 shrink-0 bg-red-600 hover:bg-red-700 text-white">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[9px] font-mono text-muted-foreground/50 text-center mt-2 flex items-center justify-center gap-1">
                  <AlertOctagon className="h-3 w-3 text-red-500" /> Helpline Quick Reference: Cyber Fraud 1930 | National Emergency 112 | Portal: cybercrime.gov.in
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20 mb-4 animate-pulse">
                <Lock className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-sm font-mono font-bold text-foreground uppercase tracking-widest">CONFIDENTIAL COMMUNICATIONS CHANNEL</h3>
              <p className="text-xs text-muted-foreground font-mono max-w-sm mt-1 mb-6">
                All records resolved through this portal bypass standard indexing. High-priority threat keywords trigger instantaneous supervisor console alarms.
              </p>
              <Button onClick={handleStartSession} className="font-mono text-xs bg-red-600 hover:bg-red-700 text-white uppercase tracking-wider">
                Initiate Secure Intake Session
              </Button>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
