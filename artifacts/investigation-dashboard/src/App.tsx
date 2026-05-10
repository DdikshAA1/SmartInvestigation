import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "@/components/layout";

import Dashboard from "@/pages/dashboard";
import Cases from "@/pages/cases";
import Complaints from "@/pages/complaints";
import Suspects from "@/pages/suspects";
import Alerts from "@/pages/alerts";
import Osint from "@/pages/osint";
import CrimePatterns from "@/pages/crime-patterns";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/cases" component={Cases} />
        <Route path="/complaints" component={Complaints} />
        <Route path="/suspects" component={Suspects} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/osint" component={Osint} />
        <Route path="/crime-patterns" component={CrimePatterns} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
