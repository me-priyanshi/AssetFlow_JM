import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Not Authorized</h1>
        <p className="text-slate-600">You do not have permission to view this page.</p>
        <a href="/" className="mt-4 text-blue-600 hover:underline">Return Home</a>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
