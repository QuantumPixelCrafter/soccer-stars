import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';

import { Layout } from '@/components/layout';
import { ProtectedRoute } from '@/components/protected-route';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Collection from '@/pages/collection';
import Shop from '@/pages/shop';
import Squad from '@/pages/squad';
import Market from '@/pages/market';
import DailyObjective from '@/pages/daily-objective';

import { getToken } from '@/lib/auth';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => (
          <Redirect to={getToken() ? "/dashboard" : "/login"} />
        )}
      </Route>

      <Route path="/login">
        <Layout>
          <Login />
        </Layout>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/collection">
        <ProtectedRoute>
          <Layout>
            <Collection />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/shop">
        <ProtectedRoute>
          <Layout>
            <Shop />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/squad">
        <ProtectedRoute>
          <Layout>
            <Squad />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/market">
        <ProtectedRoute>
          <Layout>
            <Market />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/daily-objective">
        <ProtectedRoute>
          <Layout>
            <DailyObjective />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route>
        <Layout>
          <NotFound />
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
