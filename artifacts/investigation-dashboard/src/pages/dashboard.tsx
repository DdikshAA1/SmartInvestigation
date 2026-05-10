import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Briefcase, AlertTriangle, Users, CheckCircle, FileText, TrendingUp } from "lucide-react";

const COLORS = ["hsl(217,91%,60%)", "hsl(160,84%,39%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(280,65%,60%)"];

const severityColor: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/30",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/10 text-green-400 border-green-500/30",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

const typeIcon: Record<string, string> = { case: "bg-blue-500/10", alert: "bg-red-500/10", complaint: "bg-yellow-500/10" };

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();

  const statCards = [
    { label: "Total Cases", value: stats?.totalCases, icon: Briefcase, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Active Cases", value: stats?.activeCases, icon: TrendingUp, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Open Complaints", value: stats?.openComplaints, icon: FileText, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "High-Priority Alerts", value: stats?.highPriorityAlerts, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
    { label: "Suspects Tracked", value: stats?.suspectsTracked, icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Resolved This Month", value: stats?.resolvedThisMonth, icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">Command Center</h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">Real-time operational overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="bg-card border-border" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-md ${s.bg} mb-3`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-12 mb-1" />
              ) : (
                <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value ?? 0}</div>
              )}
              <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">Cases by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.casesByType ?? []} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="type" tick={{ fontSize: 10, fontFamily: "Space Grotesk", fill: "hsl(215,20%,65%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "Space Grotesk", fill: "hsl(215,20%,65%)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(222,47%,11%)", border: "1px solid hsl(215,28%,17%)", borderRadius: 6, fontSize: 12, fontFamily: "Space Grotesk" }} />
                  <Bar dataKey="count" fill="hsl(217,91%,60%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">Cases by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats?.casesByStatus ?? []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} label={({ status }) => status}>
                    {(stats?.casesByStatus ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(222,47%,11%)", border: "1px solid hsl(215,28%,17%)", borderRadius: 6, fontSize: 12, fontFamily: "Space Grotesk" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !activity?.length ? (
            <p className="text-sm text-muted-foreground font-mono text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-md bg-background/50 border border-border/50" data-testid={`activity-${item.id}`}>
                  <div className={`mt-0.5 h-2.5 w-2.5 rounded-full shrink-0 ${typeIcon[item.type] ?? "bg-gray-500/10"} border border-current`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-mono font-medium truncate">{item.title}</span>
                      {item.severity && (
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${severityColor[item.severity] ?? ""}`}>
                          {item.severity}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
