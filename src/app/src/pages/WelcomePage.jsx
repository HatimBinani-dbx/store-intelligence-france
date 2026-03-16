import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  LayoutGrid, 
  User, 
  Calendar, 
  TrendingUp,
  Store,
  Eye,
  Lock,
  ChevronDown,
  Menu
} from 'lucide-react';

/**
 * Welcome Page - Multi-Tenant Demo Platform
 * 
 * Shows all available demos with filtering by:
 * - All Demos (public)
 * - My Demos (user's own demos)
 */
export default function WelcomePage() {
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user from backend (Databricks Apps provides via headers)
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/current-user');
        const data = await response.json();
        setCurrentUser(data.user);
        console.log('👤 Current user:', data.user);
      } catch (error) {
        console.error('Failed to fetch current user:', error);
        setCurrentUser('user@databricks.com'); // Fallback
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Fetch demos
  useEffect(() => {
    fetchDemos();
  }, [activeTab, currentUser]);

  const fetchDemos = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (activeTab === 'all') {
        // Show all public demos (no user filter)
        params.append('publicOnly', 'true');
      } else {
        // Show only my demos (filter by current user)
        params.append('myDemos', 'true');
      }

      const response = await fetch(`/api/demos?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch demos');
      }

      const data = await response.json();
      setDemos(data);
    } catch (err) {
      console.error('Error fetching demos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Databricks Platform Header */}
      <header className="databricks-platform-header">
        <div className="px-6 py-3 flex items-center justify-between">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img 
                src="/databricks-logo.svg" 
                alt="Databricks" 
                className="h-6 w-6"
              />
              <span className="databricks-logo-text">databricks</span>
            </div>
            
            <div className="h-6 w-px bg-databricks-gray-200"></div>
            
            <span className="text-sm font-medium text-databricks-gray-700">
              Retail Intelligence Demos
            </span>
          </div>
          
          {/* Right: User Dropdown + Create Button */}
          <div className="flex items-center gap-4">
            <button className="databricks-user-dropdown">
              <User className="w-4 h-4 text-databricks-gray-600" />
              <span className="text-sm text-databricks-gray-700">
                {currentUser || 'user@databricks.com'}
              </span>
              <ChevronDown className="w-4 h-4 text-databricks-gray-500" />
            </button>
            
            <Link
              to="/create-demo"
              className="flex items-center gap-2 px-4 py-2 bg-databricks-teal hover:bg-databricks-teal-dark text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              Create Demo
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-databricks-gray-900 mb-2">
            Welcome to Databricks
          </h1>
          <p className="text-databricks-gray-600">
            Explore retail intelligence demos powered by Databricks
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-databricks-gray-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 -mb-px ${
              activeTab === 'all'
                ? 'border-databricks-blue text-databricks-blue'
                : 'border-transparent text-databricks-gray-600 hover:text-databricks-gray-900 hover:border-databricks-gray-300'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            All Demos
            {demos.length > 0 && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 'all' 
                  ? 'bg-databricks-blue/10 text-databricks-blue'
                  : 'bg-databricks-gray-100 text-databricks-gray-600'
              }`}>
                {demos.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('my')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 -mb-px ${
              activeTab === 'my'
                ? 'border-databricks-blue text-databricks-blue'
                : 'border-transparent text-databricks-gray-600 hover:text-databricks-gray-900 hover:border-databricks-gray-300'
            }`}
          >
            <User className="w-4 h-4" />
            My Demos
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Failed to load demos</p>
            <p className="text-red-600 text-sm mt-2">{error}</p>
            <button
              onClick={fetchDemos}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && demos.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {activeTab === 'all' ? 'No public demos available' : 'No demos created yet'}
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              {activeTab === 'all'
                ? 'Be the first to create a demo and share it with others!'
                : 'Create your first retail intelligence demo to get started.'}
            </p>
            <Link
              to="/create-demo"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Demo
            </Link>
          </div>
        )}

        {/* Demo Grid */}
        {!loading && !error && demos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {demos.map((demo) => (
              <DemoCard key={demo.demo_id} demo={demo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Demo Card Component
 */
function DemoCard({ demo }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Link
      to={`/demo/${demo.demo_slug}`}
      className="group bg-white rounded-lg shadow-sm border border-databricks-gray-200 hover:shadow-md hover:border-databricks-gray-300 transition-all overflow-hidden"
    >
      {/* Logo Area - Clean background */}
      <div className="h-20 bg-databricks-gray-50 border-b border-databricks-gray-100 flex items-center justify-center relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{ 
            background: `linear-gradient(135deg, ${demo.primary_color || '#1B998B'} 0%, ${demo.secondary_color || '#0B5FFF'} 100%)`
          }}
        ></div>
        
        <div className="relative z-10 flex items-center justify-center px-4">
          {demo.logo_type === 'text' && (
            <h3 className="text-xl font-bold text-databricks-gray-900">
              {demo.logo_text || demo.display_name}
            </h3>
          )}
          {demo.logo_type === 'image' && demo.logo_path && (
            <img 
              src={`/api/logos/${demo.logo_path}`} 
              alt={demo.display_name}
              className="h-12 w-auto object-contain"
              onError={(e) => {
                // Fallback to text if image fails to load
                e.target.style.display = 'none';
              }}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-databricks-gray-900 group-hover:text-databricks-blue transition-colors truncate">
              {demo.demo_name}
            </h4>
            {demo.tagline && (
              <p className="text-sm text-databricks-gray-600 mt-1 line-clamp-2">
                {demo.tagline}
              </p>
            )}
          </div>
          
          {demo.is_public ? (
            <Eye className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" title="Public" />
          ) : (
            <Lock className="w-4 h-4 text-databricks-gray-400 flex-shrink-0 ml-2" title="Private" />
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-2 text-sm mt-4">
          <div className="flex items-center gap-2 text-databricks-gray-600">
            <Store className="w-4 h-4 text-databricks-gray-500" />
            <span className="font-medium">{demo.retailer_name}</span>
            <span className="text-databricks-gray-300">•</span>
            <span className="text-databricks-gray-500">{demo.store_count?.toLocaleString() || 0} stores</span>
          </div>

          {demo.vertical && (
            <div className="flex items-center gap-2 text-databricks-gray-600">
              <TrendingUp className="w-4 h-4 text-databricks-gray-500" />
              <span className="capitalize text-databricks-gray-600">{demo.vertical}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-4 pt-4 border-t border-databricks-gray-100">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
              demo.status === 'active' 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : demo.status === 'draft'
                ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                : 'bg-databricks-gray-50 text-databricks-gray-700 border border-databricks-gray-200'
            }`}>
              {demo.status}
            </span>
            
            <span className="text-xs text-databricks-teal font-medium group-hover:underline">
              Launch Demo →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

