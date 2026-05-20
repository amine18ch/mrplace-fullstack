import AdminApp from './admin/AdminApp';
import { AppProvider, useApp } from './context/AppContext';
import { TopBar, Header, CategoryBar, Footer, Toasts, LoginModal } from './components/Layout';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import { WishlistPage, SellerPage, SearchPage, AccountPage, OrdersPage } from './pages/OtherPages';


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
    default:         return <HomePage />;
  }
};

const AppInner = () => (
  <div className="min-h-screen flex flex-col" style={{ background: '#F1F5F9' }}>
    <TopBar />
    <Header />
    <CategoryBar />
    <main className="flex-1">
      <Router />
    </main>
    <Footer />
    <LoginModal />
    <Toasts />
  </div>
);

export default function App() {
  if (window.location.pathname.startsWith('/admin')) {
    return <AdminApp />;
  }
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
