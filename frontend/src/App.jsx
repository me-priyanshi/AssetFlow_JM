import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import OrganizationSetup from './pages/organization/OrganizationSetup';

const Navigation = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex space-x-8 items-center">
            <span className="font-bold text-xl text-blue-600">AssetFlow</span>
            {user.role === 'Admin' && (
              <Link to="/organization" className="text-slate-600 hover:text-blue-600 font-medium">Organization</Link>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-500">
              {user.email} <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs ml-2">{user.role}</span>
            </span>
            <button 
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Navigation />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={
              <div className="p-8 text-center mt-20">
                <h1 className="text-4xl font-bold text-slate-800">Welcome to AssetFlow</h1>
                <p className="text-slate-600 mt-4">You are logged in.</p>
              </div>
            } />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="/organization" element={<OrganizationSetup />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
