import { useState, useEffect } from "react";
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
import {
  Radar,
  Shield,
  AlertTriangle,
  Network,
  Cpu,
  Globe,
  Mail,
  Phone,
  Wallet,
  User,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Lock,
  Server,
  Activity,
  History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const riskColor = (score: number) => {
  if (score >= 75) return "text-red-400";
  if (score >= 50) return "text-orange-400";
  if (score >= 25) return "text-yellow-400";
  return "text-green-400";
};
const riskBg = (score: number) => {
  if (score >= 75) return "bg-red-500/20 text-red-400 border-red-500/30";
  if (score >= 50) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  if (score >= 25) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-green-500/20 text-green-400 border-green-500/30";
};
const riskLabel = (score: number) => {
  if (score >= 75) return "Critical Threat";
  if (score >= 50) return "High Risk";
  if (score >= 25) return "Medium Alert";
  return "Low Baseline Risk";
};

const SCAN_STEPS = [
  "Activating scanner subsystem...",
  "Initializing remote OSINT requests...",
  "Resolving global public records & DNS tables...",
  "Pinging social media and repository networks...",
  "Running credential breach simulations...",
  "Analyzing risk structures and recommendations...",
];

export default function Osint() {
  const [target, setTarget] = useState("");
  const [targetType, setTargetType] = useState("social-media-profile");
  const [context, setContext] = useState("");
  const [latestResult, setLatestResult] = useState<OsintResult | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports, isLoading: reportsLoading } = useListOsintReports();
  const analyzeOsint = useAnalyzeOsint();

  // Scanning simulation steps
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (analyzeOsint.isPending) {
      setScanStep(0);
      interval = setInterval(() => {
        setScanStep((prev) => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [analyzeOsint.isPending]);

  const handleAnalyze = () => {
    if (!target.trim()) return;
    analyzeOsint.mutate({ data: { target, targetType, context: context || undefined } }, {
      onSuccess: (result) => {
        setLatestResult(result);
        queryClient.invalidateQueries({ queryKey: getListOsintReportsQueryKey() });
        setTarget("");
        setContext("");
        toast({ title: "OSINT Analysis Complete", description: `Threat Index: ${result.riskScore}/100` });
      },
      onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
    });
  };

  // Helper to parse findings
  const getParsedFindings = (result: OsintResult | null) => {
    if (!result || !result.findings) return null;
    try {
      return typeof result.findings === "string" ? JSON.parse(result.findings) : result.findings;
    } catch (e) {
      return null;
    }
  };

  const parsedFindings = getParsedFindings(latestResult);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-mono tracking-wider bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
            <Radar className="h-8 w-8 text-primary animate-pulse" /> OSINT INTELLIGENCE UNIT
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Real-world open source database verification & footprint mapper</p>
        </div>
        {latestResult && (
          <Button variant="outline" size="sm" className="font-mono text-xs hover:bg-muted self-start" onClick={() => setLatestResult(null)}>
            Clear Terminal
          </Button>
        )}
      </div>

      <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-1">
        <h2 className="text-xs font-mono font-bold text-primary uppercase tracking-wider">What is this section for?</h2>
        <p className="text-xs font-mono text-muted-foreground leading-relaxed">
          OSINT (Open Source Intelligence) helps you scan public data from the internet. You can type in a username, website domain, email, phone number, or crypto wallet to find digital footprints, location details, data breaches, and risk assessments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Scanner Form */}
        <Card className="lg:col-span-4 bg-card border-border border-primary/20 backdrop-blur-md shadow-lg shadow-black/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-primary uppercase tracking-wider flex items-center gap-2">
              <Cpu className="h-4 w-4" /> Scanner Core Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs text-muted-foreground">Target Selector</Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger className="font-mono h-10 border-border bg-background hover:bg-muted" data-testid="select-osint-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="social-media-profile" className="font-mono flex items-center gap-2">
                    <User className="h-3.5 w-3.5 inline mr-1" /> Social Profile
                  </SelectItem>
                  <SelectItem value="username" className="font-mono flex items-center gap-2">
                    <Network className="h-3.5 w-3.5 inline mr-1" /> Username
                  </SelectItem>
                  <SelectItem value="email" className="font-mono flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 inline mr-1" /> Email address
                  </SelectItem>
                  <SelectItem value="domain" className="font-mono flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 inline mr-1" /> Domain / Host
                  </SelectItem>
                  <SelectItem value="phone" className="font-mono flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 inline mr-1" /> Phone Number
                  </SelectItem>
                  <SelectItem value="wallet" className="font-mono flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5 inline mr-1" /> Crypto Wallet
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs text-muted-foreground">Intelligence Target</Label>
              <Input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={
                  targetType === "domain"
                    ? "e.g., example.com or 8.8.8.8"
                    : targetType === "email"
                    ? "e.g., suspect@domain.com"
                    : targetType === "wallet"
                    ? "e.g., Ethereum/Bitcoin wallet"
                    : targetType === "phone"
                    ? "e.g., +91 9876543210"
                    : "@username / alias..."
                }
                className="font-mono bg-background border-border h-10 placeholder-muted-foreground/60 focus-visible:ring-primary/40"
                data-testid="input-osint-target"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs text-muted-foreground">Additional Context (Optional)</Label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Known aliases, related cases, suspected criminal networks..."
                className="font-mono text-sm min-h-[90px] bg-background border-border placeholder-muted-foreground/60 resize-none focus-visible:ring-primary/40"
                data-testid="input-osint-context"
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!target.trim() || analyzeOsint.isPending}
              className="w-full font-mono font-bold uppercase tracking-wider h-11 transition-all hover:shadow-md hover:shadow-primary/20"
              data-testid="button-run-osint"
            >
              {analyzeOsint.isPending ? (
                <>
                  <Cpu className="h-4 w-4 animate-spin mr-2" /> SCANNING HOSTS...
                </>
              ) : (
                <>
                  <Radar className="h-4 w-4 mr-2" /> TRIGGER SCAN
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Dynamic Display Panel */}
        <div className="lg:col-span-8 space-y-6">
          {/* Scanning Progress Console */}
          {analyzeOsint.isPending && (
            <Card className="bg-black/95 border-primary/40 text-green-400 font-mono shadow-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Radar className="h-48 w-48 animate-spin duration-10000" />
              </div>
              <div className="flex items-center gap-3 border-b border-primary/20 pb-4 mb-4">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
                <span className="text-sm font-bold tracking-widest text-primary-foreground uppercase">OSINT ACTIVE RADAR FEED</span>
              </div>
              <div className="space-y-2.5 text-xs text-green-400/90 min-h-[220px]">
                {SCAN_STEPS.slice(0, scanStep + 1).map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 animate-fadeIn">
                    {idx < scanStep ? (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Cpu className="h-4 w-4 text-green-400 animate-spin shrink-0" />
                    )}
                    <span className={idx < scanStep ? "text-primary-foreground/75" : "text-green-400 font-bold"}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Scanned result dashboard */}
          {latestResult && !analyzeOsint.isPending && (
            <Card className="bg-card border-border border-primary/30 relative overflow-hidden shadow-2xl transition-all" data-testid="card-osint-result">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-blue-500 to-primary" />
              <CardHeader className="pb-3 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2.5 rounded-lg border border-primary/20">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold font-mono text-foreground flex items-center gap-2 flex-wrap">
                        Dossier: <span className="text-primary-foreground underline">{latestResult.target}</span>
                      </CardTitle>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">
                        Target class: <span className="text-foreground">{latestResult.targetType}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <Badge variant="outline" className={`font-mono font-bold text-xs uppercase px-2.5 py-1 ${riskBg(latestResult.riskScore)}`}>
                      {riskLabel(latestResult.riskScore)}
                    </Badge>
                    <div className={`text-3xl font-extrabold font-mono tracking-tighter ${riskColor(latestResult.riskScore)}`}>
                      {latestResult.riskScore}<span className="text-xs text-muted-foreground font-normal">/100</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Risk Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>Threat index</span>
                    <span className={riskColor(latestResult.riskScore)}>{latestResult.riskScore}% severity</span>
                  </div>
                  <Progress value={latestResult.riskScore} className="h-2 [&>div]:transition-all duration-1000" />
                </div>

                {/* Analytical Executive Summary */}
                <div className="bg-muted/40 border border-border/80 rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> Intelligence Executive Brief
                  </h3>
                  <p className="text-sm font-mono text-foreground leading-relaxed">{latestResult.summary}</p>
                </div>

                {/* Scanned Database Findings Section */}
                {parsedFindings && (
                  <div className="border border-border/60 rounded-xl p-4 bg-muted/20 space-y-4">
                    <h3 className="text-xs font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="h-3.5 w-3.5 text-primary" /> Active Footprint Scan Data
                    </h3>

                    {/* Social profiles found */}
                    {(latestResult.targetType === "social-media-profile" || latestResult.targetType === "username") && parsedFindings.profilesFound && (
                      <div className="space-y-3">
                        <p className="text-xs font-mono text-muted-foreground">Correlated social footprints resolved:</p>
                        {parsedFindings.profilesFound.length === 0 ? (
                          <div className="text-xs font-mono text-muted-foreground/60 italic py-2">No active developer or public social handles matched.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {parsedFindings.profilesFound.map((p: any, idx: number) => (
                              <a
                                key={idx}
                                href={p.profileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border hover:border-primary/40 hover:bg-muted/50 transition-all font-mono text-xs"
                              >
                                <span className="flex items-center gap-2 font-medium">
                                  <User className="h-3.5 w-3.5 text-primary" /> {p.platform}
                                </span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                                  Profile link <ExternalLink className="h-3 w-3" />
                                </span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Domain resolving data */}
                    {latestResult.targetType === "domain" && (
                      <div className="space-y-4 font-mono text-xs">
                        {/* Geo IP Location */}
                        {parsedFindings.geo && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-border/50 pb-4">
                            <div className="space-y-2">
                              <span className="text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> Geo Location</span>
                              <div className="bg-background/80 border border-border/80 rounded-lg p-2.5 space-y-1">
                                <div><span className="text-muted-foreground">Country:</span> {parsedFindings.geo.country} ({parsedFindings.geo.countryCode})</div>
                                <div><span className="text-muted-foreground">Region:</span> {parsedFindings.geo.regionName}, {parsedFindings.geo.city}</div>
                                {parsedFindings.geo.lat && parsedFindings.geo.lon && (
                                  <div className="text-[10px] text-muted-foreground mt-1.5">
                                    Coordinates: {parsedFindings.geo.lat}, {parsedFindings.geo.lon}
                                    <a
                                      href={`https://www.openstreetmap.org/?mlat=${parsedFindings.geo.lat}&mlon=${parsedFindings.geo.lon}#map=12/${parsedFindings.geo.lat}/${parsedFindings.geo.lon}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-primary hover:underline ml-2 flex items-center gap-0.5 inline-flex"
                                    >
                                      Open map <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <span className="text-muted-foreground flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-primary" /> Network ASN & ISP</span>
                              <div className="bg-background/80 border border-border/80 rounded-lg p-2.5 space-y-1">
                                <div className="truncate"><span className="text-muted-foreground">ISP:</span> {parsedFindings.geo.isp}</div>
                                <div className="truncate"><span className="text-muted-foreground">Org:</span> {parsedFindings.geo.org}</div>
                                <div className="truncate"><span className="text-muted-foreground">AS:</span> {parsedFindings.geo.as}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* DNS tables */}
                        {parsedFindings.dnsRecords && (
                          <div className="space-y-2">
                            <span className="text-muted-foreground">DNS Records Table</span>
                            <div className="bg-background/80 border border-border/80 rounded-lg p-3 space-y-2 overflow-x-auto text-[11px]">
                              {Object.keys(parsedFindings.dnsRecords).length === 0 ? (
                                <div className="italic text-muted-foreground/60">No active records resolved.</div>
                              ) : (
                                Object.entries(parsedFindings.dnsRecords).map(([type, values]: any) => (
                                  <div key={type} className="flex flex-col sm:flex-row sm:items-start gap-1 py-1 border-b border-border/30 last:border-0">
                                    <Badge variant="outline" className="w-16 justify-center text-[9px] uppercase font-bold text-primary shrink-0">{type}</Badge>
                                    <span className="text-foreground font-mono break-all pl-1">{Array.isArray(values) ? values.join(", ") : String(values)}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* Security Headers checklist */}
                        {parsedFindings.securityHeaders && (
                          <div className="space-y-2 pt-2">
                            <span className="text-muted-foreground">Web Infrastructure Security Headers</span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {Object.entries(parsedFindings.securityHeaders).map(([key, val]: any) => (
                                <div key={key} className="bg-background/80 border border-border/80 rounded-lg p-2 text-center">
                                  <div className="text-[10px] text-muted-foreground uppercase">{key}</div>
                                  <Badge variant="outline" className={`mt-1 text-[9px] ${val === "Enabled" ? "text-green-400 border-green-500/20 bg-green-500/10" : "text-yellow-400 border-yellow-500/20 bg-yellow-500/10"}`}>
                                    {val}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Email credential breaches */}
                    {latestResult.targetType === "email" && (
                      <div className="space-y-3 font-mono text-xs">
                        <span className="text-muted-foreground">Database breach scanner feed:</span>
                        {parsedFindings.breaches && parsedFindings.breaches.length > 0 ? (
                          <div className="space-y-2">
                            {parsedFindings.breaches.map((b: any, idx: number) => (
                              <div key={idx} className="bg-background border border-red-500/20 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-red-400 flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5" /> {b.source}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">{b.date}</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  Exposed: {b.exposedData.map((d: string) => <Badge key={d} variant="outline" className="text-[9px] border-red-500/20 text-red-300 mr-1 mt-0.5">{d}</Badge>)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
                            <CheckCircle2 className="h-4 w-4" /> This email did not match any public repository breach signatures.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Crypto wallet balance & ledger records */}
                    {latestResult.targetType === "wallet" && (
                      <div className="space-y-3 font-mono text-xs">
                        <span className="text-muted-foreground">Public blockchain ledger verification:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-background/80 border border-border/80 rounded-lg p-3 space-y-1.5">
                            <div><span className="text-muted-foreground">Address Type:</span> {parsedFindings.isEth ? "Ethereum ledger" : parsedFindings.isBtc ? "Bitcoin ledger" : "Unsupported"}</div>
                            <div><span className="text-muted-foreground">Ledger balance:</span> <span className="font-bold text-primary">{parsedFindings.balance}</span></div>
                            <div><span className="text-muted-foreground">Total Transaction count:</span> {parsedFindings.txCount}</div>
                          </div>
                          <div className="bg-background/80 border border-border/80 rounded-lg p-3 space-y-2 flex flex-col justify-center">
                            <p className="text-[10px] text-muted-foreground uppercase leading-relaxed">Public explorer trace is online. Monitor ledger node movements.</p>
                            <a
                              href={parsedFindings.isEth ? `https://etherscan.io/address/${latestResult.target}` : `https://www.blockchain.com/explorer/addresses/btc/${latestResult.target}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 mt-1 font-bold text-xs"
                            >
                              Trace Address Explorer <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Phone number classifications */}
                    {latestResult.targetType === "phone" && (
                      <div className="space-y-3 font-mono text-xs">
                        <span className="text-muted-foreground">Carrier block & jurisdiction mapping:</span>
                        <div className="bg-background/80 border border-border/80 rounded-lg p-3 space-y-1.5">
                          <div><span className="text-muted-foreground">Resolved Jurisdiction:</span> {parsedFindings.country}</div>
                          <div><span className="text-muted-foreground">Assigned Network Block:</span> {parsedFindings.carrier}</div>
                          <div><span className="text-muted-foreground">Cleaned E.164 Format:</span> {parsedFindings.cleaned}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Analytical breakdown grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Flags */}
                  <div className="space-y-3">
                    <p className="text-xs font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Detected Flags
                    </p>
                    <div className="space-y-2">
                      {latestResult.flags.map((f, i) => (
                        <div key={i} className="text-xs font-mono text-muted-foreground bg-red-500/5 border border-red-500/10 rounded-lg p-2.5 flex items-start gap-2">
                          <span className="text-red-400 font-bold leading-none mt-0.5">›</span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suspicious activity logs */}
                  <div className="space-y-3">
                    <p className="text-xs font-mono font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1">
                      <Activity className="h-4 w-4" /> Suspicious Behaviors
                    </p>
                    <div className="space-y-2">
                      {(latestResult.suspiciousActivity ?? []).length === 0 ? (
                        <div className="text-xs font-mono text-muted-foreground/60 italic p-3 border border-border rounded-lg">No suspicious indicators recorded.</div>
                      ) : (
                        (latestResult.suspiciousActivity ?? []).map((a, i) => (
                          <div key={i} className="text-xs font-mono text-muted-foreground bg-orange-500/5 border border-orange-500/10 rounded-lg p-2.5 flex items-start gap-2">
                            <span className="text-orange-400 font-bold leading-none mt-0.5">›</span>
                            <span>{a}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Network connections */}
                  <div className="space-y-3">
                    <p className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                      <Network className="h-4 w-4" /> Network Associations
                    </p>
                    <div className="space-y-2">
                      {(latestResult.networkConnections ?? []).length === 0 ? (
                        <div className="text-xs font-mono text-muted-foreground/60 italic p-3 border border-border rounded-lg">No structural connections mapped.</div>
                      ) : (
                        (latestResult.networkConnections ?? []).map((n, i) => (
                          <div key={i} className="text-xs font-mono text-muted-foreground bg-blue-500/5 border border-blue-500/10 rounded-lg p-2.5 flex items-start gap-2">
                            <span className="text-blue-400 font-bold leading-none mt-0.5">›</span>
                            <span>{n}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Tactical Recommendation */}
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                  <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-mono font-bold uppercase tracking-wider text-primary">Recommended Tactical Action</p>
                    <p className="text-xs font-mono leading-relaxed text-foreground/90">{latestResult.recommendation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fallback layout if no scanned reports */}
          {!latestResult && !analyzeOsint.isPending && (
            <Card className="bg-card border-dashed border-border/80 flex flex-col items-center justify-center py-16 text-center shadow-inner rounded-2xl">
              <div className="bg-muted p-4 rounded-full mb-4 border border-border">
                <Radar className="h-10 w-10 text-muted-foreground/80 animate-pulse" />
              </div>
              <h3 className="text-base font-bold font-mono text-foreground uppercase tracking-wider">No Active Scanning Session</h3>
              <p className="text-xs text-muted-foreground font-mono max-w-sm mt-1 mb-6">
                Enter an investigator target to resolve global footprint records, verify threat indicators, and run network traces.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* OSINT Scanning Logs History */}
      <div className="space-y-3">
        <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <History className="h-4 w-4" /> Intelligence Dossier Registry ({reports?.length || 0})
        </h2>
        {reportsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl bg-card" />
            ))}
          </div>
        ) : !reports?.length ? (
          <div className="text-center py-10 bg-muted/20 border border-border rounded-xl text-muted-foreground font-mono text-sm">
            No previous scanning dossiers saved.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reports.slice(0, 15).map((r) => (
              <Card
                key={r.id}
                className="bg-card border-border hover:border-primary/30 transition-all hover:shadow-md cursor-pointer group"
                onClick={() => {
                  setLatestResult(r);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                data-testid={`card-report-${r.id}`}
              >
                <CardContent className="p-4 flex justify-between gap-4 items-start">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs truncate text-foreground group-hover:text-primary transition-colors">{r.target}</span>
                      <Badge variant="outline" className="text-[9px] border-border text-muted-foreground shrink-0 uppercase tracking-wide">{r.targetType}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono leading-snug line-clamp-2">{r.summary}</p>
                    <p className="text-[9px] text-muted-foreground/60 font-mono pt-1">
                      {new Date(r.createdAt).toLocaleDateString()} at {new Date(r.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className={`text-xl font-bold font-mono shrink-0 px-2 py-0.5 rounded border ${riskBg(r.riskScore)}`}>
                    {r.riskScore}
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
