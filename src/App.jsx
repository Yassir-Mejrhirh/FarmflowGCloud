import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Blocks from '@/pages/Blocks';
import Crops from '@/pages/Crops';
import Tasks from '@/pages/Tasks';
import Workers from '@/pages/Workers';
import Machinery from '@/pages/Machinery';
import Inventory from '@/pages/Inventory';
import Costs from '@/pages/Costs';
import Seasons from '@/pages/Seasons';
import Varieties from '@/pages/Varieties';
import Suppliers from '@/pages/Suppliers';
import Farms from '@/pages/Farms';
import Storages from '@/pages/Storages';
import PlantingEntry from '@/pages/PlantingEntry';
import DailyReport from '@/pages/DailyReport';
import Attendance from '@/pages/Attendance';
import InputInvoices from '@/pages/InputInvoices';
import InputInvoicesList from '@/pages/InputInvoicesList';
import StockCount from '@/pages/StockCount';
import LabourStatus from '@/pages/LabourStatus';
import StockStatus from '@/pages/StockStatus';
import MachineStatus from '@/pages/MachineStatus';
import MachineTracking from '@/pages/MachineTracking';
import BlockItinerary from '@/pages/BlockItinerary';
import BlockPlans from '@/pages/BlockPlans';
import MachineMaintenance from '@/pages/MachineMaintenance';
import ImportCsv from '@/pages/ImportCsv';
import LoadTestProtocol from '@/pages/LoadTestProtocol';
import { I18nProvider } from '@/lib/I18nContext';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <I18nProvider>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/blocks" element={<Blocks />} />
        <Route path="/crops" element={<Crops />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/workers" element={<Workers />} />
        <Route path="/machinery" element={<Machinery />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/costs" element={<Costs />} />
        <Route path="/seasons" element={<Seasons />} />
        <Route path="/varieties" element={<Varieties />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/farms" element={<Farms />} />
        <Route path="/storages" element={<Storages />} />
        <Route path="/planting" element={<PlantingEntry />} />
        <Route path="/daily-report" element={<DailyReport />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/input-invoices" element={<InputInvoices />} />
        <Route path="/input-invoices/all" element={<InputInvoicesList />} />
        <Route path="/stock-count" element={<StockCount />} />
        <Route path="/labour-status" element={<LabourStatus />} />
        <Route path="/stock-status" element={<StockStatus />} />
        <Route path="/machine-status" element={<MachineStatus />} />
        <Route path="/machine-tracking" element={<MachineTracking />} />
        <Route path="/block-itinerary" element={<BlockItinerary />} />
        <Route path="/block-plans" element={<BlockPlans />} />
        <Route path="/machine-maintenance" element={<MachineMaintenance />} />
        <Route path="/import" element={<ImportCsv />} />
        <Route path="/load-test" element={<LoadTestProtocol />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </I18nProvider>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App