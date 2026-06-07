import AdminApp from './admin/AdminApp';
import SellerApp from './seller/SellerApp';
import DriverApp from './driver/DriverApp';
import TrackingPage from './pages/TrackingPage';
import { AppProvider, useApp } from './context/AppContext';
import { TopBar, Header, CategoryBar, Footer, Toasts, LoginModal, MobileBottomNav } from './components/Layout';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import { WishlistPage, SellerPage, SearchPage, AccountPage, OrdersPage, MessagesPage } from './pages/OtherPages';


const Router = () => {
  const { currentPage, pageParams } = useApp();
  switch (currentPage) {
    case 'home':     return <HomePage />;
    case 'category': return <CategoryPage slug={pageParams.slug} />;
    case 'product':  return <ProductPage id={pageParams.id} />;
    case 'cart':     return <CartPage />;
    case 'checkout': return <CheckoutPage />;
    case 'wishlist': return <WishlistPage />;
    case 'seller':   return <SellerPage slug={pageParams.slug} />;
    case 'search':   return <SearchPage query={pageParams.query} />;
    case 'account':  return <AccountPage />;
    case 'orders':   return <OrdersPage />;
    case 'messages': return <MessagesPage />;
    default:         return <HomePage />;
  }
};

const AppInner = () => (
  <div className="min-h-screen flex flex-col" style={{ background: '#F1F5F9' }}>
    <TopBar />
    <Header />
    {/* CategoryBar masquée sur mobile — remplacée par bottom nav */}
    <div className="hidden sm:block">
      <CategoryBar />
    </div>
    <main className="flex-1 pb-16 sm:pb-0">
      <Router />
    </main>
    <div className="hidden sm:block">
      <Footer />
    </div>
    <LoginModal />
    <Toasts />
    {/* Navigation bottom mobile */}
    <MobileBottomNav />
  </div>
);

export default function App() {
  if (window.location.pathname.startsWith('/admin')) return <AdminApp />;
  if (window.location.pathname.startsWith('/seller')) return <SellerApp />;
  if (window.location.pathname.startsWith('/driver')) return <DriverApp />;
  if (window.location.pathname.startsWith('/tracking')) return <TrackingPage />;
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
