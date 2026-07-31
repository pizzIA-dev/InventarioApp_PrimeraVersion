import React, { useContext } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * ProtectedRoute — guarda de autenticación y autorización por rol.
 *
 * Props:
 *  - allowedRoles: string[]  — roles que pueden acceder. Si se omite, solo requiere auth.
 *  - fallbackForOthers: string — ruta relativa al tenant (sin /t/:schema) a la que redirigir
 *    si el usuario NO tiene el rol permitido. Por defecto: "" (raíz del tenant, que lleva a Ventas).
 *
 * Ejemplo: <ProtectedRoute allowedRoles={['GERENTE']} fallbackForOthers="/ventas">
 *   redirige a /t/:schema/ventas si el usuario no es Gerente.
 */
const ProtectedRoute = ({ children, allowedRoles, fallbackForOthers }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const { schema } = useParams();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    // Redirigir al login del tenant si conocemos el schema, sino al landing
    const loginPath = schema ? `/t/${schema}/login` : '/acceder';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    // Determinar la ruta de fallback
    const isColabOrVendedor = user.rol === 'COLABORADOR' || user.rol === 'VENDEDOR';

    if (fallbackForOthers) {
      // Fallback explícito definido en la ruta (ej: /ventas para el Dashboard)
      const redirectTo = schema ? `/t/${schema}${fallbackForOthers}` : fallbackForOthers;
      return <Navigate to={redirectTo} replace />;
    }

    if (isColabOrVendedor) {
      // Colaboradores van siempre a Ventas si no tienen permiso en otra ruta
      const redirectTo = schema ? `/t/${schema}/ventas` : '/ventas';
      return <Navigate to={redirectTo} replace />;
    }

    // Para cualquier otro caso sin permiso, ir al raíz del tenant
    const redirectTo = schema ? `/t/${schema}` : '/';
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
