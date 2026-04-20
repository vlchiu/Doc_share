import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, adminOnly = false, user }) {
  const token = localStorage.getItem('token');

  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && user && user.role !== 'ADMIN') return <Navigate to="/" replace />;

  return children;
}

export default ProtectedRoute;
