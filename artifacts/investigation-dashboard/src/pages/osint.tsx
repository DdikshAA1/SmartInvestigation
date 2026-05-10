import { useState } from "react";
import { useAnalyzeOsint, useListOsintReports, getListOsintReportsQueryKey } from "@workspace/api-client-react";
import type { OsintResult } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Radar, Shield, AlertTriangle, Network, Cpu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const riskColor = (score: number) => {
  if (score >= 75) return "text-red-400";
  if (score >= 50) return "text-orange-400";
  if (score >= 25) return "text-yellow-400";
  return "text-green-400";
};
const riskBg = (score: number) => {
  if (score >= 75) return "bg-red-500";
  if (score >= 50) return "bg-orange-500";
  if (score >= 25) return "bg-yellow-500";
  return "bg-green-500";
};
const riskLabel = (score: number) => {
  if (score >= 75) return "Critical Risk";
  if (score >= 50) return "High Risk";
  if (score >= 25) return "Moderate Risk";
  return "Low Risk";
};

export default function Osint() {
  const [target, setTarget] = useState("");
  const [targetType, setTargetType] = useState("social-media-profile");
  const [context, setContext] = useState("");
  const [latestResult, setLatestResult] = useState<OsintResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports, isLoading: reportsLoading } = useListOsintReports();
  const analyzeOsint = useAnalyzeOsint();

  const handleAnalyze = () => {
    if (!target.trim()) return;
    analyzeOsint.mutate({ data: { target, targetType, context: context || undefined } }, {
      onSuccess: (result) => {
        setLatestResult(result);
        queryClient.invalidateQueries({ queryKey: getListOsintReportsQueryKey() });
        setTarget("");
        setContext("");
        toast({ title: "OSINT Analysis Complete", description: `Risk score: ${result.riskScore}/100` });
      },
      onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono tracking-tight">OSINT Analysis</h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">AI-powered open source intelligence investigation</p>
      </div>

      <Card className="bg-card border-border border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono text-primary uppercase tracking-wider flex items-center gap-2">
            <Radar className="h-4 w-4" /> Intelligence Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <Label className="font-mono text-xs text-muted-foreground">Target</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="@username / URL / email / profile..." className="font-mono" data-testid="input-osint-target" />
            </div>
            <div className="space-y-1">
              <Label className="font-mono text-xs text-muted-foreground">Target Type</Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger className="font-mono" data-testid="select-osint-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="social-media-profile">Social Media Profile</SelectItem>
                  <SelectItem value="username">Username</SelectItem>
                  <SelectItem value="email">Email Address</SelectItem>
                  <SelectItem value="domain">Domain / URL</SelectItem>
                  <SelectItem value="phone">Phone Number</SelectItem>
                  <SelectItem value="wallet">Crypto Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="font-mono text-xs text-muted-foreground">Additional Context (optional)</Label>
            <Textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Known aliases, related cases, suspected activities..." className="font-mono text-sm min-h-[60px]" data-testid="input-osint-context" />
          </div>
          <Button onClick={handleAnalyze} disabled={!target.trim() || analyzeOsint.isPending} className="font-mono gap-2" data-testid="button-run-osint">
            {analyzeOsint.isPending ? <><Cpu className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Radar className="h-4 w-4" /> Run OSINT Analysis</>}
          </Button>
        </CardContent>
      </Card>

      {latestResult && (
        <Card className="bg-card border-border border-primary/30" data-testid="card-osint-result">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Analysis: {latestResult.target}
              </CardTitle>
              <div className={`text-xl font-bold font-mono ${riskColor(latestResult.riskScore)}`}>
                {latestResult.riskScore}/100
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-muted-foreground mb-1">
                <span>Risk Score</span><span className={riskColor(latestResult.riskScore)}>{riskLabel(latestResult.riskScore)}</span>
              </div>
              <Progress value={latestResult.riskScore} className="h-2 [&>div]:transition-all" />
            </div>
            <p className="text-sm font-mono text-foreground bg-background/50 rounded-md p-3 border border-border">{latestResult.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-red-400 mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Flags</p>
                <div className="space-y-1">
                  {latestResult.flags.map((f, i) => <div key={i} className="text-xs font-mono text-muted-foreground flex gap-2"><span className="text-red-400/50">›</span>{f}</div>)}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-orange-400 mb-2">Suspicious Activity</p>
                <div className="space-y-1">
                  {(latestResult.suspiciousActivity ?? []).map((a, i) => <div key={i} className="text-xs font-mono text-muted-foreground flex gap-2"><span className="text-orange-400/50">›</span>{a}</div>)}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1"><Network className="h-3 w-3" /> Connections</p>
                <div className="space-y-1">
                  {(latestResult.networkConnections ?? []).map((n, i) => <div key={i} className="text-xs font-mono text-muted-foreground flex gap-2"><span className="text-blue-400/50">›</span>{n}</div>)}
                </div>
              </div>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-1">Recommended Action</p>
              <p className="text-xs font-mono">{latestResult.recommendation}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Previous Reports</h2>
        {reportsLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : !reports?.length ? (
          <div className="text-center py-8 text-muted-foreground font-mono text-sm">No previous OSINT reports</div>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <Card key={r.id} className="bg-card border-border hover:border-primary/20 transition-colors" data-testid={`card-report-${r.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-sm truncate">{r.target}</span>
                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground shrink-0">{r.targetType}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 line-clamp-1">{r.summary}</p>
                      <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                    <div className={`text-lg font-bold font-mono shrink-0 ${riskColor(r.riskScore)}`}>{r.riskScore}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
