import { useState } from "react";
import { useListAlerts, useCreateAlert, useUpdateAlert, getListAlertsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CheckCircle, Eye, AlertOctagon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const severityColor: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/30",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/10 text-green-400 border-green-500/30",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};
const statusColor: Record<string, string> = {
  active: "bg-red-500/10 text-red-400 border-red-500/30",
  acknowledged: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  resolved: "bg-green-500/10 text-green-400 border-green-500/30",
};
const severityBorder: Record<string, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-green-500",
  info: "border-l-blue-500",
};

const alertSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.string().min(1),
  source: z.string().min(1),
});

export default function Alerts() {
  const [open, setOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = {
    ...(severityFilter !== "all" ? { severity: severityFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data: alerts, isLoading } = useListAlerts(params);
  const createAlert = useCreateAlert();
  const updateAlert = useUpdateAlert();

  const form = useForm({ resolver: zodResolver(alertSchema), defaultValues: { title: "", description: "", severity: "medium", source: "" } });

  const onSubmit = (values: z.infer<typeof alertSchema>) => {
    createAlert.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
        toast({ title: "Alert created" });
        setOpen(false);
        form.reset();
      },
    });
  };

  const handleStatus = (id: number, status: string) => {
    updateAlert.mutate({ id, data: { status } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Threat Alerts</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Active intelligence and threat notifications</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="font-mono gap-2" data-testid="button-create-alert"><Plus className="h-4 w-4" /> New Alert</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle className="font-mono">Create Threat Alert</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs">Alert Title</FormLabel><FormControl><Input {...field} className="font-mono" data-testid="input-alert-title" /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="severity" render={({ field }) => (
                    <FormItem><FormLabel className="font-mono text-xs">Severity</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-alert-severity"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="info">Info</SelectItem></SelectContent></Select></FormItem>
                  )} />
                  <FormField control={form.control} name="source" render={({ field }) => (
                    <FormItem><FormLabel className="font-mono text-xs">Source</FormLabel><FormControl><Input {...field} placeholder="SIEM / Intel / etc." className="font-mono" data-testid="input-alert-source" /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs">Description</FormLabel><FormControl><Textarea {...field} className="font-mono text-sm min-h-[100px]" data-testid="input-alert-description" /></FormControl></FormItem>
                )} />
                <Button type="submit" className="w-full font-mono" disabled={createAlert.isPending} data-testid="button-submit-alert">
                  {createAlert.isPending ? "Creating..." : "Create Alert"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36 font-mono" data-testid="select-severity-filter"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Severity</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="info">Info</SelectItem></SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 font-mono" data-testid="select-alert-status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="acknowledged">Acknowledged</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : !alerts?.length ? (
        <div className="text-center py-16 text-muted-foreground font-mono"><p>No alerts found</p></div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <Card key={a.id} className={`bg-card border-border border-l-4 ${severityBorder[a.severity] ?? "border-l-border"}`} data-testid={`card-alert-${a.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className={severityColor[a.severity]}>{a.severity.toUpperCase()}</Badge>
                      <Badge variant="outline" className={statusColor[a.status]}>{a.status}</Badge>
                      <span className="text-[10px] font-mono text-muted-foreground/70">via {a.source}</span>
                    </div>
                    <h3 className="font-mono font-semibold text-sm">{a.title}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-1 line-clamp-2">{a.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono mt-2">{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {a.status === "active" && (
                      <Button size="sm" variant="outline" className="font-mono text-xs h-7 gap-1" onClick={() => handleStatus(a.id, "acknowledged")} data-testid={`button-acknowledge-${a.id}`}>
                        <Eye className="h-3 w-3" /> Ack
                      </Button>
                    )}
                    {a.status !== "resolved" && (
                      <Button size="sm" variant="outline" className="font-mono text-xs h-7 gap-1 text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => handleStatus(a.id, "resolved")} data-testid={`button-resolve-${a.id}`}>
                        <CheckCircle className="h-3 w-3" /> Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
