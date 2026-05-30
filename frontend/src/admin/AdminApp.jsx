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
import AdminCategories from './pages/AdminCategories';
import AdminBanners from './pages/AdminBanners';
import AdminFlashSales from './pages/AdminFlashSales';
import AdminContracts from './pages/AdminContracts';

const AdminRouter = () => {
  const { currentAdminPage, adminPageParams, admin, can } = useAdmin();

  if (!admin) return <AdminLogin />;

  const renderPage = () => {
    switch (currentAdminPage) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'vendors':
      case 'vendor-detail':
        if (!can('vendors.read') && !can('finance.read')) {
          return <AccessDenied />;
        }
        return <AdminVendors initialTab={currentAdminPage === 'vendor-detail' ? 'all' : undefined} vendorId={adminPageParams?.id} />;
      case 'products':
        if (!can('products.read')) return <AccessDenied />;
        return <AdminProducts />;
      case 'orders':
        if (!can('orders.read')) return <AccessDenied />;
        return <AdminOrders />;
      case 'customers':
        if (!can('customers.read')) return <AccessDenied />;
        return <AdminCustomers />;
      case 'finance':
        if (!can('finance.read')) return <AccessDenied />;
        return <AdminFinance />;
      case 'marketing':
        if (!can('marketing.read')) return <AccessDenied />;
        return <AdminMarketing />;
      case 'settings':
        if (admin.role !== 'SUPER_ADMIN') return <AccessDenied />;
        return <AdminSettings />;
      case 'categories':
        if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'MODERATEUR') return <AccessDenied />;
        return <AdminCategories />;
      case 'banners':
        if (!can('marketing.read') && admin.role !== 'SUPER_ADMIN') return <AccessDenied />;
        return <AdminBanners />;
      case 'flash-sales':
        if (!can('marketing.read') && admin.role !== 'SUPER_ADMIN') return <AccessDenied />;
        return <AdminFlashSales />;
      case 'contracts':
        if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'MODERATEUR') return <AccessDenied />;
        return <AdminContracts />;
      case 'logs':
        if (!can('logs.read') && admin.role !== 'SUPER_ADMIN') return <AccessDenied />;
        return <AdminLogs />;
      default:
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-6xl mb-4">404</div>
              <div className="text-slate-400 text-lg font-medium">Page introuvable</div>
              <div className="text-slate-600 text-sm mt-1">La page "{currentAdminPage}" n'existe pas.</div>
            </div>
          </div>
        );
    }
  };

  return (
    <AdminLayout>
      {renderPage()}
    </AdminLayout>
  );
};

const AccessDenied = () => (
  <div className="flex items-center justify-center h-96">
    <div className="text-center">
      <div className="text-6xl mb-4">🚫</div>
      <div className="text-slate-400 text-lg font-medium">Accès refusé</div>
      <div className="text-slate-600 text-sm mt-1">Vous n'avez pas les droits nécessaires pour accéder à cette section.</div>
    </div>
  </div>
);

export default function AdminApp() {
  return (
    <AdminProvider>
      <AdminRouter />
    </AdminProvider>
  );
}
