import React, { useState, useContext } from 'react';
import {
  Form, Input, Button, Card, Typography, Alert,
  message, Layout, Checkbox, Modal, Divider
} from 'antd';
import {
  UserOutlined, LockOutlined, MailOutlined, KeyOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import NegocIALogo from '../components/NegocIALogo';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../ThemeContext';
import axios from 'axios';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [forgotOpen, setForgotOpen]       = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(null);
  const [forgotError, setForgotError]     = useState(null);
  const [forgotForm]                      = Form.useForm();

  const { login }  = useContext(AuthContext);
  const { schema }  = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();
  const { isDark } = useTheme();

  const from = location.state?.from?.pathname || '/';

  // â”€â”€â”€ Login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    const result = await login(values.email, values.password, !!values.remember, schema);
    if (result.success) {
      message.success('SesiÃ³n iniciada correctamente');
      navigate(schema ? `/t/${schema}` : from, { replace: true });
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  // â”€â”€â”€ Forgot Password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onForgotSubmit = async (values) => {
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const host    = window.location.hostname;
      const port    = import.meta.env.VITE_API_PORT || '8000';
      const apiBase = import.meta.env.VITE_API_URL  || `http://${host}:${port}`;
      const res = await axios.post(`${apiBase}/api/auth/forgot-password/`, { email: values.email });
      let msg = res.data.detail || 'Revisa tu email con las instrucciones.';
      if (res.data.reset_url) {
        msg += `\n\n[DEV] Link: ${res.data.reset_url}`;
      }
      setForgotSuccess(msg);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Error al enviar. Intenta mÃ¡s tarde.');
    }
    setForgotLoading(false);
  };

  // â”€â”€â”€ Shared card styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const cardBg = isDark
    ? 'rgba(255,255,255,0.04)'
    : 'rgba(255,255,255,0.85)';

  const cardBorder = isDark
    ? '1px solid rgba(255,255,255,0.08)'
    : '1px solid rgba(0,0,0,0.06)';

  return (
    <Layout
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
          ? 'linear-gradient(135deg, #0d0d1a 0%, #0a1628 60%, #0d0d1a 100%)'
          : 'linear-gradient(135deg, #e8edf5 0%, #f0f4fc 100%)',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          background: cardBg,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 20,
          padding: '36px 36px 28px',
          boxShadow: isDark
            ? '0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)'
            : '0 8px 40px rgba(0,0,0,0.12)',
          border: cardBorder,
        }}
        bordered={false}
      >
        {/* Logo / TÃ­tulo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #1677ff, #00b4ff)',
            marginBottom: 16,
            boxShadow: '0 4px 18px rgba(22,119,255,0.45)',
          }}>
            <LockOutlined style={{ fontSize: 26, color: '#fff' }} />
          </div>
          <Title level={2} style={{
            margin: 0, fontSize: 22, fontWeight: 700,
            color: isDark ? '#fff' : '#141414',
          }}>
            Bienvenido a NegocIA
          </Title>
          <Text style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', fontSize: 13 }}>
            Ingresa tus credenciales para continuar
          </Text>
        </div>

        {/* Error de login */}
        {error && (
          <Alert
            message="Credenciales incorrectas"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 24, borderRadius: 10 }}
          />
        )}

        <Form
          name="login_form"
          initialValues={{ remember: false }}
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          {/* Correo electronico */}
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Ingresa tu correo electronico' },
              { type: 'email', message: 'Ingresa un correo valido' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#1677ff' }} />}
              placeholder="Correo electronico"
              type="email"
              autoComplete="email"
              style={{ borderRadius: 10, height: 46 }}
            />
          </Form.Item>

          {/* ContraseÃ±a */}
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Ingresa tu contraseÃ±a' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#1677ff' }} />}
              placeholder="ContraseÃ±a"
              autoComplete="current-password"
              style={{ borderRadius: 10, height: 46 }}
            />
          </Form.Item>

          {/* Remember + Forgot */}
          <Form.Item style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox style={{ color: isDark ? 'rgba(255,255,255,0.65)' : undefined }}>
                  Mantener sesiÃ³n iniciada
                </Checkbox>
              </Form.Item>
              <span
                onClick={() => {
                  setForgotOpen(true);
                  setForgotSuccess(null);
                  setForgotError(null);
                  forgotForm.resetFields();
                }}
                style={{ fontSize: 13, color: '#1677ff', cursor: 'pointer', userSelect: 'none' }}
              >
                Â¿Olvidaste tu contraseÃ±a?
              </span>
            </div>
          </Form.Item>

          {/* BotÃ³n Entrar */}
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{
                width: '100%',
                height: 46,
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 15,
                background: 'linear-gradient(135deg, #1677ff, #0958d9)',
                border: 'none',
                boxShadow: '0 4px 14px rgba(22,119,255,0.4)',
              }}
            >
              Entrar
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '22px 0 12px', opacity: 0.2 }} />
        <Text style={{ fontSize: 12, display: 'block', textAlign: 'center', color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
          Accede desde el subdominio de tu empresa Â· NegocIA SaaS
        </Text>
      </Card>

      {/* â”€â”€ Modal: OlvidÃ© mi contraseÃ±a â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal
        open={forgotOpen}
        onCancel={() => setForgotOpen(false)}
        footer={null}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyOutlined style={{ color: '#1677ff' }} />
            Restablecer contraseÃ±a
          </div>
        }
        centered
        destroyOnClose
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Ingresa el email asociado a tu cuenta. RecibirÃ¡s un enlace para restablecer tu contraseÃ±a.
        </Text>

        {forgotSuccess && (
          <Alert
            message="Instrucciones enviadas"
            description={<span style={{ whiteSpace: 'pre-wrap' }}>{forgotSuccess}</span>}
            type="success"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}
        {forgotError && (
          <Alert
            message="Error"
            description={forgotError}
            type="error"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

        {!forgotSuccess && (
          <Form form={forgotForm} layout="vertical" onFinish={onForgotSubmit} size="large">
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Ingresa tu email' },
                { type: 'email', message: 'Ingresa un email vÃ¡lido' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#1677ff' }} />}
                placeholder="tu@email.com"
                autoComplete="email"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={forgotLoading}
              style={{ width: '100%', height: 42, borderRadius: 8 }}
            >
              Enviar instrucciones
            </Button>
          </Form>
        )}

        {forgotSuccess && (
          <Button
            block
            onClick={() => setForgotOpen(false)}
            style={{ marginTop: 8, borderRadius: 8 }}
          >
            Cerrar
          </Button>
        )}
      </Modal>
    </Layout>
  );
};

export default Login;
