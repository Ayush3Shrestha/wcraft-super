import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  RefreshCw,
  LogOut,
  Settings,
  Eye,
  AlertCircle
} from 'lucide-react';
import ApiService from '../../services/apiService';
import { clearAdminSession, getAdminUser } from '../../services/adminAuth';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalProducts: 0,
      totalCategories: 0,
      totalOrders: 0,
      pendingOrders: 0
    },
    recentOrders: [],
    silverPrice: null,
    goldPrice: null,
    silverHistory: [],
    goldHistory: []
  });

  // RequireAdmin has already verified the session
  const handleLogout = () => {
    clearAdminSession();
    navigate('/admin/login');
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        productsResponse,
        categoriesResponse,
        ordersResponse,
        silverPriceResponse,
        goldPriceResponse,
        silverHistoryResponse,
        goldHistoryResponse
      ] = await Promise.allSettled([
        ApiService.getAllProducts({ limit: 1 }), // Just for count
        ApiService.getAllCategories(),
        ApiService.getAllOrders(),
        ApiService.getTodaysSilverPrice(),
        ApiService.getTodaysGoldPrice(),
        ApiService.getSilverPriceHistory({ limit: 7 }),
        ApiService.getGoldPriceHistory({ limit: 7 })
      ]);

      // Process products data
      let totalProducts = 0;
      if (productsResponse.status === 'fulfilled') {
        totalProducts = productsResponse.value.pagination?.totalProducts || 0;
      }

      // Process categories data
      let totalCategories = 0;
      if (categoriesResponse.status === 'fulfilled') {
        totalCategories = categoriesResponse.value.categories?.length || 0;
      }

      // Process orders data
      let totalOrders = 0;
      let pendingOrders = 0;
      let recentOrders = [];
      if (ordersResponse.status === 'fulfilled') {
        const orders = ordersResponse.value.orders || [];
        totalOrders = orders.length;
        pendingOrders = orders.filter(order => order.status === 'pending').length;
        recentOrders = orders.slice(0, 5); // Get latest 5 orders
      }

      // Process price data
      let silverPrice = null;
      let goldPrice = null;
      let silverHistory = [];
      let goldHistory = [];

      if (silverPriceResponse.status === 'fulfilled') {
        silverPrice = silverPriceResponse.value;
      }

      if (goldPriceResponse.status === 'fulfilled') {
        goldPrice = goldPriceResponse.value;
      }

      if (silverHistoryResponse.status === 'fulfilled') {
        silverHistory = silverHistoryResponse.value.history || [];
      }

      if (goldHistoryResponse.status === 'fulfilled') {
        goldHistory = goldHistoryResponse.value.history || [];
      }

      setDashboardData({
        stats: {
          totalProducts,
          totalCategories,
          totalOrders,
          pendingOrders
        },
        recentOrders,
        silverPrice,
        goldPrice,
        silverHistory,
        goldHistory
      });

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate price trend
  const calculateTrend = (history) => {
    if (history.length < 2) return { trend: 'stable', change: 0 };
    
    const latest = history[0].pricePerTola;
    const previous = history[1].pricePerTola;
    const change = ((latest - previous) / previous) * 100;
    
    return {
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      change: Math.abs(change).toFixed(2)
    };
  };

  useEffect(() => {
    fetchDashboardData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const adminUser = getAdminUser() || {};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p style={{ color: 'var(--stone-gray)' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">🕉</span>
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--dark-gray)' }}>
                  Admin Dashboard
                </h1>
                <p className="text-sm" style={{ color: 'var(--stone-gray)' }}>
                  Welcome back, {adminUser.username || 'Admin'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="btn btn-secondary btn-sm"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              
              <button
                onClick={() => navigate('/admin/settings')}
                className="btn btn-secondary btn-sm"
              >
                <Settings size={16} />
                Settings
              </button>
              
              <button
                onClick={handleLogout}
                className="btn btn-outline btn-sm text-red-600 border-red-600 hover:bg-red-600"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-600">{error}</p>
              <button 
                onClick={() => setError('')} 
                className="text-red-500 hover:text-red-700 text-sm mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Products */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--stone-gray)' }}>
                    Total Products
                  </p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--dark-gray)' }}>
                    {dashboardData.stats.totalProducts}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Package size={24} className="text-blue-600" />
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/products')}
                className="text-sm text-blue-600 hover:underline mt-2"
              >
                Manage Products
              </button>
            </div>
          </div>

          {/* Total Categories */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--stone-gray)' }}>
                    Categories
                  </p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--dark-gray)' }}>
                    {dashboardData.stats.totalCategories}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <BarChart3 size={24} className="text-green-600" />
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/categories')}
                className="text-sm text-green-600 hover:underline mt-2"
              >
                Manage Categories
              </button>
            </div>
          </div>

          {/* Total Orders */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--stone-gray)' }}>
                    Total Orders
                  </p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--dark-gray)' }}>
                    {dashboardData.stats.totalOrders}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <ShoppingCart size={24} className="text-purple-600" />
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/orders')}
                className="text-sm text-purple-600 hover:underline mt-2"
              >
                View Orders
              </button>
            </div>
          </div>

          {/* Pending Orders */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--stone-gray)' }}>
                    Pending Orders
                  </p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--saffron)' }}>
                    {dashboardData.stats.pendingOrders}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Users size={24} className="text-yellow-600" />
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/customers')}
                className="text-sm text-yellow-600 hover:underline mt-2"
              >
                Manage Customers
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Price Overview */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold" style={{ color: 'var(--dark-gray)' }}>
                  Live Metal Prices
                </h3>
                <DollarSign size={24} style={{ color: 'var(--saffron)' }} />
              </div>

              <div className="space-y-4">
                {/* Silver Price */}
                {dashboardData.silverPrice && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium" style={{ color: 'var(--dark-gray)' }}>
                          Silver Price
                        </p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--saffron)' }}>
                          Rs. {dashboardData.silverPrice.pricePerTola?.toLocaleString()}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--stone-gray)' }}>
                          per tola
                        </p>
                      </div>
                      <div className="text-right">
                        {(() => {
                          const trend = calculateTrend(dashboardData.silverHistory);
                          return (
                            <div className={`flex items-center gap-1 ${
                              trend.trend === 'up' ? 'text-green-600' : 
                              trend.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {trend.trend === 'up' ? <TrendingUp size={16} /> : 
                               trend.trend === 'down' ? <TrendingDown size={16} /> : null}
                              <span className="text-sm font-medium">
                                {trend.change}%
                              </span>
                            </div>
                          );
                        })()}
                        <p className="text-xs" style={{ color: 'var(--stone-gray)' }}>
                          vs yesterday
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gold Price */}
                {dashboardData.goldPrice && (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium" style={{ color: 'var(--dark-gray)' }}>
                          Gold Price
                        </p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--golden)' }}>
                          Rs. {dashboardData.goldPrice.pricePerTola?.toLocaleString()}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--stone-gray)' }}>
                          per tola
                        </p>
                      </div>
                      <div className="text-right">
                        {(() => {
                          const trend = calculateTrend(dashboardData.goldHistory);
                          return (
                            <div className={`flex items-center gap-1 ${
                              trend.trend === 'up' ? 'text-green-600' : 
                              trend.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {trend.trend === 'up' ? <TrendingUp size={16} /> : 
                               trend.trend === 'down' ? <TrendingDown size={16} /> : null}
                              <span className="text-sm font-medium">
                                {trend.change}%
                              </span>
                            </div>
                          );
                        })()}
                        <p className="text-xs" style={{ color: 'var(--stone-gray)' }}>
                          vs yesterday
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate('/admin/prices')}
                className="btn btn-secondary btn-sm mt-4 w-full"
              >
                <BarChart3 size={16} className="mr-2" />
                View Price History
              </button>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold" style={{ color: 'var(--dark-gray)' }}>
                  Recent Orders
                </h3>
                <ShoppingCart size={24} style={{ color: 'var(--saffron)' }} />
              </div>

              {dashboardData.recentOrders.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentOrders.map((order) => (
                    <div key={order._id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--dark-gray)' }}>
                            {order.customerName}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--stone-gray)' }}>
                            {order.product?.title}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--stone-gray)' }}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {order.status}
                          </span>
                          <p className="text-sm font-medium mt-1" style={{ color: 'var(--saffron)' }}>
                            Rs. {order.totalPrice?.toLocaleString() || 'TBD'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart size={32} className="mx-auto mb-3 text-gray-400" />
                  <p style={{ color: 'var(--stone-gray)' }}>No orders yet</p>
                </div>
              )}

              <button
                onClick={() => navigate('/admin/orders')}
                className="btn btn-primary btn-sm mt-4 w-full"
              >
                <Eye size={16} className="mr-2" />
                View All Orders
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--dark-gray)' }}>
            Quick Actions
          </h3>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/admin/products/new')}
              className="btn btn-primary"
            >
              Add New Product
            </button>
            <button
              onClick={() => navigate('/admin/categories/new')}
              className="btn btn-secondary"
            >
              Add Category
            </button>
            <button
              onClick={() => navigate('/admin/orders/new')}
              className="btn btn-secondary"
            >
              Create Order
            </button>
            <button
              onClick={() => navigate('/admin/customers')}
              className="btn btn-secondary"
            >
              Customer Management
            </button>
            <button
              onClick={() => navigate('/admin/testimonials')}
              className="btn btn-secondary"
            >
              Manage Testimonials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
