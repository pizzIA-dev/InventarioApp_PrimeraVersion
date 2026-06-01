import React, { useState, useEffect, useContext } from 'react';
import { Button, Card, Col, Row, Typography, Input, Form, message, Upload, Spin } from 'antd';
import {
  RocketOutlined, TrophyOutlined, CheckCircleOutlined,
  MailOutlined, PhoneOutlined, UploadOutlined, ArrowRightOutlined,
  LockOutlined, ShopOutlined, LoginOutlined, LoadingOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import NegocIALogo from '../components/NegocIALogo';
import { AuthContext } from '../context/AuthContext';

const { Title, Paragraph, Text } = Typography;
const normFile = (e) => { if (Array.isArray(e)) return e; return e?.fileList; };

export default function Landing({ view }) {
  const [loading, setLoading]               = useState(false);
  const [currency, setCurrency]             = useState('PEN');
  const [registroForm]                      = Form.useForm();
  const [slugPreview, setSlugPreview]       = useState('');
  const [registroError, setRegistroError]   = useState('');
  const [slugError, setSlugError]           = useState('');
  const watchedValues = Form.useWatch([], registroForm);
  const isFormComplete = Boolean(
    watchedValues?.empresa?.trim() && watchedValues?.email?.trim() &&
    watchedValues?.subdominio?.trim() && watchedValues?.password?.trim() &&
    watchedValues?.confirmar_password?.trim()
  );
  const [accederStep, setAccederStep]           = useState('form');
  const [platformError, setPlatformError]       = useState('');
  const [misNegocios, setMisNegocios]           = useState([]);
  const [accederLoadingId, setAccederLoadingId] = useState(null);
  const [accederForm]                           = Form.useForm();

  const { planId }  = useParams();
  const navigate    = useNavigate();
  const { platformLogin, accessTenant } = useContext(AuthContext);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetch('https://get.geojs.io/v1/ip/country.json')
      .then(r => r.json()).then(d => setCurrency(d.country === 'PE' ? 'PEN' : 'USD'))
      .catch(() => setCurrency('PEN'));
  }, []);

  useEffect(() => {
    if (view !== 'acceder') {
      setAccederStep('form'); setPlatformError(''); setMisNegocios([]); accederForm.resetFields();
    }
  }, [view]);

  const onPlatformLogin = async (values) => {
    setAccederStep('loading'); setPlatformError('');
    const result = await platformLogin(values.email, values.password);
    if (!result.success) { setPlatformError(result.message || 'Credenciales incorrectas'); setAccederStep('form'); return; }
    try {
      const res = await fetch(API_BASE + '/api/public/buscar-tenant/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email.toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok && data.found) { setMisNegocios(data.negocios); setAccederStep('negocios'); }
      else { setPlatformError(data.error || 'No encontramos negocios con ese correo.'); setAccederStep('form'); }
    } catch { setPlatformError('Error de conexion.'); setAccederStep('form'); }
  };

  const onAccessTenant = async (schema) => {
    setAccederLoadingId(schema);
    const result = await accessTenant(schema, false);
    if (result.success) { message.success('Accediendo...'); navigate('/t/' + schema); }
    else { message.error(result.message || 'No se pudo acceder.'); setAccederLoadingId(null); }
  };

  const generarSlug = (nombre) =>
    nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').substring(0, 30);

  const onNombreEmpresaChange = (e) => {
    const slug = generarSlug(e.target.value);
    registroForm.setFieldValue('subdominio', slug); setSlugPreview(slug);
  };
  const registrarConToken = async (values, culqiToken) => {
    setLoading(true); setRegistroError('');
    try {
      const formData = new FormData();
      formData.append('nombre_empresa', values.empresa);
      formData.append('subdominio',     values.subdominio);
      formData.append('email_admin',    values.email);
      formData.append('password_admin', values.password);
      formData.append('plan_id',        planId || '1');
      formData.append('culqi_token',    culqiToken || '');
      if (values.ruc) formData.append('ruc', values.ruc);
      if (values.logo?.length > 0) formData.append('logo', values.logo[0].originFileObj);
      const response = await fetch(API_BASE + '/api/public/registro/', { method: 'POST', body: formData });
      const data = await response.json();
      if (response.ok) {
        message.success('Negocio creado exitosamente');
        navigate('/registro/exitoso?schema=' + data.schema + '&empresa=' + encodeURIComponent(values.empresa));
      } else {
        if (data.subdominio) { const msg = Array.isArray(data.subdominio) ? data.subdominio[0] : data.subdominio; setSlugError(msg); setRegistroError('El identificador ya esta en uso.'); }
        else setRegistroError(data.error || 'Error en el registro.');
      }
    } catch { setRegistroError('Error de conexion con el servidor.'); }
    setLoading(false);
  };

  const cargarCulqi = (t = 5000) => new Promise((resolve) => {
    if (typeof window.Culqi !== 'undefined') { resolve(true); return; }
    const s = document.createElement('script'); s.src = 'https://checkout.culqi.com/js/v4';
    const timer = setTimeout(() => resolve(false), t);
    s.onload = () => { clearTimeout(timer); resolve(true); };
    s.onerror = () => { clearTimeout(timer); resolve(false); };
    document.head.appendChild(s);
  });

  const onFinishRegistro = async (values) => {
    setLoading(true); setRegistroError('');
    const culqiKey = import.meta.env.VITE_CULQI_PUBLIC_KEY || '';
    if (!culqiKey || culqiKey.startsWith('pk_test_') || culqiKey === 'pk_test_placeholder') {
      await registrarConToken(values, ''); return;
    }
    try {
      const ok = await cargarCulqi(5000);
      if (ok && typeof window.Culqi !== 'undefined') {
        window.Culqi.publicKey = culqiKey;
        window.Culqi.settings({ title: 'NegocIA', currency: currency || 'PEN',
          description: 'Plan Emprendedor - ' + values.empresa,
          amount: currency === 'USD' ? 1200 : 3900, order: 'reg_' + Date.now() });
        window.culqi = async () => {
          if (window.Culqi.token) { window.Culqi.close(); await registrarConToken(values, window.Culqi.token.id); }
          else if (window.Culqi.error) { setLoading(false); message.error(window.Culqi.error.user_message || 'Pago rechazado'); }
        };
        setLoading(false); window.Culqi.open(); return;
      }
    } catch {}
    await registrarConToken(values, '');
  };

  // Tokens de diseño
  const neonCyan = '#00d2ff', darkBg = '#0a0e14', cardBg = '#111822';
  const neonGlow = '0 0 10px rgba(0,210,255,0.5)', neonTextGlow = '0 0 8px rgba(0,210,255,0.8)';
  return (
    <div style={{ backgroundColor: darkBg, minHeight: '100vh', color: '#fff',
      fontFamily: 'Inter, sans-serif',
      backgroundImage: 'linear-gradient(rgba(0,210,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,210,255,0.04) 1px, transparent 1px)',
      backgroundSize: '40px 40px', display: 'flex', flexDirection: 'column' }}>

      {/* ══ HEADER: Logo | [espacio] | Acceder (ghost) | Crear negocio (filled) ══ */}
      <header style={{ padding: '0 40px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', minHeight: '60px',
        background: 'rgba(10,14,20,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,210,255,0.2)',
        boxShadow: '0 2px 20px rgba(0,210,255,0.1)',
        position: 'sticky', top: 0, zIndex: 100 }}>

        {/* Logo - siempre va a /planes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => navigate('/planes')}>
          <NegocIALogo width={32} height={32} />
          <Title level={3} style={{ margin: 0, fontWeight: 800, lineHeight: 1 }}>
            <span style={{ color: '#fff' }}>Negoc</span>
            <span style={{ color: neonCyan, textShadow: neonTextGlow }}>IA</span>
          </Title>
        </div>

        {/* Nav derecha: patrón SaaS estándar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Acceder: ghost link para usuarios que YA tienen negocio */}
          <button
            onClick={() => navigate('/acceder')}
            style={{
              background: view === 'acceder' ? 'rgba(0,210,255,0.1)' : 'transparent',
              border: view === 'acceder' ? '1px solid rgba(0,210,255,0.4)' : '1px solid transparent',
              borderRadius: 8, cursor: 'pointer', padding: '7px 18px',
              color: view === 'acceder' ? neonCyan : '#c9d1d9',
              fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = neonCyan; e.currentTarget.style.borderColor = 'rgba(0,210,255,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = view === 'acceder' ? neonCyan : '#c9d1d9'; e.currentTarget.style.borderColor = view === 'acceder' ? 'rgba(0,210,255,0.4)' : 'transparent'; }}
          >
            Acceder
          </button>
          {/* Crear negocio: filled CTA para usuarios nuevos */}
          <Button
            icon={<RocketOutlined />}
            onClick={() => navigate('/planes')}
            style={{
              background: neonCyan, color: darkBg,
              border: 'none', fontWeight: 700, boxShadow: neonGlow,
              fontSize: 13, height: 36, borderRadius: 8,
            }}>
            Crear negocio
          </Button>
        </div>
      </header>
      {/* ══ MAIN ══ */}
      <main style={{ maxWidth: '1160px', width: '100%', margin: '0 auto', padding: '56px 20px', flex: 1 }}>

        {/* ─── PLANES ─── */}
        {view === 'planes' && (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.8s' }}>

            {/* Pill badge */}
            <div style={{ display: 'inline-block', background: 'rgba(0,210,255,0.08)',
              border: '1px solid rgba(0,210,255,0.25)', borderRadius: 20,
              padding: '4px 18px', marginBottom: 22, fontSize: 12,
              color: neonCyan, letterSpacing: 1, fontWeight: 600 }}>
              ✦ Sistema de gestión para negocios peruanos
            </div>

            <Title style={{ color: '#fff', fontSize: '3rem', marginBottom: 14, lineHeight: 1.15 }}>
              Crece sin límites<br/>
              <span style={{ color: neonCyan, textShadow: neonTextGlow }}>de personal</span>
            </Title>
            <Paragraph style={{ color: '#a0c0e0', fontSize: '1.1rem', maxWidth: '600px',
              margin: '0 auto 56px', lineHeight: 1.7 }}>
              Inventario, ventas, cajas y más — sin castigarte por crecer.
              Afilia tantos vendedores como necesites sin cambiar tu tarifa.
            </Paragraph>

            <Row gutter={[40, 40]} justify="center">
              {/* Plan Emprendedor */}
              <Col xs={24} md={10}>
                <Card hoverable
                  style={{ background: cardBg, border: '1px solid rgba(0,210,255,0.3)',
                    borderRadius: 14, transition: 'all 0.3s' }}
                  bodyStyle={{ padding: '40px' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = neonGlow; e.currentTarget.style.borderColor = neonCyan; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(0,210,255,0.3)'; }}>
                  <RocketOutlined style={{ fontSize: 44, color: neonCyan, marginBottom: 18, filter: 'drop-shadow(0 0 8px ' + neonCyan + ')' }} />
                  <Title level={2} style={{ color: '#fff' }}>Emprendedor</Title>
                  <Title level={1} style={{ color: neonCyan, margin: '12px 0 30px', textShadow: neonTextGlow }}>
                    {currency === 'PEN' ? 'S/ 39' : '$ 12'}
                    <span style={{ fontSize: '1rem', color: '#8b949e', textShadow: 'none' }}> / mes</span>
                  </Title>
                  <div style={{ textAlign: 'left', marginBottom: 36, fontSize: 15, color: '#e6edf3' }}>
                    <p style={{ marginBottom: 12 }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: 8 }} />Inventario y Ventas Completo</p>
                    <p style={{ marginBottom: 12, fontWeight: 'bold' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: 8 }} /><span style={{ color: neonCyan }}>Vendedores Ilimitados</span></p>
                    <p style={{ marginBottom: 12 }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: 8 }} />Múltiples Cajas y Movimientos</p>
                    <p style={{ marginBottom: 12 }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: 8 }} />Panel privado (ej. /t/mi-negocio)</p>
                  </div>
                  <Button type="primary" size="large" block
                    onClick={() => navigate('/registro/1')}
                    style={{ height: 50, background: 'transparent', borderColor: neonCyan,
                      color: neonCyan, fontWeight: 700, boxShadow: neonGlow, borderRadius: 10,
                      fontSize: 15 }}>
                    Empezar ahora →
                  </Button>
                </Card>
              </Col>

              {/* Plan Empresario */}
              <Col xs={24} md={10}>
                <Card hoverable
                  style={{ background: cardBg, border: '2px solid ' + neonCyan,
                    borderRadius: 14, position: 'relative', boxShadow: neonGlow }}
                  bodyStyle={{ padding: '40px' }}>
                  <div style={{ position: 'absolute', top: -14, right: 28,
                    background: darkBg, color: neonCyan, border: '1px solid ' + neonCyan,
                    boxShadow: neonGlow, padding: '4px 18px', borderRadius: 20,
                    fontWeight: 700, textShadow: neonTextGlow, fontSize: 11,
                    letterSpacing: 1 }}>CORPORATIVO</div>
                  <TrophyOutlined style={{ fontSize: 44, color: neonCyan, marginBottom: 18, filter: 'drop-shadow(0 0 8px ' + neonCyan + ')' }} />
                  <Title level={2} style={{ color: '#fff' }}>Empresario</Title>
                  <Title level={1} style={{ margin: '12px 0 30px', textShadow: neonTextGlow }}>
                    A <span style={{ color: neonCyan }}>Medida</span>
                  </Title>
                  <div style={{ textAlign: 'left', marginBottom: 36, fontSize: 15, color: '#e6edf3' }}>
                    <p style={{ marginBottom: 12 }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: 8 }} />Todo lo del plan Emprendedor</p>
                    <p style={{ marginBottom: 12 }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: 8 }} />Jerarquías, Roles y Permisos</p>
                    <p style={{ marginBottom: 12 }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: 8 }} />Escalado masivo y APIs dedicadas</p>
                    <p style={{ marginBottom: 12, color: '#8b949e' }}><CheckCircleOutlined style={{ color: '#8b949e', marginRight: 8 }} /><i>Cobro variable — cotización personalizada</i></p>
                  </div>
                  <Button type="primary" size="large" block
                    onClick={() => message.info('Escríbenos a pizzia.peru@gmail.com para tu cotización')}
                    style={{ height: 50, background: neonCyan, color: darkBg,
                      fontWeight: 700, boxShadow: neonGlow, border: 'none', borderRadius: 10, fontSize: 15 }}>
                    Solicitar cotización
                  </Button>
                </Card>
              </Col>
            </Row>

            {/* Contacto */}
            <div style={{ marginTop: 72, padding: '40px',
              background: 'linear-gradient(135deg, rgba(0,162,255,0.07), rgba(0,210,255,0.03))',
              border: '1px solid rgba(0,210,255,0.18)', borderRadius: 16,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Title level={3} style={{ color: '#fff', margin: 0 }}>
                ¿Tienes dudas? <span style={{ color: neonCyan }}>Escríbenos</span>
              </Title>
              <Paragraph style={{ color: '#8b949e', margin: 0 }}>
                Estamos en Perú · Respondemos rápido por correo y teléfono.
              </Paragraph>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                <a href="mailto:pizzia.peru@gmail.com" style={{ textDecoration: 'none' }}>
                  <Button size="large" icon={<MailOutlined />}
                    style={{ background: neonCyan, color: darkBg, border: 'none', fontWeight: 700,
                      boxShadow: neonGlow, height: 46, paddingInline: 24 }}>
                    pizzia.peru@gmail.com
                  </Button>
                </a>
                <a href="tel:+51948413244" style={{ textDecoration: 'none' }}>
                  <Button size="large" icon={<PhoneOutlined />}
                    style={{ background: 'transparent', color: neonCyan, borderColor: neonCyan,
                      fontWeight: 700, boxShadow: neonGlow, height: 46, paddingInline: 24 }}>
                    +51 948 413 244
                  </Button>
                </a>
              </div>
            </div>

            {/* Hint para usuarios que YA tienen cuenta */}
            <div style={{ marginTop: 40, padding: '18px 0', textAlign: 'center',
              borderTop: '1px solid rgba(0,210,255,0.08)' }}>
              <Text style={{ color: '#6b7280', fontSize: 14 }}>
                ¿Ya registraste tu negocio antes?{'  '}
              </Text>
              <button onClick={() => navigate('/acceder')}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  color: neonCyan, fontWeight: 700, fontSize: 14, padding: '0 4px',
                  textDecoration: 'underline' }}>
                Acceder a tu negocio →
              </button>
            </div>
          </div>
        )}
        {/* ─── ACCEDER ─── */}
        {view === 'acceder' && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            {accederStep === 'form' && (
              <div style={{ maxWidth: 420, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 64, height: 64, borderRadius: 16,
                    background: 'linear-gradient(135deg, ' + neonCyan + ', #0088cc)',
                    marginBottom: 20, boxShadow: '0 4px 24px rgba(0,210,255,0.45)' }}>
                    <LoginOutlined style={{ fontSize: 28, color: '#000' }} />
                  </div>
                  <Title level={2} style={{ color: '#fff', margin: '0 0 6px' }}>Accede a tus negocios</Title>
                  <Text style={{ color: '#8b949e', fontSize: 14 }}>
                    Usa el correo y contraseña con los que creaste tu negocio
                  </Text>
                </div>
                <Card style={{ background: cardBg, border: '1px solid rgba(0,210,255,0.35)',
                  borderRadius: 14, boxShadow: neonGlow }}>
                  <Form form={accederForm} layout="vertical" onFinish={onPlatformLogin} size="large">
                    <Form.Item name="email" label={<span style={{ color: '#c9d1d9' }}>Correo electrónico</span>}
                      rules={[{ required: true, message: 'Ingresa tu correo' }, { type: 'email' }]}>
                      <Input prefix={<MailOutlined style={{ color: neonCyan }} />}
                        placeholder="tu@correo.com" type="email"
                        style={{ background: darkBg, borderColor: 'rgba(0,210,255,0.25)', color: '#fff', borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item name="password" label={<span style={{ color: '#c9d1d9' }}>Contraseña</span>}
                      rules={[{ required: true, message: 'Ingresa tu contraseña' }]}>
                      <Input.Password prefix={<LockOutlined style={{ color: neonCyan }} />}
                        placeholder="Tu contraseña"
                        style={{ background: darkBg, borderColor: 'rgba(0,210,255,0.25)', color: '#fff', borderRadius: 8 }} />
                    </Form.Item>
                    {platformError && (
                      <div style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.35)',
                        borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#ff6b6b', fontSize: 13 }}>
                        ⚠️ {platformError}
                      </div>
                    )}
                    <Button type="primary" htmlType="submit" block style={{
                      height: 46, background: 'linear-gradient(135deg, ' + neonCyan + ', #0088cc)',
                      color: '#000', border: 'none', fontWeight: 800, fontSize: 15,
                      boxShadow: neonGlow, borderRadius: 10 }}>
                      Entrar →
                    </Button>
                  </Form>
                  <div style={{ marginTop: 18, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                    <Text style={{ color: '#6b7280', fontSize: 13 }}>¿No tienes negocio aún? </Text>
                    <button onClick={() => navigate('/planes')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        color: neonCyan, fontWeight: 700, fontSize: 13, padding: '0 4px' }}>
                      Crear uno gratis →
                    </button>
                  </div>
                </Card>
              </div>
            )}

            {accederStep === 'loading' && (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: neonCyan }} spin />} />
                <div style={{ color: '#8b949e', marginTop: 24, fontSize: 15 }}>Buscando tus negocios...</div>
              </div>
            )}

            {accederStep === 'negocios' && (
              <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                  <Title level={2} style={{ color: '#fff', margin: '0 0 8px' }}>
                    Tus <span style={{ color: neonCyan }}>Negocios</span>
                  </Title>
                  <Text style={{ color: '#8b949e', fontSize: 14 }}>
                    Haz clic en el negocio al que quieres acceder — sin volver a ingresar tu contraseña
                  </Text>
                </div>
                <Row gutter={[24, 24]} justify="center">
                  {misNegocios.map((neg, i) => (
                    <Col xs={24} sm={12} md={8} key={i}>
                      <Card hoverable
                        style={{ background: cardBg, border: '1px solid rgba(0,210,255,0.25)',
                          borderRadius: 14, textAlign: 'center', transition: 'all 0.25s' }}
                        bodyStyle={{ padding: '32px 20px' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = neonCyan; e.currentTarget.style.boxShadow = neonGlow; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,210,255,0.25)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                        <div style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
                          background: 'linear-gradient(135deg, rgba(0,210,255,0.15), rgba(0,136,204,0.1))',
                          border: '1px solid rgba(0,210,255,0.25)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShopOutlined style={{ fontSize: 26, color: neonCyan }} />
                        </div>
                        <Title level={4} style={{ color: '#fff', margin: '0 0 4px' }}>{neg.nombre}</Title>
                        <Text style={{ color: '#8b949e', fontSize: 12, display: 'block', marginBottom: 20 }}>{neg.rol}</Text>
                        <Button type="primary" block loading={accederLoadingId === neg.schema}
                          onClick={() => onAccessTenant(neg.schema)}
                          icon={<ArrowRightOutlined />}
                          style={{ background: 'linear-gradient(135deg, ' + neonCyan + ', #0088cc)',
                            border: 'none', color: '#000', fontWeight: 700, height: 40, borderRadius: 8 }}>
                          Acceder
                        </Button>
                      </Card>
                    </Col>
                  ))}
                </Row>
                <div style={{ textAlign: 'center', marginTop: 32 }}>
                  <button onClick={() => { setAccederStep('form'); accederForm.resetFields(); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13 }}>
                    ← Usar otro correo
                  </button>
                  <span style={{ color: '#374151', margin: '0 14px' }}>·</span>
                  <button onClick={() => navigate('/registro/1')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: neonCyan, fontSize: 13, fontWeight: 600 }}>
                    + Crear otro negocio
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── REGISTRO ─── */}
        {view === 'registro' && (
          <div style={{ maxWidth: 460, margin: '0 auto', animation: 'fadeIn 0.5s' }}>

            {/* Banner del plan seleccionado */}
            {(() => {
              const planes = {
                '1': { nombre: 'Emprendedor', precio: currency === 'PEN' ? 'S/ 39 / mes' : '$ 12 / mes', icon: '🚀' },
                '2': { nombre: 'Empresario',  precio: 'A Medida', icon: '🏆' },
              };
              const plan = planes[planId] || planes['1'];
              return (
                <div style={{ background: 'linear-gradient(135deg, rgba(0,210,255,0.1), rgba(0,136,204,0.06))',
                  border: '1px solid rgba(0,210,255,0.35)', borderRadius: 12,
                  padding: '14px 20px', marginBottom: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 26 }}>{plan.icon}</span>
                    <div>
                      <div style={{ color: 'rgba(0,210,255,0.65)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Plan seleccionado</div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{plan.nombre}</div>
                    </div>
                  </div>
                  <div style={{ color: neonCyan, fontWeight: 800, fontSize: 17, textShadow: neonTextGlow }}>{plan.precio}</div>
                </div>
              );
            })()}

            <Title level={2} style={{ color: '#fff', textAlign: 'center', marginBottom: 24 }}>Crear tu negocio</Title>

            <Card style={{ background: cardBg, border: '1px solid rgba(0,210,255,0.3)', borderRadius: 14, boxShadow: neonGlow }}>
              <Form layout="vertical" form={registroForm} onFinish={onFinishRegistro} validateTrigger={['onChange', 'onBlur']}>

                <Form.Item label={<span style={{ color: '#c9d1d9', fontWeight: 500 }}>Nombre del Negocio</span>}
                  name="empresa" rules={[{ required: true, message: 'El nombre es requerido' }]}>
                  <Input size="large" placeholder="Ej: Bodega El Sol" onChange={onNombreEmpresaChange}
                    style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)', borderRadius: 8 }} />
                </Form.Item>

                <Form.Item label={<span style={{ color: '#c9d1d9', fontWeight: 500 }}>Correo del Administrador</span>}
                  name="email" rules={[{ required: true, message: 'El correo es requerido' }, { type: 'email', message: 'Correo inválido' }]}>
                  <Input size="large" placeholder="gerente@empresa.com"
                    style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)', borderRadius: 8 }} />
                </Form.Item>

                <Form.Item label={<span style={{ color: '#c9d1d9', fontWeight: 500 }}>Identificador de URL</span>}
                  name="subdominio"
                  rules={[{ required: true, message: 'Requerido' }, { pattern: /^[a-z0-9-]+$/, message: 'Solo minúsculas, números y guiones' }]}
                  extra={<span style={{ color: 'rgba(0,210,255,0.5)', fontSize: 12 }}>
                    Tu acceso: <strong style={{ color: neonCyan }}>negociav2.vercel.app/t/{slugPreview || 'mi-negocio'}/login</strong>
                  </span>}>
                  <Input size="large" placeholder="mi-negocio"
                    prefix={<span style={{ color: 'rgba(0,210,255,0.4)', fontSize: 12 }}>/t/</span>}
                    style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)', borderRadius: 8 }}
                    onChange={e => { const c = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); registroForm.setFieldValue('subdominio', c); setSlugPreview(c); }} />
                </Form.Item>

                <Form.Item label={<span style={{ color: '#c9d1d9', fontWeight: 500 }}>Contraseña</span>}
                  name="password" rules={[{ required: true, message: 'Requerida' }, { min: 8, message: 'Mínimo 8 caracteres' }]}>
                  <Input.Password size="large" placeholder="Mínimo 8 caracteres"
                    style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)', borderRadius: 8 }} />
                </Form.Item>

                <Form.Item label={<span style={{ color: '#c9d1d9', fontWeight: 500 }}>Confirmar Contraseña</span>}
                  name="confirmar_password" dependencies={['password']}
                  rules={[{ required: true, message: 'Confirma tu contraseña' },
                    ({ getFieldValue }) => ({ validator(_, value) {
                      if (!value || getFieldValue('password') === value) return Promise.resolve();
                      return Promise.reject(new Error('Las contraseñas no coinciden'));
                    }})]}>
                  <Input.Password size="large" placeholder="Repite la contraseña"
                    style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)', borderRadius: 8 }} />
                </Form.Item>

                <Form.Item label={<span style={{ color: '#c9d1d9', fontWeight: 500 }}>RUC <span style={{ color: '#6b7280', fontSize: 12 }}>(opcional)</span></span>} name="ruc">
                  <Input size="large" placeholder="20123456789"
                    style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)', borderRadius: 8 }} />
                </Form.Item>

                <Form.Item name="logo" label={<span style={{ color: '#c9d1d9', fontWeight: 500 }}>Logo <span style={{ color: '#6b7280', fontSize: 12 }}>(opcional)</span></span>}
                  valuePropName="fileList" getValueFromEvent={normFile}>
                  <Upload beforeUpload={() => false} maxCount={1} accept="image/*">
                    <Button icon={<UploadOutlined />}
                      style={{ background: 'transparent', color: neonCyan, borderColor: 'rgba(0,210,255,0.35)', borderRadius: 8 }}>
                      Seleccionar imagen
                    </Button>
                  </Upload>
                </Form.Item>

                {registroError && (<div style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.4)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#ff6b6b', fontSize: 13 }}>⚠️ {registroError}</div>)}
                {slugError && (<div style={{ background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.35)', borderRadius: 8, padding: '8px 14px', marginBottom: 8, color: '#ffa500', fontSize: 12 }}>💡 Intenta: <strong>{watchedValues?.subdominio}-2</strong></div>)}

                <Button type="primary" size="large" block htmlType="submit" loading={loading}
                  disabled={!isFormComplete}
                  style={{ marginTop: 8, height: 50, border: 'none', fontWeight: 800,
                    fontSize: 15, letterSpacing: 0.5, borderRadius: 10, transition: 'all 0.3s',
                    background: isFormComplete ? 'linear-gradient(135deg, ' + neonCyan + ', #0088cc)' : 'rgba(0,210,255,0.1)',
                    color: isFormComplete ? darkBg : 'rgba(0,210,255,0.35)',
                    boxShadow: isFormComplete ? neonGlow : 'none' }}>
                  {loading ? 'Creando tu negocio...' : isFormComplete ? 'Crear mi negocio →' : 'Completa todos los campos'}
                </Button>
                <button type="button" onClick={() => navigate('/planes')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%',
                    marginTop: 12, color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
                  ← Ver planes
                </button>
              </Form>
            </Card>
          </div>
        )}
      </main>

      {/* ══ FOOTER ══ */}
      <footer style={{ borderTop: '1px solid rgba(0,210,255,0.1)', background: 'rgba(4,7,13,0.97)',
        padding: '18px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280' }}>
          <span>Producto por</span>
          <a href="https://pizzia.org" target="_blank" rel="noopener noreferrer"
            style={{ color: neonCyan, fontWeight: 700, textDecoration: 'none' }}>PizzIA</a>
          <span>·</span>
          <a href="https://pizzia.org" target="_blank" rel="noopener noreferrer"
            style={{ color: '#6b7280', textDecoration: 'underline' }}>pizzia.org</a>
        </div>
        <div style={{ fontSize: 12, color: '#374151' }}>© {new Date().getFullYear()} PizzIA – Todos los derechos reservados</div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .ant-input::placeholder { color: rgba(0,210,255,0.28) !important; }
        .ant-input-password input::placeholder { color: rgba(0,210,255,0.28) !important; }
      `}</style>
    </div>
  );
}