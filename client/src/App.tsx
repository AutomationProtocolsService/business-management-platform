import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import AcceptInvitationPage from "@/pages/accept-invitation-page";
import SimpleDashboard from "@/pages/simple-dashboard";
import ProjectsPage from "@/pages/projects-page";
import ProjectNewPage from "@/pages/project-new-page";
import QuotesPage from "@/pages/quotes-page";
import QuoteDetailsPage from "@/pages/quote-details-page";
import QuoteEditPage from "@/pages/quote-edit-page";
import InvoicesPage from "@/pages/invoices-page";
import InvoiceDetailsPage from "@/pages/invoice-details-page";
import EmployeesPage from "@/pages/employees-page";
import TimesheetsPage from "@/pages/timesheets-page";
import NewTimesheetPage from "@/pages/new-timesheet-page";
import SurveysPage from "@/pages/surveys-page";
import InstallationsPage from "@/pages/installations-page";
import CalendarPage from "@/pages/calendar-page";
import CustomersPage from "@/pages/customers-page";
import ReportsPage from "@/pages/reports-page";
import CatalogItemsPage from "@/pages/catalog-items-page";
import SuppliersPage from "@/pages/suppliers-page";
import ExpensesPage from "@/pages/expenses-page";
import PurchaseOrdersPage from "@/pages/purchase-orders-page";
import POCreatePage from "@/pages/POCreatePage";
import PODetailsPage from "@/pages/PODetailsPage";
import InventoryPage from "@/pages/inventory-page";
import SettingsPage from "@/pages/settings-page";
import ProfilePage from "@/pages/profile-page";
import HelpPage from "@/pages/help-page";
import EmailTestPage from "@/pages/email-test-page";
import LoginTest from "@/pages/login-test";
import AdminPage from "@/pages/admin-page";
import UserDetailsPage from "@/pages/user-details-page";
import TeamsAdminPage from "@/pages/teams-admin-page";
import { AuthProvider } from "@/hooks/use-auth";
import { TenantProvider } from "@/hooks/use-tenant";
import { SettingsProvider } from "@/hooks/use-settings";
import { ThemeProvider } from "@/contexts/theme-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { NotificationsProvider } from "@/components/notifications";
import { ProtectedRoute } from "./lib/protected-route";
import Header from "./components/layout/header";
import Sidebar from "./components/layout/sidebar";
import { useSidebar } from "@/contexts/sidebar-context";

function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isSidebarCollapsed } = useSidebar();
  
  // Don't show layout for auth, reset password, and accept invitation pages
  if (location === '/auth' || location.startsWith('/reset-password') || location === '/accept-invitation') {
    return <>{children}</>;
  }
  
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main 
          className={`flex-1 overflow-y-auto bg-gray-50 transition-all duration-300 ease-in-out w-full p-4 ${
            isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
          }`}
        >
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
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/accept-invitation" component={AcceptInvitationPage} />
      <Route path="/login-test" component={LoginTest} />
      <ProtectedRoute path="/email-test" component={EmailTestPage} />
      <ProtectedRoute path="/" component={SimpleDashboard} />
      <ProtectedRoute path="/projects" component={ProjectsPage} />
      <ProtectedRoute path="/projects/new" component={ProjectNewPage} />
      <ProtectedRoute path="/projects/:id" component={ProjectsPage} />
      <ProtectedRoute path="/projects/:id/edit" component={ProjectsPage} />
      <ProtectedRoute path="/quotes" component={QuotesPage} />
      <ProtectedRoute path="/quotes/:id" component={QuoteDetailsPage} />
      <ProtectedRoute path="/quotes/:id/edit" component={QuoteEditPage} />
      <ProtectedRoute path="/invoices" component={InvoicesPage} />
      <ProtectedRoute path="/invoices/:id" component={InvoiceDetailsPage} />
      <ProtectedRoute path="/invoices/:id/edit" component={InvoiceDetailsPage} />
      <ProtectedRoute path="/employees" component={EmployeesPage} />
      <ProtectedRoute path="/employees/:id" component={EmployeesPage} />
      <ProtectedRoute path="/employees/:id/edit" component={EmployeesPage} />
      <ProtectedRoute path="/timesheets" component={TimesheetsPage} />
      <ProtectedRoute path="/timesheets/new" component={NewTimesheetPage} />
      <ProtectedRoute path="/timesheets/:id" component={TimesheetsPage} />
      <ProtectedRoute path="/timesheets/:id/edit" component={TimesheetsPage} />
      <ProtectedRoute path="/surveys" component={SurveysPage} />
      <ProtectedRoute path="/surveys/:id" component={SurveysPage} />
      <ProtectedRoute path="/surveys/:id/edit" component={SurveysPage} />
      <ProtectedRoute path="/installations" component={InstallationsPage} />
      <ProtectedRoute path="/installations/:id" component={InstallationsPage} />
      <ProtectedRoute path="/installations/:id/edit" component={InstallationsPage} />
      <ProtectedRoute path="/calendar" component={CalendarPage} />
      <ProtectedRoute path="/customers" component={CustomersPage} />
      <ProtectedRoute path="/customers/:id" component={CustomersPage} />
      <ProtectedRoute path="/customers/:id/edit" component={CustomersPage} />
      <ProtectedRoute path="/catalog-items" component={CatalogItemsPage} />
      <ProtectedRoute path="/catalog-items/:id" component={CatalogItemsPage} />
      <ProtectedRoute path="/catalog-items/:id/edit" component={CatalogItemsPage} />
      <ProtectedRoute path="/suppliers" component={SuppliersPage} />
      <ProtectedRoute path="/suppliers/:id" component={SuppliersPage} />
      <ProtectedRoute path="/suppliers/:id/edit" component={SuppliersPage} />
      <ProtectedRoute path="/expenses" component={ExpensesPage} />
      <ProtectedRoute path="/expenses/:id" component={ExpensesPage} />
      <ProtectedRoute path="/expenses/:id/edit" component={ExpensesPage} />
      <ProtectedRoute path="/purchase-orders" component={PurchaseOrdersPage} />
      <ProtectedRoute path="/purchase-orders/new" component={POCreatePage} />
      <ProtectedRoute path="/purchase-orders/:id" component={PODetailsPage} />
      <ProtectedRoute path="/purchase-orders/:id/edit" component={POCreatePage} />
      <ProtectedRoute path="/inventory" component={InventoryPage} />
      <ProtectedRoute path="/inventory/:id" component={InventoryPage} />
      <ProtectedRoute path="/inventory/:id/edit" component={InventoryPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/admin/users/:id" component={UserDetailsPage} />
      <ProtectedRoute path="/admin/teams" component={TeamsAdminPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/help" component={HelpPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <SettingsProvider>
            <ThemeProvider>
              <SidebarProvider>
                <NotificationsProvider>
                  <AppLayout>
                    <Router />
                  </AppLayout>
                  <Toaster />
                </NotificationsProvider>
              </SidebarProvider>
            </ThemeProvider>
          </SettingsProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
