import { useState } from "react";
import { useListSuspects, useCreateSuspect, useUpdateSuspect, useGetSuspectNetwork, getListSuspectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Network } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const riskColor: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/30",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/10 text-green-400 border-green-500/30",
};
const statusColor: Record<string, string> = {
  active: "bg-red-500/10 text-red-400 border-red-500/30",
  inactive: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  arrested: "bg-green-500/10 text-green-400 border-green-500/30",
};
const riskDot: Record<string, string> = { critical: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-green-500" };

const suspectSchema = z.object({
  name: z.string().min(1),
  alias: z.string().optional(),
  riskLevel: z.string().min(1),
  nationalId: z.string().optional(),
  socialMediaProfiles: z.string().optional(),
  notes: z.string().optional(),
});

function NetworkGraph({ nodes, edges }: { nodes: { id: number; name: string; riskLevel: string; status?: string | null }[]; edges: { source: number; target: number; relationship: string }[] }) {
  if (!nodes.length) return <div className="flex items-center justify-center h-64 text-muted-foreground font-mono text-sm">No network data</div>;

  const W = 500, H = 300;
  const positions: Record<number, { x: number; y: number }> = {};
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    positions[n.id] = { x: W / 2 + (W * 0.35) * Math.cos(angle), y: H / 2 + (H * 0.38) * Math.sin(angle) };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-72 font-mono">
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="hsl(215,28%,30%)" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const s = positions[e.source], t = positions[e.target];
        if (!s || !t) return null;
        return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="hsl(215,28%,25%)" strokeWidth="1.5" strokeDasharray="4 2" markerEnd="url(#arrow)" />;
      })}
      {nodes.map((n) => {
        const p = positions[n.id];
        if (!p) return null;
        const color = n.riskLevel === "critical" ? "#ef4444" : n.riskLevel === "high" ? "#f97316" : n.riskLevel === "medium" ? "#eab308" : "#22c55e";
        return (
          <g key={n.id} data-testid={`network-node-${n.id}`}>
            <circle cx={p.x} cy={p.y} r={20} fill="hsl(222,47%,11%)" stroke={color} strokeWidth="2" />
            <circle cx={p.x} cy={p.y} r={5} fill={color} opacity="0.8" />
            <text x={p.x} y={p.y + 32} textAnchor="middle" fontSize="9" fill="hsl(215,20%,65%)" fontFamily="Space Grotesk">{n.name.split(" ")[0]}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Suspects() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = {
    ...(search ? { search } : {}),
    ...(riskFilter !== "all" ? { riskLevel: riskFilter } : {}),
  };

  const { data: suspects, isLoading } = useListSuspects(params);
  const { data: network, isLoading: networkLoading } = useGetSuspectNetwork();
  const createSuspect = useCreateSuspect();

  const form = useForm({ resolver: zodResolver(suspectSchema), defaultValues: { name: "", alias: "", riskLevel: "medium", nationalId: "", socialMediaProfiles: "", notes: "" } });

  const onSubmit = (values: z.infer<typeof suspectSchema>) => {
    createSuspect.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSuspectsQueryKey() });
        toast({ title: "Suspect added", description: "New suspect profile created." });
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Suspect Database</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Profile management and network analysis</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="font-mono gap-2" data-testid="button-add-suspect"><Plus className="h-4 w-4" /> Add Suspect</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle className="font-mono">New Suspect Profile</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel className="font-mono text-xs">Full Name</FormLabel><FormControl><Input {...field} className="font-mono" data-testid="input-suspect-name" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="alias" render={({ field }) => (
                    <FormItem><FormLabel className="font-mono text-xs">Alias / Handle</FormLabel><FormControl><Input {...field} className="font-mono" data-testid="input-suspect-alias" /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="riskLevel" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs">Risk Level</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-risk-level"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></FormItem>
                )} />
                <FormField control={form.control} name="nationalId" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs">National ID (optional)</FormLabel><FormControl><Input {...field} className="font-mono" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="socialMediaProfiles" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs">Social Media Profiles</FormLabel><FormControl><Input {...field} placeholder='{"telegram":"@handle"}' className="font-mono text-xs" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs">Notes</FormLabel><FormControl><Textarea {...field} className="font-mono text-sm min-h-[80px]" /></FormControl></FormItem>
                )} />
                <Button type="submit" className="w-full font-mono" disabled={createSuspect.isPending} data-testid="button-submit-suspect">
                  {createSuspect.isPending ? "Adding..." : "Add Suspect"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="bg-card border border-border font-mono">
          <TabsTrigger value="list" className="font-mono text-xs">Suspect List</TabsTrigger>
          <TabsTrigger value="network" className="font-mono text-xs gap-1"><Network className="h-3 w-3" /> Network Graph</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search suspects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 font-mono" data-testid="input-search-suspects" />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-36 font-mono" data-testid="select-risk-filter"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Risk</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : !suspects?.length ? (
            <div className="text-center py-16 text-muted-foreground font-mono"><p>No suspects found</p></div>
          ) : (
            <div className="space-y-3">
              {suspects.map((s) => (
                <Card key={s.id} className="bg-card border-border hover:border-primary/20 transition-colors" data-testid={`card-suspect-${s.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 h-3 w-3 rounded-full shrink-0 ${riskDot[s.riskLevel] ?? "bg-gray-500"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-sm">{s.name}</span>
                          {s.alias && <span className="text-xs text-muted-foreground font-mono">"{s.alias}"</span>}
                          <Badge variant="outline" className={riskColor[s.riskLevel]}>{s.riskLevel} risk</Badge>
                          <Badge variant="outline" className={statusColor[s.status]}>{s.status}</Badge>
                        </div>
                        {s.notes && <p className="text-xs text-muted-foreground font-mono mt-1 line-clamp-2">{s.notes}</p>}
                        {s.nationalId && <p className="text-[10px] text-muted-foreground/70 font-mono mt-1">ID: {s.nationalId}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="network" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Suspect Connection Network</CardTitle>
            </CardHeader>
            <CardContent>
              {networkLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <NetworkGraph nodes={network?.nodes ?? []} edges={network?.edges ?? []} />
              )}
              <div className="flex gap-4 mt-4 justify-center">
                {Object.entries(riskDot).map(([level, color]) => (
                  <div key={level} className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${color}`} />
                    <span className="text-[10px] font-mono text-muted-foreground capitalize">{level}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
