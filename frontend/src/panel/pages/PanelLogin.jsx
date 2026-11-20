import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Input } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { usePanelAuth } from '../PanelAuthContext';
import { mensajeError } from '../panelApi';
import '../panel.css';

export default function PanelLogin() {
  const { admin, login } = usePanelAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (admin) return <Navigate to="/panel" replace />;

  const onFinish = async ({ username, password }) => {
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(location.state?.from || '/panel', { replace: true });
    } catch (err) {
      setError(err?.response?.status === 429
        ? 'Demasiados intentos. Espera un minuto.'
        : mensajeError(err, 'No se pudo iniciar sesión.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pnl-login pnl" style={{ display: 'grid' }}>
      <section className="pnl-login-art">
        <div className="pnl-login-ticker">NEGOCIA · BACK-OFFICE · ACCESO RESTRINGIDO</div>
        <div>
          <h1>El libro mayor<br />de <em>NegocIA</em>.</h1>
          <p>Empresas, suscripciones, ingresos y gastos de la plataforma en un solo lugar.
            Solo para el equipo que administra el servicio.</p>
        </div>
        <div className="pnl-login-ticker">Toda acción queda registrada en la auditoría.</div>
      </section>
      <section className="pnl-login-form">
        <div className="pnl-login-box">
          <div className="pnl-eyebrow">Panel de control</div>
          <h2 className="pnl-title" style={{ marginBottom: 24 }}>Iniciar sesión</h2>
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 18 }} />}
          <Form layout="vertical" size="large" onFinish={onFinish} requiredMark={false}>
            <Form.Item name="username" label="Usuario" rules={[{ required: true, message: 'Ingresa tu usuario' }]}>
              <Input prefix={<UserOutlined />} autoComplete="username" autoFocus />
            </Form.Item>
            <Form.Item name="password" label="Contraseña" rules={[{ required: true, message: 'Ingresa tu contraseña' }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>Entrar</Button>
          </Form>
        </div>
      </section>
    </div>
  );
}
