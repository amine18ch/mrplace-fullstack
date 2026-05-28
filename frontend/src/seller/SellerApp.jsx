import { SellerProvider, useSeller } from './context/SellerContext';
import SellerLayout from './components/SellerLayout';
import SellerLogin from './pages/SellerLogin';
import SellerDashboard from './pages/SellerDashboard';
import SellerProducts from './pages/SellerProducts';
import SellerOrders from './pages/SellerOrders';
import SellerStore from './pages/SellerStore';
import SellerReviews from './pages/SellerReviews';
import SellerMessages from './pages/SellerMessages';
import SellerReturns from './pages/SellerReturns';

const SellerRouter = () => {
  const { seller, page } = useSeller();
  if (!seller) return <SellerLogin />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <SellerDashboard />;
      case 'products':  return <SellerProducts />;
      case 'orders':    return <SellerOrders />;
      case 'messages':  return <SellerMessages />;
      case 'returns':   return <SellerReturns />;
      case 'store':
      case 'settings':  return <SellerStore />;
      case 'reviews':   return <SellerReviews />;
      case 'finance':   return <SellerStore initialTab="finance" />;
      default:          return <SellerDashboard />;
    }
  };

  return (
    <SellerLayout>
      {renderPage()}
    </SellerLayout>
  );
};

export default function SellerApp() {
  return (
    <SellerProvider>
      <SellerRouter />
    </SellerProvider>
  );
}
