import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import OrganizationSetup from './pages/organization/OrganizationSetup';
import AssetList from './pages/assets/AssetList';
import AssetDetail from './pages/assets/AssetDetail';
import TransferInbox from './pages/allocations/TransferInbox';

const APPROVE_ROLES = ['Admin', 'AssetManager', 'DepartmentHead'];

const Navigation = () => {
  const { user, logout } = useAuth();
  if (!user) return null;

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`;

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="font-bold text-xl text-blue-600 tracking-tight">AssetFlow</Link>
            <NavLink to="/assets" className={navLinkClass}>Assets</NavLink>
            {APPROVE_ROLES.includes(user.role) && (
              <NavLink to="/transfers" className={navLinkClass}>Transfers</NavLink>
            )}
            {user.role === 'Admin' && (
              <NavLink to="/organization" className={navLinkClass}>Organization</NavLink>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-500">
              {user.name || user.email}
              <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                {user.role}
              </span>
            </span>
            <button
              onClick={logout}
              className="text-sm text-red-500 hover:text-red-700 font-medium border border-red-200 hover:border-red-400 px-3 py-1 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 max-w-lg w-full">
        <div className="text-5xl mb-4">📦</div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome to AssetFlow</h1>
        <p className="text-slate-500 mb-6">
          Enterprise Asset & Resource Management System
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to="/assets"
            className="block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
          >
            Browse Asset Directory →
          </Link>
          {APPROVE_ROLES.includes(user?.role) && (
            <Link
              to="/transfers"
              className="block bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-6 rounded-xl transition-colors"
            >
              View Transfer Requests
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <Router>
      <Navigation />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Any authenticated user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assets" element={<AssetList />} />
          <Route path="/assets/:id" element={<AssetDetail />} />
        </Route>

        {/* Asset managers, department heads, and admins */}
        <Route element={<ProtectedRoute allowedRoles={APPROVE_ROLES} />}>
          <Route path="/transfers" element={<TransferInbox />} />
        </Route>

        {/* Admin only */}
        <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
          <Route path="/organization" element={<OrganizationSetup />} />
        </Route>
      </Routes>
    </Router>
  </AuthProvider>
);

export default App;
