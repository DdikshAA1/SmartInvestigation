import React, { useState } from "react";
import { Link } from "wouter";
import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Briefcase,
  AlertTriangle,
  Users,
  CheckCircle2,
  FileText,
  TrendingUp,
  ShieldAlert,
  Search,
  ArrowUpRight,
  Activity,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  Zap,
  PhoneCall,
  Flame,
  Radio,
} from "lucide-react";

const CHART_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 65%, 60%)",
];

const SEVERITY_CONFIG: Record<string, { badgeStyle: string; indicator: string }> = {
  critical: {
    badgeStyle: "bg-red-500/15 text-red-400 border-red-500/40 font-bold",
    indicator: "bg-red-500 animate-pulse",
  },
  high: {
    badgeStyle: "bg-amber-500/15 text-amber-400 border-amber-500/40 font-semibold",
    indicator: "bg-amber-500",
  },
  medium: {
    badgeStyle: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    indicator: "bg-yellow-500",
  },
  low: {
    badgeStyle: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    indicator: "bg-emerald-500",
  },
  info: {
    badgeStyle: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    indicator: "bg-blue-500",
  },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  case: { label: "INVESTIGATION CASE", icon: Briefcase, color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  alert: { label: "THREAT ALERT", icon: AlertTriangle, color: "text-red-400 bg-red-500/10 border-red-500/30" },
  complaint: { label: "CITIZEN INTAKE", icon: FileText, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading, refetch: refetchActivity } = useGetRecentActivity();
  
  const [filterType, setFilterType] = useState<"all" | "case" | "alert" | "complaint">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchStats(), refetchActivity()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredActivity = (activity ?? []).filter((item) => {
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const statCards = [
    {
      label: "TOTAL CASES",
      value: stats?.totalCases,
      trend: "+8.4%",
      trendUp: true,
      sub: "Active & archived dossiers",
      icon: Briefcase,
      accent: "from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400",
      iconBg: "bg-blue-500/15 text-blue-400",
    },
    {
      label: "ACTIVE INVESTIGATIONS",
      value: stats?.activeCases,
      trend: "LIVE",
      trendUp: true,
      sub: "Currently assigned",
      icon: TrendingUp,
      accent: "from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400",
      iconBg: "bg-amber-500/15 text-amber-400",
    },
    {
      label: "PENDING INTAKES",
      value: stats?.openComplaints,
      trend: "Golden Hour",
      trendUp: false,
      sub: "Citizen reports awaiting review",
      icon: FileText,
      accent: "from-yellow-500/20 to-yellow-600/5 border-yellow-500/30 text-yellow-400",
      iconBg: "bg-yellow-500/15 text-yellow-400",
    },
    {
      label: "HIGH PRIORITY ALERTS",
      value: stats?.highPriorityAlerts,
      trend: "CRITICAL",
      trendUp: false,
      sub: "Requires immediate officer triage",
      icon: ShieldAlert,
      accent: "from-red-500/25 to-red-600/5 border-red-500/40 text-red-400",
      iconBg: "bg-red-500/20 text-red-400 animate-pulse",
    },
    {
      label: "SUSPECTS TRACKED",
      value: stats?.suspectsTracked,
      trend: "OSINT Sync",
      trendUp: true,
      sub: "Under surveillance network",
      icon: Users,
      accent: "from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400",
      iconBg: "bg-purple-500/15 text-purple-400",
    },
    {
      label: "RESOLVED THIS MONTH",
      value: stats?.resolvedThisMonth,
      trend: "94.2% Rate",
      trendUp: true,
      sub: "Cases successfully closed",
      icon: CheckCircle2,
      accent: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400",
      iconBg: "bg-emerald-500/15 text-emerald-400",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Executive Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-card/80 border border-border/80 p-5 rounded-xl backdrop-blur-md shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-center gap-2">
              Command Intelligence Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM OPERATIONAL // DEFCON 3
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Vanguard Tactical Intelligence Monitor & Incident Response Stream
          </p>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background/60 hover:bg-muted text-xs font-mono text-foreground transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            Sync Feed
          </button>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-mono font-semibold transition-all duration-200 shadow-md shadow-primary/20"
          >
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            Launch AI Intake Workstation
          </Link>
        </div>
      </div>

      {/* KPI Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className={`bg-gradient-to-br ${s.accent} border transition-all duration-200 hover:scale-[1.02] shadow-sm`}
            data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${s.iconBg} border border-current/20`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-background/60 text-muted-foreground border border-border/50">
                  {s.trend}
                </span>
              </div>

              <div>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mb-1" />
                ) : (
                  <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
                    {s.value ?? 0}
                  </div>
                )}
                <div className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  {s.label}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground/70 truncate mt-1">
                  {s.sub}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Primary Intelligence Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Distribution Chart */}
        <Card className="bg-card border-border/80 lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
            <div>
              <CardTitle className="text-sm font-mono font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Incident Distribution by Category
              </CardTitle>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                Breakdown of active investigation cases across crime sectors
              </p>
            </div>
            <Link
              href="/cases"
              className="text-xs font-mono text-primary hover:underline inline-flex items-center gap-1"
            >
              View Cases <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-6">
            {statsLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : !stats?.casesByType?.length ? (
              <div className="h-56 flex items-center justify-center text-xs font-mono text-muted-foreground">
                No categorical case data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={stats.casesByType} margin={{ top: 10, right: 10, bottom: 20, left: -15 }}>
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 11, fontFamily: "Space Grotesk", fill: "hsl(215,20%,65%)" }}
                    axisLine={{ stroke: "hsl(215,28%,17%)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fontFamily: "Space Grotesk", fill: "hsl(215,20%,65%)" }}
                    axisLine={{ stroke: "hsl(215,28%,17%)" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(222,47%,11%)",
                      border: "1px solid hsl(215,28%,25%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontFamily: "Space Grotesk",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(217,91%,60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Case Resolution Status Breakdown */}
        <Card className="bg-card border-border/80 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-mono font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <PieChart className="h-4 w-4 text-emerald-400" />
              Operational Case Status
            </CardTitle>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
              Proportion of open vs active vs closed dossiers
            </p>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col justify-center">
            {statsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : !stats?.casesByStatus?.length ? (
              <div className="h-48 flex items-center justify-center text-xs font-mono text-muted-foreground">
                No case status data available
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={stats.casesByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      label={false}
                    >
                      {stats.casesByStatus.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="hsl(222,47%,11%)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(222,47%,11%)",
                        border: "1px solid hsl(215,28%,25%)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontFamily: "Space Grotesk",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border/40">
                  {stats.casesByStatus.map((item, index) => (
                    <div key={item.status} className="flex items-center gap-2 text-xs font-mono">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-muted-foreground capitalize truncate">{item.status}:</span>
                      <span className="font-bold text-foreground ml-auto">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lower Tactical Row: Live Dispatch Feed + Tactical Action Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Activity Feed */}
        <Card className="bg-card border-border/80 lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-mono font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                Live Dispatch & Intake Stream
              </CardTitle>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                Real-time chronological activity from emergency intakes & alerts
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-background/80 p-1 rounded-lg border border-border/50">
              {(["all", "case", "alert", "complaint"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                    filterType === t
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter dispatch feed by keyword, ID, or severity..."
                className="w-full bg-background/60 border border-border/60 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {activityLoading ? (
              <div className="space-y-3 pt-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : !filteredActivity.length ? (
              <div className="text-center py-10 space-y-2 border border-dashed border-border/50 rounded-lg">
                <Filter className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-mono text-muted-foreground">
                  No activity matching current dispatch filters
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredActivity.map((item) => {
                  const typeCfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.case;
                  const TypeIcon = typeCfg.icon;
                  const sevCfg = item.severity ? SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.medium : SEVERITY_CONFIG.medium;

                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-background/40 hover:bg-background/80 border border-border/50 hover:border-primary/40 transition-all duration-200"
                      data-testid={`activity-${item.id}`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-md ${typeCfg.color} shrink-0 mt-0.5`}>
                          <TypeIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-foreground truncate">
                              {item.title}
                            </span>
                            {item.severity && (
                              <Badge
                                variant="outline"
                                className={`text-[9px] uppercase font-mono px-1.5 py-0 ${sevCfg.badgeStyle}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full mr-1 ${sevCfg.indicator}`} />
                                {item.severity}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/30">
                        <span className="text-[10px] font-mono text-muted-foreground/70">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Link
                          href={item.type === "alert" ? "/alerts" : item.type === "complaint" ? "/complaints" : "/cases"}
                          className="text-[10px] font-mono text-primary group-hover:underline inline-flex items-center gap-0.5"
                        >
                          Inspect <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tactical Action & Protocol Panel */}
        <Card className="bg-card border-border/80 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-mono font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              Officer Triage Protocols
            </CardTitle>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
              Standard operating guidelines & emergency dispatch hotlines
            </p>
          </CardHeader>

          <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2.5">
              {/* Golden Hour Action Box */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5" />
                    GOLDEN HOUR FREEZE
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    CYBER HELPLINE 1930
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground leading-snug">
                  Immediate bank account & UPI freeze protocol active for financial cyber fraud cases under 2 hours.
                </p>
              </div>

              {/* Emergency Hotline Matrix */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-background/60 border border-border/60 text-center space-y-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">National Emergency</span>
                  <div className="text-sm font-mono font-bold text-red-400 flex items-center justify-center gap-1">
                    <PhoneCall className="h-3 w-3" /> 112
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-background/60 border border-border/60 text-center space-y-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Women Safety</span>
                  <div className="text-sm font-mono font-bold text-purple-400 flex items-center justify-center gap-1">
                    <PhoneCall className="h-3 w-3" /> 1091
                  </div>
                </div>
              </div>

              {/* Rapid Navigation Shortcuts */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-mono uppercase text-muted-foreground font-semibold">
                  Quick Intelligence Directives
                </span>
                <div className="flex flex-col gap-1.5">
                  <Link
                    href="/osint"
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-background/40 hover:bg-background/80 border border-border/40 text-xs font-mono text-foreground transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-purple-400" /> OSINT Target Profiler
                    </span>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                  </Link>

                  <Link
                    href="/crime-patterns"
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-background/40 hover:bg-background/80 border border-border/40 text-xs font-mono text-foreground transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-blue-400" /> Hotspot Sector Analytics
                    </span>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Footer Status Pill */}
            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>ACTIVE OPERATOR: OPR-404</span>
              <span className="text-emerald-400 font-semibold">ENCRYPTED LINK</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

