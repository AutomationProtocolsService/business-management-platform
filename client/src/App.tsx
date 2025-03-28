import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ProjectsPage from "@/pages/projects-page";
import ProjectNewPage from "@/pages/project-new-page";
import QuotesPage from "@/pages/quotes-page";
import QuoteDetailsPage from "@/pages/quote-details-page";
import InvoicesPage from "@/pages/invoices-page";
import EmployeesPage from "@/pages/employees-page";
import TimesheetsPage from "@/pages/timesheets-page";
import SurveysPage from "@/pages/surveys-page";
import InstallationsPage from "@/pages/installations-page";
import CalendarPage from "@/pages/calendar-page";
import CustomersPage from "@/pages/customers-page";
import ReportsPage from "@/pages/reports-page";
import CatalogItemsPage from "@/pages/catalog-items-page";
import SettingsPage from "@/pages/settings-page";
import { AuthProvider } from "@/hooks/use-auth";
import { SettingsProvider } from "@/hooks/use-settings";
import { NotificationsProvider } from "@/components/notifications";
import { ProtectedRoute } from "./lib/protected-route";
import Header from "./components/layout/header";
import Sidebar from "./components/layout/sidebar";

function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  
  // Don't show layout for the auth page
  if (location === '/auth') {
    return <>{children}</>;
  }
  
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/projects" component={ProjectsPage} />
      <ProtectedRoute path="/projects/new" component={ProjectNewPage} />
      <ProtectedRoute path="/quotes" component={QuotesPage} />
      <ProtectedRoute path="/quotes/:id" component={QuoteDetailsPage} />
      <ProtectedRoute path="/invoices" component={InvoicesPage} />
      <ProtectedRoute path="/employees" component={EmployeesPage} />
      <ProtectedRoute path="/timesheets" component={TimesheetsPage} />
      <ProtectedRoute path="/surveys" component={SurveysPage} />
      <ProtectedRoute path="/installations" component={InstallationsPage} />
      <ProtectedRoute path="/calendar" component={CalendarPage} />
      <ProtectedRoute path="/customers" component={CustomersPage} />
      <ProtectedRoute path="/catalog-items" component={CatalogItemsPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <NotificationsProvider>
            <AppLayout>
              <Router />
            </AppLayout>
            <Toaster />
          </NotificationsProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
