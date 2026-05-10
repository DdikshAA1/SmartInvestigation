import { useListCrimePatterns, useGetCrimeHotspots, useGetCrimePredictions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, Minus, MapPin, Brain } from "lucide-react";

const riskColor: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/30",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/10 text-green-400 border-green-500/30",
};

const CRIME_COLORS: Record<string, string> = {
  Phishing: "hsl(217,91%,60%)",
  Fraud: "hsl(38,92%,50%)",
  Hacking: "hsl(0,84%,60%)",
  "Identity Theft": "hsl(280,65%,60%)",
  Cyberstalking: "hsl(160,84%,39%)",
};

export default function CrimePatterns() {
  const { data: patterns, isLoading: patternsLoading } = useListCrimePatterns();
  const { data: hotspots, isLoading: hotspotsLoading } = useGetCrimeHotspots();
  const { data: predictions, isLoading: predictionsLoading } = useGetCrimePredictions();

  const crimeTypes = [...new Set((patterns ?? []).map((p) => p.crimeType))];
  const months = [...new Set((patterns ?? []).map((p) => p.month))].sort();

  const chartData = months.map((month) => {
    const row: Record<string, string | number> = { month: month.slice(5) };
    crimeTypes.forEach((type) => {
      const found = (patterns ?? []).find((p) => p.month === month && p.crimeType === type);
      row[type] = found?.count ?? 0;
    });
    return row;
  });

  const latestByType = crimeTypes.map((type) => {
    const latest = (patterns ?? []).filter((p) => p.crimeType === type).sort((a, b) => b.month.localeCompare(a.month))[0];
    return latest;
  }).filter(Boolean);

  const TrendIcon = ({ pct }: { pct: number }) => {
    if (pct > 5) return <TrendingUp className="h-3 w-3 text-red-400" />;
    if (pct < -5) return <TrendingDown className="h-3 w-3 text-green-400" />;
    return <Minus className="h-3 w-3 text-yellow-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono tracking-tight">Crime Analytics</h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">Pattern analysis, hotspots, and AI-powered predictions</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {patternsLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : (
          latestByType.map((p) => p && (
            <Card key={p.crimeType} className="bg-card border-border" data-testid={`stat-crime-${p.crimeType.toLowerCase()}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider truncate">{p.crimeType}</span>
                  <TrendIcon pct={p.changePercent} />
                </div>
                <div className="text-xl font-bold font-mono" style={{ color: CRIME_COLORS[p.crimeType] ?? "hsl(217,91%,60%)" }}>{p.count}</div>
                <div className={`text-[10px] font-mono ${p.changePercent > 0 ? "text-red-400" : p.changePercent < 0 ? "text-green-400" : "text-yellow-400"}`}>
                  {p.changePercent > 0 ? "+" : ""}{p.changePercent.toFixed(1)}% MoM
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Crime Trend — Last 10 Months</CardTitle>
        </CardHeader>
        <CardContent>
          {patternsLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <XAxis dataKey="month" tick={{ fontSize: 9, fontFamily: "Space Grotesk", fill: "hsl(215,20%,65%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fontFamily: "Space Grotesk", fill: "hsl(215,20%,65%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(222,47%,11%)", border: "1px solid hsl(215,28%,17%)", borderRadius: 6, fontSize: 11, fontFamily: "Space Grotesk" }} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: "Space Grotesk" }} />
                {crimeTypes.map((type) => (
                  <Line key={type} type="monotone" dataKey={type} stroke={CRIME_COLORS[type] ?? "hsl(217,91%,60%)"} strokeWidth={1.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Crime Hotspots
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hotspotsLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !hotspots?.length ? (
              <p className="text-muted-foreground font-mono text-sm text-center py-8">No hotspot data</p>
            ) : (
              <div className="space-y-2">
                {hotspots.sort((a, b) => b.incidentCount - a.incidentCount).map((h) => (
                  <div key={h.id} className="flex items-center gap-3 p-2 rounded-md bg-background/50 border border-border/50" data-testid={`hotspot-${h.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium truncate">{h.area}</span>
                        <Badge variant="outline" className={`text-[10px] ${riskColor[h.riskLevel]}`}>{h.riskLevel}</Badge>
                      </div>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground">{h.district}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{h.primaryCrimeType}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm text-foreground">{h.incidentCount}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">incidents</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-primary uppercase tracking-wider flex items-center gap-2">
              <Brain className="h-4 w-4" /> AI Predictions — {predictions?.period ?? "Next Period"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {predictionsLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <>
                <div className="space-y-3">
                  {(predictions?.predictions ?? []).map((p) => (
                    <div key={p.crimeType} data-testid={`prediction-${p.crimeType.toLowerCase()}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium">{p.crimeType}</span>
                          {p.trend === "increasing" ? <TrendingUp className="h-3 w-3 text-red-400" /> : p.trend === "decreasing" ? <TrendingDown className="h-3 w-3 text-green-400" /> : <Minus className="h-3 w-3 text-yellow-400" />}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-muted-foreground">{Math.round(p.confidence * 100)}% confidence</span>
                          <span className="font-mono font-bold text-sm">{p.predictedCount}</span>
                        </div>
                      </div>
                      <Progress value={p.confidence * 100} className="h-1.5 [&>div]:bg-primary/60" />
                    </div>
                  ))}
                </div>
                {(predictions?.highRiskAreas ?? []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-orange-400 mb-2">High Risk Areas</p>
                    <div className="flex flex-wrap gap-1">
                      {predictions!.highRiskAreas.map((a) => (
                        <Badge key={a} variant="outline" className="text-[10px] font-mono border-orange-500/30 text-orange-400">{a}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(predictions?.recommendations ?? []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-2">Recommendations</p>
                    <div className="space-y-1">
                      {predictions!.recommendations.map((r, i) => (
                        <div key={i} className="text-xs font-mono text-muted-foreground flex gap-2"><span className="text-primary/50">›</span>{r}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
