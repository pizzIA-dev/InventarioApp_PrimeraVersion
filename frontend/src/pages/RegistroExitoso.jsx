import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Typography } from 'antd';
import { CheckCircleFilled, ArrowRightOutlined } from '@ant-design/icons';
import NegocIALogo from '../components/NegocIALogo';

const { Title, Paragraph } = Typography;

export default function RegistroExitoso() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const empresa = searchParams.get('empresa') || 'Tu negocio';

  const neonCyan = '#00d2ff';
  const neonGlow = '0 0 24px rgba(0,210,255,0.45)';
  const darkBg   = '#0a0e14';

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: darkBg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', fontFamily: 'Inter, sans-serif',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(0,210,255,0.12) 0%, transparent 70%)',
    }}>
      <NegocIALogo width={72} height={72} style={{ marginBottom: 32 }} />

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
        ¡Negocio creado!
      </Title>

      <Title level={3} style={{ color: '#a0c8e8', fontWeight: 500, marginTop: 0, textAlign: 'center' }}>
        {decodeURIComponent(empresa)} ya está listo
      </Title>

      <Paragraph style={{
        color: '#6b8fa8', fontSize: 15, textAlign: 'center',
        maxWidth: 460, lineHeight: 1.8, marginBottom: 40,
      }}>
        Ahora puedes acceder a tu negocio desde la landing usando
        el correo y contraseña que acabas de registrar.
        Si tienes varios negocios, aparecerán todos en una sola pantalla.
      </Paragraph>

      <Button
        type="primary"
        size="large"
        icon={<ArrowRightOutlined />}
        onClick={() => navigate('/acceder')}
        style={{
          height: 52, paddingInline: 40, fontWeight: 700, fontSize: 16,
          background: `linear-gradient(135deg, ${neonCyan}, #0080cc)`,
          border: 'none', borderRadius: 12, boxShadow: neonGlow,
        }}
      >
        Acceder a mi negocio
      </Button>

      <button
        onClick={() => navigate('/planes')}
        style={{ marginTop: 16, background: 'none', border: 'none',
          color: '#6b7280', cursor: 'pointer', fontSize: 13 }}>
        ← Volver a los planes
      </button>
    </div>
  );
}