import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  SparklesIcon,
  LockClosedIcon,
  UserIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { useRBACStore } from '../../store/rbacStore';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { login } = useRBACStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended destination or default to dashboard
  const from = (location.state as any)?.from?.pathname || '/';

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email) {
      newErrors.email = 'Username or email is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Use username field for login (can be username or email)
      await login(formData.email, formData.password);
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Demo credentials helper
  const fillDemoCredentials = () => {
    setFormData({
      email: 'admin',
      password: 'Admin123!',
    });
    toast.info('Demo credentials filled. Click "Sign in" to login.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto h-16 w-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl"
          >
            <SparklesIcon className="h-8 w-8 text-white" />
          </motion.div>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Welcome to Spirit Tours
          </h2>
          <p className="mt-2 text-sm text-indigo-200">
            AI-Powered Tourism Management Platform
          </p>
        </div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 space-y-6"
          onSubmit={handleSubmit}
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="space-y-6">
              {/* Username/Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                  Username or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-indigo-300" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    autoComplete="username"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl shadow-sm bg-white/10 backdrop-blur-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent ${
                      errors.email ? 'border-red-400' : 'border-white/30'
                    }`}
                    placeholder="Enter username or email"
                  />
                  {errors.email && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                    </div>
                  )}
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-300">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-indigo-300" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-12 py-3 border rounded-xl shadow-sm bg-white/10 backdrop-blur-lg text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent ${
                      errors.password ? 'border-red-400' : 'border-white/30'
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-indigo-300 hover:text-white" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-indigo-300 hover:text-white" />
                    )}
                  </button>
                  {errors.password && (
                    <div className="absolute inset-y-0 right-10 pr-3 flex items-center">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                    </div>
                  )}
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-300">{errors.password}</p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-white/30 rounded bg-white/10"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-indigo-200">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link
                    to="/forgot-password"
                    className="font-medium text-indigo-300 hover:text-white transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              {/* Login Button */}
              <div className="space-y-4">
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign in to Platform'
                  )}
                </motion.button>

                {/* Fill Demo Credentials Button */}
                <motion.button
                  type="button"
                  onClick={fillDemoCredentials}
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex justify-center py-3 px-4 border border-white/30 text-sm font-medium rounded-xl text-white bg-white/10 backdrop-blur-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Fill Demo Credentials
                </motion.button>
              </div>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-indigo-200">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-white hover:text-indigo-300 transition-colors"
              >
                Create your account
              </Link>
            </p>
          </div>
        </motion.form>

        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
            <p className="text-center text-sm text-indigo-200 mb-3">
              What you'll get access to:
            </p>
            <div className="grid grid-cols-1 gap-2 text-xs text-indigo-300">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></div>
                25 AI Agents across 3 specialized tracks
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                Real-time analytics and performance monitoring
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-pink-400 rounded-full mr-2"></div>
                Advanced tourism management tools
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;