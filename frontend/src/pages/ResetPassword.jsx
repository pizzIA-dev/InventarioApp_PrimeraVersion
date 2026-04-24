import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Layout, Result } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../ThemeContext';

const { Title, Text } = Typography;

const ResetPassword = () => {
  const { uid, token }          = useParams();
  const navigate                = useNavigate();
  const { isDark }              = useTheme();
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState(null);

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const host    = window.location.hostname;
      const port    = import.meta.env.VITE_API_PORT || '8000';
      const apiBase = import.meta.env.VITE_API_URL || `http://${host}:${port}`;
      await axios.post(`${apiBase}/api/auth/reset-password/${uid}/${token}/`, {
        new_password:     values.new_password,
        confirm_password: values.confirm_password,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al restablecer la contraseña. El enlace puede haber expirado.');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <Layout style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: isDark ? '#141414' : '#f0f2f5',
      }}>
        <Result
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title="¡Contraseña actualizada!"
          subTitle="Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión."
          extra={
            <Button
              type="primary"
              onClick={() => navigate('/login')}
              style={{ borderRadius: 8 }}
            >
              Ir al ingreso
            </Button>
          }
        />
      </Layout>
    );
  }

  return (
    <Layout style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: isDark
        ? 'linear-gradient(135deg, #0a0a0a 0%, #141414 100%)'
        : 'linear-gradient(135deg, #f0f2f5 0%, #e8edf5 100%)',
    }}>
      <Card
        style={{
          width: '100%', maxWidth: 420,
          background: isDark ? '#1a1a1a' : '#fff',
          borderRadius: 16, padding: '32px 32px 24px',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.6)'
            : '0 8px 32px rgba(0,0,0,0.12)',
          border: isDark ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
        bordered={false}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 12,
            background: 'linear-gradient(135deg, #1677ff, #00d2ff)',
            marginBottom: 14, boxShadow: '0 4px 16px rgba(22,119,255,0.4)',
          }}>
            <LockOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: isDark ? '#fff' : '#141414' }}>
            Nueva contraseña
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Ingresa y confirma tu nueva contraseña para <strong>NegocIA</strong>
          </Text>
        </div>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        )}

        <Form
          name="reset_password_form"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="new_password"
            rules={[
              { required: true, message: 'Ingresa tu nueva contraseña' },
              { min: 6, message: 'Mínimo 6 caracteres' },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#1677ff' }} />}
              placeholder="Nueva contraseña"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            dependencies={['new_password']}
            hasFeedback
            rules={[
              { required: true, message: 'Confirma tu contraseña' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Las contraseñas no coinciden'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#1677ff' }} />}
              placeholder="Confirmar nueva contraseña"
              autoComplete="new-password"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            style={{
              width: '100%', height: 44, borderRadius: 8,
              fontWeight: 600, fontSize: 15,
              background: 'linear-gradient(135deg, #1677ff, #0958d9)',
              border: 'none',
            }}
          >
            Restablecer contraseña
          </Button>

          <Button
            block
            type="link"
            onClick={() => navigate('/login')}
            style={{ marginTop: 8 }}
          >
            Volver al ingreso
          </Button>
        </Form>
      </Card>
    </Layout>
  );
};

export default ResetPassword;
