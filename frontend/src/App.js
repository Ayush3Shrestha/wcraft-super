import './App.css';
import HomePage from './components/HomePage';
import ProductsPage from './components/ProductsPage';
import CartPage from './components/CartPage';
import CheckoutPage from './components/CheckoutPage';
import SingleProductPage from './components/SingleProductPage';
import AboutUsPage from './components/AboutUsPage';
import ContactPage from './components/ContactPage';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import ApiService from './services/apiService';
import ProductInputForm from './components/admin/ProductInputForm';
import CategoryInputForm from './components/admin/CategoryInputForm';
import RequireAdmin from './components/admin/RequireAdmin';
import AdminComingSoon from './components/admin/AdminComingSoon';
import ProductsList from './components/admin/ProductsList';
import CategoriesList from './components/admin/CategoriesList';
import OrdersList from './components/admin/OrdersList';
import OrderForm from './components/admin/OrderForm';

function AppWrapper() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Initialize session on app load
  useEffect(() => {
    ApiService.getSessionId();
  }, []);

  // Admin routes use their own layout instead of the shop navbar/footer.
  // Only the login page is public; everything else goes through RequireAdmin.
  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<RequireAdmin />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<ProductsList />} />
          <Route path="products/new" element={<ProductInputForm />} />
          <Route path="products/:productId/edit" element={<ProductInputForm key="edit" />} />
          <Route path="categories" element={<CategoriesList />} />
          <Route path="categories/new" element={<CategoryInputForm />} />
          <Route path="categories/:categoryId/edit" element={<CategoryInputForm key="edit" />} />
          <Route path="orders" element={<OrdersList />} />
          <Route path="orders/new" element={<OrderForm />} />
          <Route path="orders/:orderId/edit" element={<OrderForm key="edit" />} />
          <Route path="createprod" element={<Navigate to="/admin/products/new" replace />} />
          <Route path="*" element={<AdminComingSoon />} />
        </Route>
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-lotus-white" style={{ backgroundColor: 'var(--lotus-white)' }}>
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/product/:id" element={<SingleProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

const App = () => (
  <Router>
    <AppWrapper />
  </Router>
);

export default App;
