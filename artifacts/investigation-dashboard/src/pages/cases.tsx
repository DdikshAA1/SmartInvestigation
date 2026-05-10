import { useState } from "react";
import { useListCases, useCreateCase, useUpdateCase, useDeleteCase, getListCasesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Search, Trash2, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const priorityColor: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/30",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/10 text-green-400 border-green-500/30",
};
const statusColor: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  active: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  closed: "bg-green-500/10 text-green-400 border-green-500/30",
  pending: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

const caseSchema = z.object({
  title: z.string().min(1),
  type: z.string().min(1),
  priority: z.string().min(1),
  description: z.string().min(1),
  officerAssigned: z.string().min(1),
  notes: z.string().optional(),
});

type CaseFormValues = z.infer<typeof caseSchema>;

export default function Cases() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = {
    ...(search ? { search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(priorityFilter !== "all" ? { priority: priorityFilter } : {}),
  };

  const { data: cases, isLoading } = useListCases(params);
  const createCase = useCreateCase();
  const updateCase = useUpdateCase();
  const deleteCase = useDeleteCase();

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: { title: "", type: "phishing", priority: "medium", description: "", officerAssigned: "", notes: "" },
  });

  const onSubmit = (values: CaseFormValues) => {
    createCase.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
        toast({ title: "Case created", description: "New case added successfully." });
        setOpen(false);
        form.reset();
      },
      onError: () => toast({ title: "Error", description: "Failed to create case.", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Case Management</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Cybercrime investigations tracker</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="font-mono gap-2" data-testid="button-create-case">
              <Plus className="h-4 w-4" /> New Case
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-mono">Open New Case</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs">Case Title</FormLabel><FormControl><Input {...field} placeholder="Operation name..." className="font-mono" data-testid="input-case-title" /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormLabel className="font-mono text-xs">Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-case-type"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="phishing">Phishing</SelectItem><SelectItem value="hacking">Hacking</SelectItem><SelectItem value="fraud">Fraud</SelectItem><SelectItem value="identity-theft">Identity Theft</SelectItem><SelectItem value="cyberstalking">Cyberstalking</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></FormItem>
                  )} />
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem><FormLabel className="font-mono text-xs">Priority</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-case-priority"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="officerAssigned" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs">Assigned Officer</FormLabel><FormControl><Input {...field} placeholder="Officer name..." className="font-mono" data-testid="input-officer" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs">Description</FormLabel><FormControl><Textarea {...field} placeholder="Case details..." className="font-mono text-sm min-h-[80px]" data-testid="input-case-description" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs">Notes (optional)</FormLabel><FormControl><Textarea {...field} className="font-mono text-sm min-h-[60px]" /></FormControl></FormItem>
                )} />
                <Button type="submit" className="w-full font-mono" disabled={createCase.isPending} data-testid="button-submit-case">
                  {createCase.isPending ? "Creating..." : "Create Case"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search cases..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 font-mono" data-testid="input-search-cases" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 font-mono" data-testid="select-filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36 font-mono" data-testid="select-filter-priority"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Priority</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !cases?.length ? (
        <div className="text-center py-16 text-muted-foreground font-mono">
          <p className="text-lg">No cases found</p>
          <p className="text-sm mt-2">Adjust filters or create a new case</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Card key={c.id} className="bg-card border-border hover:border-primary/30 transition-colors" data-testid={`card-case-${c.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className={priorityColor[c.priority]}>{c.priority}</Badge>
                      <Badge variant="outline" className={statusColor[c.status]}>{c.status}</Badge>
                      <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">{c.type}</Badge>
                    </div>
                    <h3 className="font-mono font-semibold text-sm text-foreground">{c.title}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-1 line-clamp-2">{c.description}</p>
                    <div className="flex gap-4 mt-2">
                      <span className="text-[10px] font-mono text-muted-foreground/70">Officer: {c.officerAssigned}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/70">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      updateCase.mutate({ id: c.id, data: { status: c.status === "open" ? "active" : c.status === "active" ? "closed" : "open" } }, {
                        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() }),
                      });
                    }} data-testid={`button-toggle-status-${c.id}`}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => {
                      deleteCase.mutate({ id: c.id }, {
                        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() }),
                      });
                    }} data-testid={`button-delete-case-${c.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
