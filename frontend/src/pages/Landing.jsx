import React, { useState, useEffect, useRef, useContext } from 'react';
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

const normFile = (e) => {
  if (Array.isArray(e)) return e;
  return e?.fileList;
};

export default function Landing({ view }) {
  const [loading, setLoading]             = useState(false);
  const [currency, setCurrency]           = useState('PEN');
  const [registroForm]                    = Form.useForm();
  const [slugPreview, setSlugPreview]     = useState('');
  const [registroError, setRegistroError] = useState('');
  const [slugError, setSlugError]         = useState('');
  const watchedValues = Form.useWatch([], registroForm);
  const isFormComplete = Boolean(
    watchedValues?.empresa?.trim() &&
    watchedValues?.email?.trim() &&
    watchedValues?.subdominio?.trim() &&
    watchedValues?.password?.trim() &&
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
      .then(r => r.json())
      .then(d => setCurrency(d.country === 'PE' ? 'PEN' : 'USD'))
      .catch(() => setCurrency('PEN'));
  }, []);

  useEffect(() => {
    if (view !== 'acceder') {
      setAccederStep('form'); setPlatformError('');
      setMisNegocios([]); accederForm.resetFields();
    }
  }, [view]);

  const onPlatformLogin = async (values) => {
    setAccederStep('loading'); setPlatformError('');
    const result = await platformLogin(values.email, values.password);
    if (!result.success) {
      setPlatformError(result.message || 'Credenciales incorrectas');
      setAccederStep('form'); return;
    }
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
        if (data.subdominio) {
          const msg = Array.isArray(data.subdominio) ? data.subdominio[0] : data.subdominio;
          setSlugError(msg); setRegistroError('El identificador ya esta en uso.');
        } else setRegistroError(data.error || 'Error en el registro.');
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

  const neonCyan = '#00d2ff', darkBg = '#0a0e14', cardBg = '#111822';
  const neonGlow = '0 0 10px rgba(0,210,255,0.5)', neonTextGlow = '0 0 8px rgba(0,210,255,0.8)';

  const NavTab = ({ label, route, active }) => (
    <div onClick={() => navigate(route)} style={{
        alignSelf: 'stretch', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '0 20px', cursor: 'pointer',
        borderBottom: active ? '3px solid ' + neonCyan : '3px solid transparent',
        borderTop: '3px solid transparent',
        background: active ? 'rgba(0,210,255,0.07)' : 'transparent',
        transition: 'background 0.2s, border-color 0.2s',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background='rgba(0,210,255,0.05)'; e.currentTarget.style.borderBottomColor='rgba(0,210,255,0.4)'; }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderBottomColor='transparent'; }}}
    >
      <span style={{ color: active ? neonCyan : '#c9d1d9', fontWeight: 600, fontSize: '14px',
        letterSpacing: '0.6px', textShadow: active ? '0 0 8px rgba(0,210,255,0.6)' : 'none',
        transition: 'color 0.2s', userSelect: 'none' }}>{label}</span>
    </div>
  );

  return (
    <div style={{ backgroundColor: darkBg, minHeight: '100vh', color: '#fff',
      fontFamily: 'Inter, sans-serif',
      backgroundImage: 'linear-gradient(rgba(0,210,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,210,255,0.05) 1px, transparent 1px)',
      backgroundSize: '40px 40px', display: 'flex', flexDirection: 'column' }}>

      <header style={{ padding: '0 40px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'stretch', minHeight: '56px',
        background: 'rgba(10,14,20,0.88)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid ' + neonCyan,
        boxShadow: '0 2px 12px rgba(0,210,255,0.2)',
        position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'stretch', gap: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', paddingRight: '24px' }}
            onClick={() => navigate('/planes')}>
            <NegocIALogo width={30} height={30} />
            <Title level={3} style={{ margin: 0, fontWeight: 800, lineHeight: 1 }}>
              <span style={{ color: '#fff' }}>Negoc</span><span style={{ color: neonCyan, textShadow: neonTextGlow }}>IA</span>
            </Title>
          </div>
          <NavTab label='Planes'  route='/planes'  active={view === 'planes'} />
          <NavTab label='Acceder' route='/acceder' active={view === 'acceder'} />
        </div>
        <div style={{ alignSelf: 'center' }}>
          <Button icon={<RocketOutlined />} onClick={() => navigate('/registro/1')}
            style={{ background: view==='registro'?neonCyan:'transparent', color: view==='registro'?darkBg:neonCyan,
              borderColor: neonCyan, fontWeight: 700, boxShadow: neonGlow, fontSize: '13px' }}>
            Registrar Negocio
          </Button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '60px 20px', flex: 1 }}>

        {view === 'planes' && (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.8s' }}>
            <Title style={{ color: '#fff', fontSize: '3.2rem', marginBottom: '15px' }}>Crece sin limites de personal</Title>
            <Paragraph style={{ color: '#a0c0e0', fontSize: '1.15rem', maxWidth: '680px', margin: '0 auto 60px', lineHeight: '1.7' }}>
              Pensamos en el emprendedor. Una plataforma que no te castiga por crecer: afilia a tantas cuentas de vendedores como necesites.
            </Paragraph>
            <Row gutter={[40, 40]} justify='center'>
              <Col xs={24} md={10}>
                <Card hoverable style={{ background: cardBg, border: '1px solid rgba(0,210,255,0.3)', borderRadius: '12px', transition: 'all 0.3s' }}
                  bodyStyle={{ padding: '40px' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow=neonGlow}
                  onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                  <RocketOutlined style={{ fontSize: '44px', color: neonCyan, marginBottom: '18px', filter: 'drop-shadow(0 0 8px ' + neonCyan + ')' }} />
                  <Title level={2} style={{ color: '#fff' }}>Emprendedor</Title>
                  <Title level={1} style={{ color: neonCyan, margin: '12px 0 30px', textShadow: neonTextGlow }}>
                    {currency === 'PEN' ? 'S/ 39' : '$ 12'}<span style={{ fontSize: '1rem', color: '#8b949e', textShadow: 'none' }}> / mes</span>
                  </Title>
                  <div style={{ textAlign: 'left', marginBottom: '36px', fontSize: '15px', color: '#e6edf3' }}>
                    <p style={{ marginBottom: '12px' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: '8px' }} />Inventario y Ventas Completo</p>
                    <p style={{ marginBottom: '12px', fontWeight: 'bold' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: '8px' }} /><span style={{ color: neonCyan }}>Vendedores Ilimitados</span></p>
                    <p style={{ marginBottom: '12px' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: '8px' }} />Multiples Cajas y Movimientos</p>
                    <p style={{ marginBottom: '12px' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: '8px' }} />Dominio privado (ej. mitienda.negociav2.app)</p>
                  </div>
                  <Button type='primary' size='large' block
                    style={{ height: '48px', background: 'transparent', borderColor: neonCyan, color: neonCyan, fontWeight: 'bold', boxShadow: neonGlow }}
                    onClick={() => navigate('/registro/1')}>Elegir Plan Emprendedor</Button>
                </Card>
              </Col>
              <Col xs={24} md={10}>
                <Card hoverable style={{ background: cardBg, border: '2px solid ' + neonCyan, borderRadius: '12px', position: 'relative', boxShadow: neonGlow }}
                  bodyStyle={{ padding: '40px' }}>
                  <div style={{ position: 'absolute', top: '-14px', right: '28px', background: darkBg, color: neonCyan,
                    border: '1px solid ' + neonCyan, boxShadow: neonGlow, padding: '4px 18px', borderRadius: '20px',
                    fontWeight: 'bold', textShadow: neonTextGlow, fontSize: '12px' }}>CORPORATIVO</div>
                  <TrophyOutlined style={{ fontSize: '44px', color: neonCyan, marginBottom: '18px', filter: 'drop-shadow(0 0 8px ' + neonCyan + ')' }} />
                  <Title level={2} style={{ color: '#fff' }}>Empresario</Title>
                  <Title level={1} style={{ margin: '12px 0 30px', textShadow: neonTextGlow }}>A <span style={{ color: neonCyan }}>Medida</span></Title>
                  <div style={{ textAlign: 'left', marginBottom: '36px', fontSize: '15px', color: '#e6edf3' }}>
                    <p style={{ marginBottom: '12px' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: '8px' }} />Todo lo del plan emprendedor</p>
                    <p style={{ marginBottom: '12px' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: '8px' }} />Jerarquias, Roles y Permisos</p>
                    <p style={{ marginBottom: '12px' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: '8px' }} />Escalado masivo y APIs dedicadas</p>
                  </div>
                  <Button type='primary' size='large' block
                    style={{ height: '48px', background: neonCyan, color: darkBg, fontWeight: 'bold', boxShadow: neonGlow, border: 'none' }}
                    onClick={() => message.info('Contacte a pizzia.peru@gmail.com para cotizacion')}>Solicitar Cotizacion Exacta</Button>
                </Card>
              </Col>
            </Row>
            <div style={{ marginTop: '80px', padding: '44px 40px',
              background: 'linear-gradient(135deg, rgba(0,162,255,0.07), rgba(0,210,255,0.03))',
              border: '1px solid rgba(0,210,255,0.22)', borderRadius: '16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <Title level={3} style={{ color: '#fff', margin: 0 }}>Tienes dudas? <span style={{ color: neonCyan }}>Escribenos</span></Title>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <a href='mailto:pizzia.peru@gmail.com' style={{ textDecoration: 'none' }}>
                  <Button size='large' icon={<MailOutlined />} style={{ background: neonCyan, color: darkBg, border: 'none', fontWeight: 'bold', boxShadow: neonGlow, height: '48px', paddingInline: '28px' }}>pizzia.peru@gmail.com</Button>
                </a>
                <a href='tel:+51948413244' style={{ textDecoration: 'none' }}>
                  <Button size='large' icon={<PhoneOutlined />} style={{ background: 'transparent', color: neonCyan, borderColor: neonCyan, fontWeight: 'bold', boxShadow: neonGlow, height: '48px', paddingInline: '28px' }}>+51 948 413 244</Button>
                </a>
              </div>
            </div>
          </div>
        )}

        {view === 'acceder' && (
          <div style={{ animation: 'fadeIn 0.5s' }}>

            {accederStep === 'form' && (
              <div style={{ maxWidth: '440px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 64, height: 64, borderRadius: 16,
                    background: 'linear-gradient(135deg, ' + neonCyan + ', #0088cc)',
                    marginBottom: 18, boxShadow: '0 4px 24px rgba(0,210,255,0.5)' }}>
                    <LoginOutlined style={{ fontSize: 30, color: '#000' }} />
                  </div>
                  <Title level={2} style={{ color: '#fff', margin: 0 }}>Accede a tus negocios</Title>
                  <Text style={{ color: '#8b949e', fontSize: 14 }}>Inicia sesion para ver todos los negocios que administras</Text>
                </div>
                <Card style={{ background: cardBg, border: '1px solid ' + neonCyan, borderRadius: 14, boxShadow: neonGlow }}>
                  <Form form={accederForm} layout='vertical' onFinish={onPlatformLogin} size='large'>
                    <Form.Item name='email' label={<span style={{ color: '#fff' }}>Correo electronico</span>}
                      rules={[{ required: true, message: 'Ingresa tu correo' }, { type: 'email' }]}>
                      <Input prefix={<MailOutlined style={{ color: neonCyan }} />} placeholder='tu@correo.com' type='email'
                        style={{ background: darkBg, borderColor: 'rgba(0,210,255,0.3)', color: '#fff' }} />
                    </Form.Item>
                    <Form.Item name='password' label={<span style={{ color: '#fff' }}>Contrasena</span>}
                      rules={[{ required: true, message: 'Ingresa tu contrasena' }]}>
                      <Input.Password prefix={<LockOutlined style={{ color: neonCyan }} />} placeholder='........'
                        style={{ background: darkBg, borderColor: 'rgba(0,210,255,0.3)', color: '#fff' }} />
                    </Form.Item>
                    {platformError && (
                      <div style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.4)',
                        borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#ff6b6b', fontSize: 13 }}>
                        {platformError}
                      </div>
                    )}
                    <Button type='primary' htmlType='submit' block style={{
                      height: 48, background: 'linear-gradient(135deg, ' + neonCyan + ', #0088cc)',
                      color: '#000', border: 'none', fontWeight: 800, fontSize: 15,
                      boxShadow: neonGlow, borderRadius: 10 }}>Entrar</Button>
                  </Form>
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Text style={{ color: '#8b949e', fontSize: 13 }}>No tienes negocio? </Text>
                    <Button type='link' onClick={() => navigate('/registro/1')} style={{ color: neonCyan, padding: '0 4px', fontSize: 13 }}>Crear uno</Button>
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
              <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <Title level={2} style={{ color: '#fff', margin: 0 }}>Tus <span style={{ color: neonCyan }}>Negocios</span></Title>
                  <Text style={{ color: '#8b949e', fontSize: 14 }}>Haz clic en el negocio al que quieres acceder</Text>
                </div>
                <Row gutter={[24, 24]} justify='center'>
                  {misNegocios.map((neg, i) => (
                    <Col xs={24} sm={12} md={8} key={i}>
                      <Card hoverable
                        style={{ background: cardBg, border: '1px solid rgba(0,210,255,0.3)', borderRadius: 14,
                          textAlign: 'center', cursor: 'pointer', transition: 'all 0.25s' }}
                        bodyStyle={{ padding: '32px 24px' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor=neonCyan; e.currentTarget.style.boxShadow=neonGlow; e.currentTarget.style.transform='translateY(-4px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(0,210,255,0.3)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}>
                        <div style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
                          background: 'linear-gradient(135deg, rgba(0,210,255,0.2), rgba(0,136,204,0.15))',
                          border: '1px solid rgba(0,210,255,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShopOutlined style={{ fontSize: 26, color: neonCyan }} />
                        </div>
                        <Title level={4} style={{ color: '#fff', margin: '0 0 4px' }}>{neg.nombre}</Title>
                        <Text style={{ color: '#8b949e', fontSize: 12, display: 'block', marginBottom: 20 }}>{neg.rol}</Text>
                        <Button type='primary' block loading={accederLoadingId === neg.schema}
                          onClick={() => onAccessTenant(neg.schema)}
                          icon={<ArrowRightOutlined />}
                          style={{ background: 'linear-gradient(135deg, ' + neonCyan + ', #0088cc)',
                            border: 'none', color: '#000', fontWeight: 700, height: 40, borderRadius: 8 }}>Acceder</Button>
                      </Card>
                    </Col>
                  ))}
                </Row>
                <div style={{ textAlign: 'center', marginTop: 32 }}>
                  <Button type='link' onClick={() => { setAccederStep('form'); accederForm.resetFields(); }}
                    style={{ color: '#8b949e', fontSize: 13 }}>Usar otro correo</Button>
                  <span style={{ color: '#374151', margin: '0 12px' }}>Â·</span>
                  <Button type='link' onClick={() => navigate('/registro/1')} style={{ color: neonCyan, fontSize: 13 }}>+ Crear otro negocio</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'registro' && (
          <div style={{ maxWidth: '460px', margin: '0 auto', animation: 'fadeIn 0.5s' }}>
            <Title level={2} style={{ color: '#fff', textAlign: 'center', marginBottom: '28px' }}>Crear Espacio de Trabajo</Title>
            <Card style={{ background: cardBg, border: '1px solid ' + neonCyan, borderRadius: '12px', boxShadow: neonGlow }}>
              <Form layout='vertical' form={registroForm} onFinish={onFinishRegistro} validateTrigger={['onChange','onBlur']}>

                <Form.Item label={<span style={{ color: '#fff', fontWeight: 500 }}>Nombre del Negocio</span>}
                  name='empresa' rules={[{ required: true, message: 'El nombre es requerido' }]}>
                  <Input size='large' placeholder='Ej: Bodega El Sol' onChange={onNombreEmpresaChange}
                    style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)' }} />
                </Form.Item>

                <Form.Item label={<span style={{ color: '#fff', fontWeight: 500 }}>Correo Gerencia</span>}
                  name='email' rules={[{ required: true, message: 'El correo es requerido' }, { type: 'email', message: 'Correo invalido' }]}>
                  <Input size='large' placeholder='gerente@empresa.com'
                    style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)' }} />
                </Form.Item>

                <Form.Item label={<span style={{ color: '#fff', fontWeight: 500 }}>Identificador de URL</span>}
                  name='subdominio'
                  rules={[{ required: true, message: 'Requerido' }, { pattern: /^[a-z0-9-]+$/, message: 'Solo minusculas, numeros y guiones' }]}
                  extra={<span style={{ color: 'rgba(0,210,255,0.55)', fontSize: 12 }}>Tu URL: <strong style={{ color: neonCyan }}>negociav2.vercel.app/t/{slugPreview||'mi-empresa'}/login</strong></span>}>
                  <Input size='large' placeholder='mi-empresa'
                    prefix={<span style={{ color: 'rgba(0,210,255,0.4)', fontSize: 12 }}>/t/</span>}
                    suffix={<span style={{ color: 'rgba(0,210,255,0.4)', fontSize: 11 }}>/login</span>}
                    style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)' }}
                    onChange={e => { const c=e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''); registroForm.setFieldValue('subdominio',c); setSlugPreview(c); }} />
                </Form.Item>

                <Form.Item label={<span style={{ color: '#fff', fontWeight: 500 }}>Contrasena Segura</span>}
                  name='password' rules={[{ required: true, message: 'La contrasena es requerida' }, { min: 8, message: 'Minimo 8 caracteres' }]}>
                  <Input.Password size='large' placeholder='Minimo 8 caracteres'
                    style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)' }} />
                </Form.Item>

                <Form.Item label={<span style={{ color: '#fff', fontWeight: 500 }}>Confirmar Contrasena</span>}
                  name='confirmar_password' dependencies={['password']}
                  rules={[{ required: true, message: 'Confirma tu contrasena' },
                    ({ getFieldValue }) => ({ validator(_, value) {
                      if (!value || getFieldValue('password') === value) return Promise.resolve();
                      return Promise.reject(new Error('Las contrasenas no coinciden'));
                    }}),
                  ]}>
                  <Input.Password size='large' placeholder='Repite la contrasena'
                    style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)' }} />
                </Form.Item>

                <Form.Item label={<span style={{ color: '#fff', fontWeight: 500 }}>RUC (Opcional)</span>} name='ruc'>
                  <Input size='large' placeholder='20123456789' style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)' }} />
                </Form.Item>

                <Form.Item name='logo' label={<span style={{ color: '#fff', fontWeight: 500 }}>Logotipo (Opcional)</span>}
                  valuePropName='fileList' getValueFromEvent={normFile}>
                  <Upload beforeUpload={() => false} maxCount={1} accept='image/*'>
                    <Button icon={<UploadOutlined />} style={{ background: 'transparent', color: neonCyan, borderColor: neonCyan }}>Seleccionar imagen</Button>
                  </Upload>
                </Form.Item>

                {registroError && (<div style={{ background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.5)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#ff6b6b', fontSize: 13 }}>{registroError}</div>)}
                {slugError && (<div style={{ background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.4)', borderRadius: 8, padding: '8px 14px', marginBottom: 8, color: '#ffa500', fontSize: 12 }}>Prueba: <strong>{watchedValues?.subdominio}-2</strong></div>)}

                <Button type='primary' size='large' block htmlType='submit' loading={loading} disabled={!isFormComplete}
                  style={{ marginTop: '12px', height: '52px', border: 'none', fontWeight: 800, fontSize: '15px', letterSpacing: '1px',
                    background: isFormComplete?'linear-gradient(135deg,' + neonCyan + ',#0088cc)':'rgba(0,210,255,0.15)',
                    color: isFormComplete?darkBg:'rgba(0,210,255,0.4)', boxShadow: isFormComplete?neonGlow:'none' }}>
                  {loading ? 'Procesando...' : isFormComplete ? 'REGISTRAR MI NEGOCIO' : 'Completa todos los campos'}
                </Button>
                <Button type='link' block onClick={() => navigate('/planes')} style={{ marginTop: '10px', color: '#a0c0e0' }}>Volver a los planes</Button>
              </Form>
            </Card>
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1px solid rgba(0,210,255,0.14)', background: 'rgba(4,7,13,0.97)',
        padding: '20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
          <span>Producto desarrollado por</span>
          <a href='https://pizzia.org' target='_blank' rel='noopener noreferrer' style={{ color: neonCyan, fontWeight: 700, textDecoration: 'none' }}>PizzIA</a>
          <span>Â·</span>
          <a href='https://pizzia.org' target='_blank' rel='noopener noreferrer' style={{ color: '#6b7280', textDecoration: 'underline' }}>pizzia.org</a>
        </div>
        <div style={{ fontSize: '12px', color: '#374151' }}>Â© {new Date().getFullYear()} PizzIA - Todos los Derechos Reservados</div>
      </footer>

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } } .ant-input::placeholder { color: rgba(0,210,255,0.3) !important; } .ant-input-password input::placeholder { color: rgba(0,210,255,0.3) !important; }`}</style>
    </div>
  );
}