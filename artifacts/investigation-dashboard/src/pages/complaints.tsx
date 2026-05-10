import { useState } from "react";
import { useListComplaints, useCreateComplaint, useUpdateComplaint, useAnalyzeComplaint, getListComplaintsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Cpu, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const urgencyColor: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/30",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/10 text-green-400 border-green-500/30",
};
const statusColor: Record<string, string> = {
  pending: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  "under-review": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  resolved: "bg-green-500/10 text-green-400 border-green-500/30",
  dismissed: "bg-red-500/10 text-red-400 border-red-500/30",
};

const complaintSchema = z.object({
  complainantName: z.string().min(1),
  contactInfo: z.string().min(1),
  description: z.string().min(1),
});

export default function Complaints() {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = {
    ...(urgencyFilter !== "all" ? { urgency: urgencyFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data: complaints, isLoading } = useListComplaints(params);
  const createComplaint = useCreateComplaint();
  const analyzeComplaint = useAnalyzeComplaint();

  const form = useForm({ resolver: zodResolver(complaintSchema), defaultValues: { complainantName: "", contactInfo: "", description: "" } });

  const onSubmit = (values: z.infer<typeof complaintSchema>) => {
    createComplaint.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListComplaintsQueryKey() });
        toast({ title: "Complaint submitted", description: "Citizen complaint recorded." });
        setOpen(false);
        form.reset();
      },
    });
  };

  const handleAnalyze = (id: number) => {
    analyzeComplaint.mutate({ id }, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getListComplaintsQueryKey() });
        toast({ title: "AI Analysis Complete", description: `Urgency: ${result.urgency} | Category: ${result.category}` });
        setExpandedId(id);
      },
      onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Citizen Complaints</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">NLP-powered complaint triage and analysis</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="font-mono gap-2" data-testid="button-new-complaint">
              <Plus className="h-4 w-4" /> New Complaint
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle className="font-mono">Submit Citizen Complaint</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="complainantName" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs">Complainant Name</FormLabel><FormControl><Input {...field} className="font-mono" data-testid="input-complainant-name" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="contactInfo" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs">Contact Info</FormLabel><FormControl><Input {...field} placeholder="Email / phone..." className="font-mono" data-testid="input-contact-info" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs">Complaint Description</FormLabel><FormControl><Textarea {...field} className="font-mono text-sm min-h-[120px]" placeholder="Describe the incident in detail..." data-testid="input-complaint-description" /></FormControl></FormItem>
                )} />
                <Button type="submit" className="w-full font-mono" disabled={createComplaint.isPending} data-testid="button-submit-complaint">
                  {createComplaint.isPending ? "Submitting..." : "Submit Complaint"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-36 font-mono" data-testid="select-urgency-filter"><SelectValue placeholder="Urgency" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Urgency</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 font-mono" data-testid="select-status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="under-review">Under Review</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="dismissed">Dismissed</SelectItem></SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : !complaints?.length ? (
        <div className="text-center py-16 text-muted-foreground font-mono"><p className="text-lg">No complaints found</p></div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => {
            const isExpanded = expandedId === c.id;
            const keywords: string[] = (() => { try { return c.keywords ? JSON.parse(c.keywords) : []; } catch { return []; } })();
            return (
              <Card key={c.id} className="bg-card border-border" data-testid={`card-complaint-${c.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={urgencyColor[c.urgency]}>{c.urgency}</Badge>
                        <Badge variant="outline" className={statusColor[c.status]}>{c.status}</Badge>
                        {c.category !== "uncategorized" && <Badge variant="outline" className="text-[10px] border-border text-muted-foreground font-mono">{c.category}</Badge>}
                      </div>
                      <h3 className="font-mono font-semibold text-sm">{c.complainantName}</h3>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{c.contactInfo}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-2 line-clamp-2">{c.description}</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="font-mono text-xs gap-1 h-7" onClick={() => handleAnalyze(c.id)} disabled={analyzeComplaint.isPending} data-testid={`button-analyze-${c.id}`}>
                        <Cpu className="h-3 w-3" /> Analyze
                      </Button>
                      <Button size="sm" variant="ghost" className="font-mono text-xs gap-1 h-7" onClick={() => setExpandedId(isExpanded ? null : c.id)} data-testid={`button-expand-${c.id}`}>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  {isExpanded && c.aiSummary && (
                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="bg-primary/5 border border-primary/20 rounded-md p-3 space-y-2">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">AI Analysis</p>
                        <p className="text-xs font-mono text-foreground">{c.aiSummary}</p>
                        {keywords.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {keywords.map((kw) => (
                              <Badge key={kw} variant="outline" className="text-[10px] font-mono border-primary/30 text-primary/80">{kw}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 font-mono">{new Date(c.createdAt).toLocaleString()}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
