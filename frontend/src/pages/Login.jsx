import React, { useState, useContext, useRef } from 'react';
import {
  Form, Input, Button, Card, Typography, Alert,
  message, Layout, Checkbox, Modal, Divider, Spin
} from 'antd';
import {
  UserOutlined, LockOutlined, MailOutlined, KeyOutlined,
  ShopOutlined, CheckCircleOutlined, CloseCircleOutlined,
  SearchOutlined, TeamOutlined, CrownOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import NegocIALogo from '../components/NegocIALogo';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../ThemeContext';
import axios from 'axios';

const { Title, Text } = Typography;

// ÔöÇÔöÇ Colores para los tabs ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
const TAB_GERENTE     = 'gerente';
const TAB_COLABORADOR = 'colaborador';

const Login = () => {
  const [activeTab, setActiveTab]         = useState(TAB_GERENTE);

  // ÔöÇÔöÇ Estado Gerente ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const [gerenteLoading, setGerenteLoading] = useState(false);
  const [gerenteError, setGerenteError]     = useState(null);
  const [gerenteNegocios, setGerenteNegocios] = useState(null); // lista si tiene varios negocios
  const [gerenteSelecLoading, setGerenteSelecLoading] = useState(false);

  // ÔöÇÔöÇ Estado Colaborador ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const [colabLoading, setColabLoading]         = useState(false);
  const [colabError, setColabError]             = useState(null);
  const [colabCode, setColabCode]               = useState('');
  const [colabVerifying, setColabVerifying]     = useState(false);
  const [colabTenant, setColabTenant]           = useState(null);   // { nombre, schema } tras verificar
  const [colabTenantError, setColabTenantError] = useState(null);
  const [colabForm]                             = Form.useForm();

  // ÔöÇÔöÇ Forgot Password ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const [forgotOpen, setForgotOpen]       = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(null);
  const [forgotError, setForgotError]     = useState(null);
  const [forgotForm]                      = Form.useForm();

  const { login, platformLogin, accessTenant, colaboradorLogin, tenantLookup }
    = useContext(AuthContext);
  const { schema }  = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();
  const { isDark }  = useTheme();
  const from        = location.state?.from?.pathname || '/';

  // ÔöÇÔöÇ Colores adaptativos ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const cardBg     = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.92)';
  const cardBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const textColor  = isDark ? '#fff' : '#141414';

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // FLUJO GERENTE
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  const onGerenteFinish = async (values) => {
    setGerenteLoading(true);
    setGerenteError(null);
    setGerenteNegocios(null);

    const result = await platformLogin(values.email.trim().toLowerCase(), values.password);

    if (!result.success) {
      // Si la suscripci├│n est├í inactiva, mensaje espec├¡fico
      if (result.suscripcion_inactiva) {
        setGerenteError({
          type: 'subscription',
          message: result.message,
        });
      } else {
        setGerenteError({ type: 'credentials', message: result.message });
      }
      setGerenteLoading(false);
      return;
    }

    const negocios = result.negocios || [];

    // Si solo tiene 1 negocio, entrar directo
    if (negocios.length === 1) {
      const neg = negocios[0];
      if (!neg.suscripcion_activa) {
        setGerenteError({ type: 'subscription', message: neg.mensaje_suscripcion });
        setGerenteLoading(false);
        return;
      }
      const acceso = await accessTenant(neg.schema, !!values.remember);
      if (acceso.success) {
        message.success(`Bienvenido, ${neg.nombre}`);
        navigate(`/t/${neg.schema}`, { replace: true });
      } else {
        setGerenteError({ type: 'credentials', message: acceso.message });
      }
    } else {
      // Mostrar selector de negocio
      setGerenteNegocios({ negocios, remember: !!values.remember });
    }
    setGerenteLoading(false);
  };

  const onSelectNegocio = async (neg) => {
    if (!neg.suscripcion_activa) {
      setGerenteError({ type: 'subscription', message: neg.mensaje_suscripcion });
      return;
    }
    setGerenteSelecLoading(neg.schema);
    const acceso = await accessTenant(neg.schema, gerenteNegocios?.remember);
    if (acceso.success) {
      message.success(`Bienvenido, ${neg.nombre}`);
      navigate(`/t/${neg.schema}`, { replace: true });
    } else {
      setGerenteError({ type: 'credentials', message: acceso.message });
    }
    setGerenteSelecLoading(false);
  };

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // FLUJO COLABORADOR: verificar c├│digo de negocio
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  const handleVerificarCodigo = async () => {
    const code = colabCode.trim();
    if (!code) {
      setColabTenantError('Ingresa el c├│digo de negocio primero.');
      return;
    }
    setColabVerifying(true);
    setColabTenant(null);
    setColabTenantError(null);

    const res = await tenantLookup(code);

    if (res.success) {
      setColabTenant({ nombre: res.nombre, schema: res.schema });
    } else {
      if (res.found && res.suscripcion_activa === false) {
        setColabTenantError(`ÔÜá´©Å ${res.message}`);
      } else {
        setColabTenantError(res.message);
      }
    }
    setColabVerifying(false);
  };

  const onColabFinish = async (values) => {
    if (!colabTenant) {
      setColabError('Primero verifica el c├│digo de negocio.');
      return;
    }
    setColabLoading(true);
    setColabError(null);

    const result = await colaboradorLogin(
      colabTenant.schema,
      values.username.trim(, false, colabTenant?.codigo_acceso),
      values.password,
      !!values.remember
    );

    if (result.success) {
      message.success(`Bienvenido a ${colabTenant.nombre}`);
      // Colaborador va directo a Ventas
      navigate(`/t/${colabTenant.schema}/ventas`, { replace: true });
    } else {
      setColabError(result.message);
    }
    setColabLoading(false);
  };

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // FORGOT PASSWORD
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  const onForgotSubmit = async (values) => {
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await axios.post(`${apiBase}/api/auth/forgot-password/`, { email: values.email });
      let msg = res.data.detail || 'Revisa tu email con las instrucciones.';
      if (res.data.reset_url) msg += `\n\n[DEV] Link: ${res.data.reset_url}`;
      setForgotSuccess(msg);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Error al enviar. Intenta m├ís tarde.');
    }
    setForgotLoading(false);
  };

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // RENDER
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  return (
    <Layout style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isDark
        ? 'linear-gradient(135deg, #0d0d1a 0%, #0a1628 60%, #0d0d1a 100%)'
        : 'linear-gradient(135deg, #e8edf5 0%, #f0f4fc 100%)',
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 460,
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
        {/* Logo / T├¡tulo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #1677ff, #00b4ff)',
            marginBottom: 14,
            boxShadow: '0 4px 18px rgba(22,119,255,0.45)',
          }}>
            <LockOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <Title level={2} style={{ margin: 0, fontSize: 21, fontWeight: 700, color: textColor }}>
            Bienvenido a NegocIA
          </Title>
          <Text style={{ color: mutedColor, fontSize: 13 }}>
            Selecciona c├│mo deseas ingresar
          </Text>
        </div>

        {/* ÔöÇÔöÇ SELECTOR DE TAB ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 8, marginBottom: 24,
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          borderRadius: 12, padding: 4,
        }}>
          {[
            { key: TAB_GERENTE,     label: 'Gerente',     icon: <CrownOutlined /> },
            { key: TAB_COLABORADOR, label: 'Colaborador',  icon: <TeamOutlined /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setGerenteError(null);
                setColabError(null);
                setGerenteNegocios(null);
              }}
              style={{
                padding: '10px 8px',
                borderRadius: 9,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.2s ease',
                background: activeTab === tab.key
                  ? (isDark ? '#1677ff' : '#1677ff')
                  : 'transparent',
                color: activeTab === tab.key
                  ? '#fff'
                  : (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)'),
                boxShadow: activeTab === tab.key ? '0 2px 8px rgba(22,119,255,0.4)' : 'none',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
            TAB: GERENTE
        ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */}
        {activeTab === TAB_GERENTE && (
          <>
            {/* Error de suscripci├│n */}
            {gerenteError?.type === 'subscription' && (
              <Alert
                message="Suscripci├│n inactiva"
                description={gerenteError.message}
                type="warning"
                showIcon
                closable
                onClose={() => setGerenteError(null)}
                style={{ marginBottom: 18, borderRadius: 10 }}
              />
            )}
            {/* Error de credenciales */}
            {gerenteError?.type === 'credentials' && (
              <Alert
                message="Error de acceso"
                description={gerenteError.message}
                type="error"
                showIcon
                closable
                onClose={() => setGerenteError(null)}
                style={{ marginBottom: 18, borderRadius: 10 }}
              />
            )}

            {/* Selector de negocio (multi-negocio) */}
            {gerenteNegocios && (
              <div style={{ marginBottom: 20 }}>
                <Text style={{ color: mutedColor, fontSize: 13, display: 'block', marginBottom: 10 }}>
                  Tienes acceso a varios negocios. Selecciona uno:
                </Text>
                {gerenteNegocios.negocios.map(neg => (
                  <button
                    key={neg.schema}
                    onClick={() => onSelectNegocio(neg)}
                    disabled={!!gerenteSelecLoading}
                    style={{
                      width: '100%', marginBottom: 8,
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)',
                      cursor: neg.suscripcion_activa ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      opacity: neg.suscripcion_activa ? 1 : 0.5,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: textColor, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShopOutlined style={{ color: '#1677ff' }} />
                      {neg.nombre}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {!neg.suscripcion_activa && (
                        <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Inactivo</span>
                      )}
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                        background: '#1677ff22', color: '#1677ff',
                      }}>{neg.rol}</span>
                      {gerenteSelecLoading === neg.schema && <Spin size="small" />}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Formulario Gerente */}
            {!gerenteNegocios && (
              <Form name="gerente_form" initialValues={{ remember: false }}
                onFinish={onGerenteFinish} size="large" layout="vertical">

                <Form.Item name="email"
                  rules={[
                    { required: true, message: 'Ingresa tu correo electr├│nico' },
                    { type: 'email', message: 'Ingresa un correo v├ílido' },
                  ]}>
                  <Input
                    prefix={<MailOutlined style={{ color: '#1677ff' }} />}
                    placeholder="Correo electr├│nico"
                    type="email"
                    autoComplete="email"
                    style={{ borderRadius: 10, height: 46 }}
                  />
                </Form.Item>

                <Form.Item name="password"
                  rules={[{ required: true, message: 'Ingresa tu contrase├▒a' }]}>
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#1677ff' }} />}
                    placeholder="Contrase├▒a"
                    autoComplete="current-password"
                    style={{ borderRadius: 10, height: 46 }}
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Form.Item name="remember" valuePropName="checked" noStyle>
                      <Checkbox style={{ color: isDark ? 'rgba(255,255,255,0.65)' : undefined }}>
                        Mantener sesi├│n
                      </Checkbox>
                    </Form.Item>
                    <span
                      onClick={() => { setForgotOpen(true); setForgotSuccess(null); setForgotError(null); forgotForm.resetFields(); }}
                      style={{ fontSize: 13, color: '#1677ff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      ┬┐Olvidaste tu contrase├▒a?
                    </span>
                  </div>
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={gerenteLoading}
                    style={{
                      width: '100%', height: 46, borderRadius: 10,
                      fontWeight: 600, fontSize: 15, border: 'none',
                      background: 'linear-gradient(135deg, #1677ff, #0958d9)',
                      boxShadow: '0 4px 14px rgba(22,119,255,0.4)',
                    }}
                  >
                    Ingresar como Gerente
                  </Button>
                </Form.Item>
              </Form>
            )}
          </>
        )}

        {/* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
            TAB: COLABORADOR
        ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */}
        {activeTab === TAB_COLABORADOR && (
          <>
            {colabError && (
              <Alert
                message="Error de acceso"
                description={colabError}
                type="error"
                showIcon
                closable
                onClose={() => setColabError(null)}
                style={{ marginBottom: 18, borderRadius: 10 }}
              />
            )}

            <Form name="colab_form" form={colabForm} initialValues={{ remember: false }}
              onFinish={onColabFinish} size="large" layout="vertical">

              {/* Campo: C├│digo de negocio */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  fontSize: 12, fontWeight: 600, color: mutedColor,
                  display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  C├│digo de negocio
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input
                    prefix={<ShopOutlined style={{ color: '#8b5cf6' }} />}
                    placeholder="Ej: pizzia"
                    value={colabCode}
                    onChange={e => {
                      setColabCode(e.target.value);
                      setColabTenant(null);
                      setColabTenantError(null);
                    }}
                    onPressEnter={handleVerificarCodigo}
                    style={{ borderRadius: 10, height: 46, flex: 1 }}
                    size="large"
                  />
                  <Button
                    onClick={handleVerificarCodigo}
                    loading={colabVerifying}
                    icon={<SearchOutlined />}
                    style={{
                      height: 46, borderRadius: 10, fontWeight: 600,
                      background: '#8b5cf6', color: '#fff', border: 'none',
                      boxShadow: '0 4px 12px rgba(139,92,246,0.4)',
                    }}
                  >
                    Verificar
                  </Button>
                </div>

                {/* Resultado de verificaci├│n */}
                {colabTenant && (
                  <div style={{
                    marginTop: 10, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <CheckCircleOutlined style={{ color: '#10b981', fontSize: 16 }} />
                    <div>
                      <div style={{ fontWeight: 700, color: '#10b981', fontSize: 13 }}>
                        Negocio verificado
                      </div>
                      <div style={{ color: textColor, fontSize: 14, fontWeight: 600 }}>
                        {colabTenant.nombre}
                      </div>
                    </div>
                  </div>
                )}
                {colabTenantError && (
                  <div style={{
                    marginTop: 10, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 16 }} />
                    <span style={{ color: '#ef4444', fontSize: 13 }}>{colabTenantError}</span>
                  </div>
                )}
              </div>

              {/* Campo: Usuario */}
              <Form.Item name="username"
                rules={[{ required: true, message: 'Ingresa tu nombre de usuario' }]}>
                <Input
                  prefix={<UserOutlined style={{ color: '#8b5cf6' }} />}
                  placeholder="Nombre de usuario"
                  autoComplete="username"
                  style={{ borderRadius: 10, height: 46 }}
                />
              </Form.Item>

              {/* Campo: Contrase├▒a */}
              <Form.Item name="password"
                rules={[{ required: true, message: 'Ingresa tu contrase├▒a' }]}>
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#8b5cf6' }} />}
                  placeholder="Contrase├▒a"
                  autoComplete="current-password"
                  style={{ borderRadius: 10, height: 46 }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 20 }}>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox style={{ color: isDark ? 'rgba(255,255,255,0.65)' : undefined }}>
                    Mantener sesi├│n
                  </Checkbox>
                </Form.Item>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={colabLoading}
                  disabled={!colabTenant}
                  style={{
                    width: '100%', height: 46, borderRadius: 10,
                    fontWeight: 600, fontSize: 15, border: 'none',
                    background: colabTenant
                      ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                      : undefined,
                    boxShadow: colabTenant ? '0 4px 14px rgba(139,92,246,0.4)' : 'none',
                  }}
                >
                  Ingresar al negocio
                </Button>
              </Form.Item>
            </Form>
          </>
        )}

        <Divider style={{ margin: '22px 0 12px', opacity: 0.2 }} />
        <Text style={{ fontSize: 12, display: 'block', textAlign: 'center', color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
          NegocIA SaaS ┬À Acceso seguro
        </Text>
      </Card>

      {/* ÔöÇÔöÇ Modal: Olvid├® mi contrase├▒a ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
      <Modal
        open={forgotOpen}
        onCancel={() => setForgotOpen(false)}
        footer={null}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyOutlined style={{ color: '#1677ff' }} />
            Restablecer contrase├▒a
          </div>
        }
        centered
        destroyOnClose
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Ingresa el email del Gerente. Recibir├ís un enlace para restablecer tu contrase├▒a.
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
                { type: 'email', message: 'Ingresa un email v├ílido' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#1677ff' }} />}
                placeholder="tu@email.com"
                autoComplete="email"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={forgotLoading}
              style={{ width: '100%', height: 42, borderRadius: 8 }}>
              Enviar instrucciones
            </Button>
          </Form>
        )}

        {forgotSuccess && (
          <Button block onClick={() => setForgotOpen(false)} style={{ marginTop: 8, borderRadius: 8 }}>
            Cerrar
          </Button>
        )}
      </Modal>
    </Layout>
  );
};

export default Login;
