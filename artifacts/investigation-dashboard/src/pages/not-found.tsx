import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="bg-primary/5 border border-primary/20 rounded-full p-6">
        <Shield className="h-12 w-12 text-primary/50" />
      </div>
      <div>
        <h1 className="text-4xl font-bold font-mono text-foreground">404</h1>
        <p className="text-sm font-mono text-muted-foreground mt-2 uppercase tracking-widest">Access Denied — Route Not Found</p>
      </div>
      <Link href="/">
        <Button className="font-mono" data-testid="button-return-home">Return to Command Center</Button>
      </Link>
    </div>
  );
}
