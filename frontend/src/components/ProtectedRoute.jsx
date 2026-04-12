import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role restrictions
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    // If VENDEDOR is trying to access DASHBOARD, redirect to VENTAS
    if (user.rol === 'VENDEDOR') {
      return <Navigate to="/ventas" replace />;
    }
    // Else redirect to unauthorized or safe fallback
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
