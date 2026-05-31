import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Typography } from 'antd';
import { CheckCircleFilled, RocketOutlined } from '@ant-design/icons';
import NegocIALogo from '../components/NegocIALogo';

const { Title, Paragraph } = Typography;

export default function RegistroExitoso() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const schema  = searchParams.get('schema') || '';
  const empresa = searchParams.get('empresa') || 'Tu negocio';
  const loginUrl = schema ? `/t/${schema}/login` : '/planes';

  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); navigate(loginUrl); }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [loginUrl, navigate]);

  const neonCyan = '#00d2ff';
  const neonGlow = '0 0 24px rgba(0,210,255,0.45)';
  const darkBg   = '#0a0e14';

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: darkBg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', fontFamily: 'Inter, sans-serif',
      backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(0,210,255,0.12) 0%, transparent 70%)`,
    }}>
      <NegocIALogo width={80} height={80} style={{ marginBottom: 32 }} />

      <CheckCircleFilled style={{
        fontSize: 72, color: neonCyan,
        filter: `drop-shadow(0 0 18px ${neonCyan})`,
        marginBottom: 24,
      }} />

      <Title style={{
        color: '#fff', fontSize: '2.4rem', fontWeight: 800,
        textAlign: 'center', marginBottom: 8,
        background: `linear-gradient(90deg, ${neonCyan}, #ffffff)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        ¡Bienvenido a NegocIA!
      </Title>

      <Title level={3} style={{ color: '#a0c8e8', fontWeight: 500, marginTop: 0, textAlign: 'center' }}>
        {decodeURIComponent(empresa)} ya está listo
      </Title>

      <Paragraph style={{
        color: '#6b8fa8', fontSize: 16, textAlign: 'center',
        maxWidth: 480, lineHeight: 1.7, marginBottom: 40,
      }}>
        Revisa tu correo — te enviamos las credenciales de acceso.
        Serás redirigido automáticamente en{' '}
        <strong style={{ color: neonCyan }}>{countdown}s</strong>.
      </Paragraph>

      <Button
        type="primary"
        size="large"
        icon={<RocketOutlined />}
        onClick={() => navigate(loginUrl)}
        style={{
          height: 52, paddingInline: 40, fontWeight: 700, fontSize: 16,
          background: `linear-gradient(135deg, ${neonCyan}, #0080cc)`,
          border: 'none', borderRadius: 12, boxShadow: neonGlow,
        }}
      >
        Ir a mi panel ahora
      </Button>
    </div>
  );
}