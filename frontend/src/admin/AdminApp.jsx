import { AdminProvider, useAdmin } from './context/AdminContext';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminVendors from './pages/AdminVendors';
import AdminProducts from './pages/AdminProducts';
import AdminOrders from './pages/AdminOrders';
import AdminCustomers from './pages/AdminCustomers';
import AdminFinance from './pages/AdminFinance';
import AdminMarketing from './pages/AdminMarketing';
import AdminSettings from './pages/AdminSettings';
import AdminLogs from './pages/AdminLogs';

const AdminRouter = () => {
  const { currentAdminPage, adminPageParams, admin } = useAdmin();

  if (!admin) return <AdminLogin />;

  const renderPage = () => {
    switch (currentAdminPage) {
      case 'dashboard':  return <AdminDashboard />;
      case 'vendors':    return <AdminVendors />;
      case 'products':   return <AdminProducts />;
      case 'orders':     return <AdminOrders />;
      case 'customers':  return <AdminCustomers />;
      case 'finance':    return <AdminFinance />;
      case 'marketing':  return <AdminMarketing />;
      case 'settings':   return <AdminSettings />;
      case 'logs':       return <AdminLogs />;
      default:           return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout>
      {renderPage()}
    </AdminLayout>
  );
};

export default function AdminApp() {
  return (
    <AdminProvider>
      <AdminRouter />
    </AdminProvider>
  );
}
