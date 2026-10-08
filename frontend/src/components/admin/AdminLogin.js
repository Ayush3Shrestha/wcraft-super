import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle, 
  Shield,
  ArrowLeft 
} from 'lucide-react';
import ApiService from '../../services/apiService';
import { getAdminToken, saveAdminSession } from '../../services/adminAuth';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Page the admin was sent here from, if any
  const redirectTo = location.state?.from?.pathname || '/admin/dashboard';
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await ApiService.adminLogin(formData.username, formData.password);
      
      saveAdminSession(response.token, response.admin);
      navigate(redirectTo, { replace: true });
      
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Already signed in
  if (getAdminToken()) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm hover:underline"
            style={{ color: 'var(--stone-gray)' }}
          >
            <ArrowLeft size={16} />
            Back to Website
          </button>
        </div>

        {/* Login Card */}
        <div className="card">
          <div className="card-body p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Shield size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--dark-gray)' }}>
                Admin Login
              </h1>
              <p className="text-sm mt-2" style={{ color: 'var(--stone-gray)' }}>
                Welcome Craft Admin Panel
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--dark-gray)' }}>
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="input-field pl-10 w-full"
                    placeholder="Enter your username"
                    disabled={loading}
                  />
                  <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--dark-gray)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="input-field pl-10 pr-12 w-full"
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? (
                  <>
                    <div className="spinner-sm mr-2"></div>
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn size={20} className="mr-2" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="text-center mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs" style={{ color: 'var(--stone-gray)' }}>
                Secure admin access for Welcome Craft
              </p>
            </div>
          </div>
        </div>

        {/* Initialize Admin Notice */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>First time setup?</strong> If no admin account exists yet, send a <code>POST</code> request to <code>/api/admin/init</code> once. It creates the admin from <code>ADMIN_USERNAME</code> and <code>ADMIN_PASSWORD</code> in the backend <code>.env</code>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
