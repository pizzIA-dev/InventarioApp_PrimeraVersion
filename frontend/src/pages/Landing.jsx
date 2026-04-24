import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Col, Row, Typography, Input, Form, message, Upload } from 'antd';
import { RocketOutlined, TrophyOutlined, CheckCircleOutlined, MailOutlined, PhoneOutlined, UploadOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import PizzIALogo from '../components/PizzIALogo';

const { Title, Paragraph } = Typography;

const normFile = (e) => {
  if (Array.isArray(e)) return e;
  return e?.fileList;
};

export default function Landing({ view }) {
  const [loading, setLoading]         = useState(false);
  const [currency, setCurrency]       = useState('PEN');
  const [showNegocio, setShowNegocio] = useState(false);
  const [subInput, setSubInput]       = useState('');
  const [negocios, setNegocios]       = useState(null); // null=sin buscar, []= resultado
  const popoverRef                    = useRef(null);
  const { planId }                    = useParams();
  const navigate                      = useNavigate();

  useEffect(() => {
    fetch('https://get.geojs.io/v1/ip/country.json')
      .then(res => res.json())
      .then(data => setCurrency(data.country === 'PE' ? 'PEN' : 'USD'))
      .catch(() => setCurrency('PEN'));
  }, []);

  // Cerrar popover al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowNegocio(false);
        setNegocios(null);
        setSubInput('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const goToNegocio = async () => {
    if (!subInput.trim()) return;
    setLoading(true);
    setNegocios(null);
    try {
      // Puerto dinámico — funciona aunque Vite use 5173, 5174, 5175, etc.
      const frontendPort = window.location.port || '5175';
      const API_BASE = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE}/api/public/buscar-tenant/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin,   // enviar origin para que el backend lo lea
        },
        body: JSON.stringify({ email: subInput.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok && data.found) {
        // Reemplazar el puerto en los login_url con el puerto real del frontend
        const negociosConPuerto = data.negocios.map(n => ({
          ...n,
          login_url: n.login_url.replace(/:5175|:5173|:5174/, `:${frontendPort}`),
        }));
        if (negociosConPuerto.length === 1) {
          message.success(`Redirigiendo a ${negociosConPuerto[0].nombre}...`);
          setTimeout(() => { window.location.href = negociosConPuerto[0].login_url; }, 600);
        } else {
          setNegocios(negociosConPuerto);
        }
      } else {
        message.error(data.error || 'No encontramos ningún negocio con ese correo.');
      }
    } catch {
      message.error('Error de conexión al buscar el negocio.');
    }
    setLoading(false);
  };

  const resetPopover = () => {
    setNegocios(null);
    setSubInput('');
  };

  const neonCyan     = '#00d2ff';
  const darkBg       = '#0a0e14';
  const cardBg       = '#111822';
  const neonGlow     = '0 0 10px rgba(0,210,255,0.5)';
  const neonTextGlow = '0 0 8px rgba(0,210,255,0.8)';

  /* ── Registro ── */
  const onFinishRegistro = async (values) => {
    setLoading(true);
    try {
      // VITE_PUBLIC_API_URL en .env de producción: 'https://api.tudominio.com'
      // En desarrollo: usa localhost:8000 automáticamente
      const API_BASE = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('nombre_empresa', values.empresa);
      formData.append('subdominio',     values.subdominio);
      formData.append('email_admin',    values.email);
      formData.append('password_admin', values.password);
      formData.append('plan_id',        planId);
      if (values.ruc) formData.append('ruc', values.ruc);
      if (values.logo?.length > 0) formData.append('logo', values.logo[0].originFileObj);
      const response = await fetch(`${API_BASE}/api/public/registro/`, {
        method: 'POST', body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        message.success(data.mensaje);
        setTimeout(() => { window.location.href = data.login_url; }, 1500);
      } else {
        message.error('Error en registro: ' + JSON.stringify(data));
      }
    } catch {
      message.error('Error de conexión');
    }
    setLoading(false);
  };

  return (
    <div style={{
      backgroundColor: darkBg, minHeight: '100vh', color: '#fff',
      fontFamily: 'Inter, sans-serif',
      backgroundImage: `linear-gradient(rgba(0,210,255,0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,210,255,0.05) 1px, transparent 1px)`,
      backgroundSize: '40px 40px',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ══════════════════════════════════════
          HEADER
      ══════════════════════════════════════ */}
      <header style={{
        padding: '0 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'stretch',
        minHeight: '56px',
        background: 'rgba(10,14,20,0.88)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${neonCyan}`,
        boxShadow: '0 2px 12px rgba(0,210,255,0.2)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* ── IZQUIERDA: Logo + nav links ── */}
        <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'stretch', gap: '0' }}>
          {/* Logo */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', paddingRight: '24px' }}
            onClick={() => navigate('/planes')}
          >
            <PizzIALogo width={30} height={30} />
            <Title level={3} style={{ margin: 0, fontWeight: 800, lineHeight: 1 }}>
              <span style={{ color: '#fff' }}>Negoc</span><span style={{ color: neonCyan, textShadow: neonTextGlow }}>IA</span>
            </Title>
          </div>

          {/* ── "Planes" como tab full-height ── */}
          <div
            onClick={() => navigate('/planes')}
            style={{
              // Bloque que estira hasta el borde superior e inferior del header
              alignSelf: 'stretch',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 20px',
              cursor: 'pointer',
              position: 'relative',
              // Borde inferior activo (indicador de sección actual)
              borderBottom: view === 'planes'
                ? `3px solid ${neonCyan}`
                : '3px solid transparent',
              // Borde superior complementario para que se vea como tab
              borderTop: view === 'planes'
                ? '3px solid transparent'
                : '3px solid transparent',
              // Fondo sutil cuando está activo
              background: view === 'planes'
                ? 'rgba(0,210,255,0.07)'
                : 'transparent',
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => {
              if (view !== 'planes') {
                e.currentTarget.style.background = 'rgba(0,210,255,0.05)';
                e.currentTarget.style.borderBottomColor = 'rgba(0,210,255,0.4)';
              }
            }}
            onMouseLeave={e => {
              if (view !== 'planes') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderBottomColor = 'transparent';
              }
            }}
          >
            <span style={{
              color: view === 'planes' ? neonCyan : '#c9d1d9',
              fontWeight: 600,
              fontSize: '14px',
              letterSpacing: '0.6px',
              textShadow: view === 'planes' ? `0 0 8px rgba(0,210,255,0.6)` : 'none',
              transition: 'color 0.2s, text-shadow 0.2s',
              userSelect: 'none',
            }}>
              Planes
            </span>
          </div>

        </div>

        {/* ── DERECHA: Ir a mi Negocio con popover de email ── */}
        <div ref={popoverRef} style={{ position: 'relative', alignSelf: 'center' }}>
          <Button
            icon={<ArrowRightOutlined />}
            onClick={() => setShowNegocio(v => !v)}
            style={{
              background: neonCyan, color: darkBg, border: 'none',
              fontWeight: 700, boxShadow: neonGlow, fontSize: '13px',
            }}
          >
            Ir a mi Negocio
          </Button>

          {showNegocio && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              background: '#0d1520', border: `1px solid ${neonCyan}`,
              borderRadius: '10px', padding: '18px', width: '300px',
              boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(0,210,255,0.15)`,
              zIndex: 200,
            }}>

              {/* ── Estado A: formulario de email ── */}
              {!negocios && (
                <>
                  <p style={{ color: neonCyan, fontWeight: 700, fontSize: '13px', margin: '0 0 4px' }}>
                    Ir a mi Negocio
                  </p>
                  <p style={{ color: '#8b949e', fontSize: '12px', margin: '0 0 12px', lineHeight: '1.5' }}>
                    Ingresa el correo con el que te registraste y te llevamos directo.
                  </p>
                  <Input
                    placeholder="gerente@miempresa.com"
                    type="email"
                    value={subInput}
                    onChange={e => setSubInput(e.target.value)}
                    onPressEnter={goToNegocio}
                    style={{ background: '#050a12', borderColor: 'rgba(0,210,255,0.3)', color: '#fff' }}
                    autoFocus
                  />
                  <Button
                    block type="primary" onClick={goToNegocio}
                    loading={loading}
                    style={{ marginTop: '10px', background: neonCyan, color: darkBg, border: 'none', fontWeight: 700 }}
                  >
                    Buscar mis negocios →
                  </Button>
                </>
              )}

              {/* ── Estado B: lista de negocios encontrados ── */}
              {negocios && negocios.length > 0 && (
                <>
                  <p style={{ color: neonCyan, fontWeight: 700, fontSize: '13px', margin: '0 0 4px' }}>
                    Tus negocios
                  </p>
                  <p style={{ color: '#8b949e', fontSize: '12px', margin: '0 0 12px' }}>
                    Elige a cuál quieres ingresar:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                    {negocios.map((n, i) => (
                      <button
                        key={i}
                        onClick={() => { window.location.href = n.login_url; }}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                          background: 'rgba(0,210,255,0.06)',
                          border: '1px solid rgba(0,210,255,0.2)',
                          borderRadius: '8px', padding: '10px 14px',
                          cursor: 'pointer', width: '100%', textAlign: 'left',
                          transition: 'background 0.2s, border-color 0.2s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(0,210,255,0.13)';
                          e.currentTarget.style.borderColor = neonCyan;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(0,210,255,0.06)';
                          e.currentTarget.style.borderColor = 'rgba(0,210,255,0.2)';
                        }}
                      >
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>
                          {n.nombre}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{
                            background: 'rgba(0,210,255,0.15)', color: neonCyan,
                            fontSize: '10px', fontWeight: 700, padding: '1px 8px',
                            borderRadius: '20px', letterSpacing: '0.5px',
                          }}>
                            {n.rol || n.subdominio}
                          </span>
                          <span style={{ color: '#4b5563', fontSize: '11px' }}>
                            {n.subdominio}.negoc.ia
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={resetPopover}
                    style={{
                      marginTop: '12px', background: 'none', border: 'none',
                      color: '#6b7280', fontSize: '12px', cursor: 'pointer', padding: 0,
                    }}
                  >
                    ← Buscar con otro correo
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </header>


      {/* ══════════════════════════════════════
          MAIN
      ══════════════════════════════════════ */}
      <main style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '60px 20px', flex: 1 }}>

        {/* ── PLANES ── */}
        {view === 'planes' && (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.8s' }}>
            <Title style={{ color: '#fff', fontSize: '3.2rem', marginBottom: '15px' }}>
              Crece sin límites de personal
            </Title>
            <Paragraph style={{ color: '#a0c0e0', fontSize: '1.15rem', maxWidth: '680px', margin: '0 auto 60px', lineHeight: '1.7' }}>
              Pensamos en el emprendedor. Una plataforma que no te castiga por crecer: afilia a tantas
              cuentas de vendedores como necesites sin cambiar tu tarifa principal.
            </Paragraph>

            <Row gutter={[40, 40]} justify="center">
              {/* Plan Emprendedor */}
              <Col xs={24} md={10}>
                <Card
                  hoverable
                  style={{ background: cardBg, border: '1px solid rgba(0,210,255,0.3)', borderRadius: '12px', transition: 'all 0.3s' }}
                  bodyStyle={{ padding: '40px' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = neonGlow}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  <RocketOutlined style={{ fontSize: '44px', color: neonCyan, marginBottom: '18px', filter: `drop-shadow(0 0 8px ${neonCyan})` }} />
                  <Title level={2} style={{ color: '#fff' }}>Emprendedor</Title>
                  <Title level={1} style={{ color: neonCyan, margin: '12px 0 30px', textShadow: neonTextGlow }}>
                    {currency === 'PEN' ? 'S/ 39' : '$ 12'}
                    <span style={{ fontSize: '1rem', color: '#8b949e', textShadow: 'none' }}> / mes</span>
                  </Title>
                  <div style={{ textAlign: 'left', marginBottom: '36px', fontSize: '15px', color: '#e6edf3' }}>
                    <p style={{ marginBottom: '12px' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: '8px' }} />Inventario y Ventas Completo</p>
                    <p style={{ marginBottom: '12px', fontWeight: 'bold' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: '8px' }} /><span style={{ color: neonCyan }}>Vendedores Ilimitados</span></p>
                    <p style={{ marginBottom: '12px' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: '8px' }} />Múltiples Cajas y Movimientos</p>
                    <p style={{ marginBottom: '12px' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: '8px' }} />Dominio privado (ej. mitienda.negocia.dev)</p>
                  </div>
                  <Button type="primary" size="large" block
                    style={{ height: '48px', background: 'transparent', borderColor: neonCyan, color: neonCyan, fontWeight: 'bold', boxShadow: neonGlow }}
                    onClick={() => navigate('/registro/1')}>
                    Elegir Plan Emprendedor
                  </Button>
                </Card>
              </Col>

              {/* Plan Empresario */}
              <Col xs={24} md={10}>
                <Card
                  hoverable
                  style={{ background: cardBg, border: `2px solid ${neonCyan}`, borderRadius: '12px', position: 'relative', boxShadow: neonGlow }}
                  bodyStyle={{ padding: '40px' }}
                >
                  <div style={{
                    position: 'absolute', top: '-14px', right: '28px',
                    background: darkBg, color: neonCyan, border: `1px solid ${neonCyan}`,
                    boxShadow: neonGlow, padding: '4px 18px', borderRadius: '20px',
                    fontWeight: 'bold', textShadow: neonTextGlow, fontSize: '12px',
                  }}>CORPORATIVO</div>

                  <TrophyOutlined style={{ fontSize: '44px', color: neonCyan, marginBottom: '18px', filter: `drop-shadow(0 0 8px ${neonCyan})` }} />
                  <Title level={2} style={{ color: '#fff' }}>Empresario</Title>
                  <Title level={1} style={{ margin: '12px 0 30px', textShadow: neonTextGlow }}>
                    A <span style={{ color: neonCyan }}>Medida</span>
                  </Title>
                  <div style={{ textAlign: 'left', marginBottom: '36px', fontSize: '15px', color: '#e6edf3' }}>
                    <p style={{ marginBottom: '12px' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: '8px' }} />Todo lo del plan emprendedor</p>
                    <p style={{ marginBottom: '12px' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: '8px' }} />Jerarquías, Roles y Permisos estrictos</p>
                    <p style={{ marginBottom: '12px' }}><CheckCircleOutlined style={{ color: neonCyan, marginRight: '8px' }} />Escalado masivo y APIs dedicadas</p>
                    <p style={{ marginBottom: '12px' }}><CheckCircleOutlined style={{ color: '#8b949e', marginRight: '8px' }} /><i>Estructura de cobro variable (cotización)</i></p>
                  </div>
                  <Button type="primary" size="large" block
                    style={{ height: '48px', background: neonCyan, color: darkBg, fontWeight: 'bold', boxShadow: neonGlow, border: 'none' }}
                    onClick={() => message.info('Contacte a corporativo@negocia.dev para recibir su cotización personalizada')}>
                    Solicitar Cotización Exacta
                  </Button>
                </Card>
              </Col>
            </Row>

            {/* ── SECCIÓN CONTACTO ── */}
            <div style={{
              marginTop: '80px', padding: '44px 40px',
              background: 'linear-gradient(135deg, rgba(0,162,255,0.07), rgba(0,210,255,0.03))',
              border: '1px solid rgba(0,210,255,0.22)', borderRadius: '16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
            }}>
              <Title level={3} style={{ color: '#fff', margin: 0 }}>
                ¿Tienes dudas? <span style={{ color: neonCyan }}>Escríbenos</span>
              </Title>
              <Paragraph style={{ color: '#8b949e', margin: 0 }}>
                Estamos en Perú · Respondemos rápido por correo y teléfono.
              </Paragraph>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <a href="mailto:pizzia.peru@gmail.com" style={{ textDecoration: 'none' }}>
                  <Button size="large" icon={<MailOutlined />}
                    style={{ background: neonCyan, color: darkBg, border: 'none', fontWeight: 'bold', boxShadow: neonGlow, height: '48px', paddingInline: '28px' }}>
                    pizzia.peru@gmail.com
                  </Button>
                </a>
                <a href="tel:+51948413244" style={{ textDecoration: 'none' }}>
                  <Button size="large" icon={<PhoneOutlined />}
                    style={{ background: 'transparent', color: neonCyan, borderColor: neonCyan, fontWeight: 'bold', boxShadow: neonGlow, height: '48px', paddingInline: '28px' }}>
                    +51 948 413 244
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── REGISTRO ── */}
        {view === 'registro' && (
          <div style={{ maxWidth: '460px', margin: '0 auto', animation: 'fadeIn 0.5s' }}>
            <Title level={2} style={{ color: '#fff', textAlign: 'center', marginBottom: '28px' }}>
              Crear Espacio de Trabajo
            </Title>
            <Card style={{ background: cardBg, border: `1px solid ${neonCyan}`, borderRadius: '12px', boxShadow: neonGlow }}>
              <Form layout="vertical" onFinish={onFinishRegistro}>
                {[
                  { label: 'Nombre del Negocio', name: 'empresa', placeholder: 'Mi Empresa', required: true },
                  { label: 'Correo Gerencia',     name: 'email',   placeholder: 'gerente@empresa.com', required: true, type: 'email' },
                ].map(f => (
                  <Form.Item key={f.name} label={<span style={{ color: '#fff', fontWeight: 500 }}>{f.label}</span>}
                    name={f.name} rules={[{ required: f.required, type: f.type }]}>
                    <Input size="large" placeholder={f.placeholder} style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)' }} />
                  </Form.Item>
                ))}

                <Form.Item label={<span style={{ color: '#fff', fontWeight: 500 }}>Subdominio URL</span>} name="subdominio" rules={[{ required: true }]}>
                  <Input size="large" addonAfter={<span style={{ color: neonCyan }}>.negocia.dev</span>} placeholder="miempresa"
                    style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)' }} />
                </Form.Item>

                <Form.Item label={<span style={{ color: '#fff', fontWeight: 500 }}>Contraseña Segura</span>} name="password" rules={[{ required: true }]}>
                  <Input.Password size="large" style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)' }} />
                </Form.Item>

                <Form.Item label={<span style={{ color: '#fff', fontWeight: 500 }}>RUC (Opcional)</span>} name="ruc">
                  <Input size="large" placeholder="20123456789" style={{ background: darkBg, color: neonCyan, borderColor: 'rgba(0,210,255,0.3)' }} />
                </Form.Item>

                <Form.Item name="logo" label={<span style={{ color: '#fff', fontWeight: 500 }}>Logotipo (Opcional)</span>}
                  valuePropName="fileList" getValueFromEvent={normFile}>
                  <Upload beforeUpload={() => false} maxCount={1} accept="image/*">
                    <Button icon={<UploadOutlined />} style={{ background: 'transparent', color: neonCyan, borderColor: neonCyan }}>
                      Seleccionar imagen
                    </Button>
                  </Upload>
                </Form.Item>

                <Button type="primary" size="large" block htmlType="submit" loading={loading}
                  style={{ marginTop: '12px', background: neonCyan, color: darkBg, fontWeight: 'bold', boxShadow: neonGlow, border: 'none', height: '48px' }}>
                  CONFIRMAR Y ENTRAR
                </Button>
                <Button type="link" block onClick={() => navigate('/planes')} style={{ marginTop: '10px', color: '#a0c0e0' }}>
                  ← Volver a los planes
                </Button>
              </Form>
            </Card>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer style={{
        borderTop: '1px solid rgba(0,210,255,0.14)',
        background: 'rgba(4,7,13,0.97)',
        padding: '20px 40px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
          <span>Producto desarrollado por</span>
          <a href="https://pizzia.org" target="_blank" rel="noopener noreferrer"
            style={{ color: neonCyan, fontWeight: 700, textDecoration: 'none', textShadow: '0 0 6px rgba(0,210,255,0.5)' }}>
            PizzIA
          </a>
          <span>·</span>
          <a href="https://pizzia.org" target="_blank" rel="noopener noreferrer"
            style={{ color: '#6b7280', textDecoration: 'underline' }}>
            pizzia.org
          </a>
        </div>
        <div style={{ fontSize: '12px', color: '#374151' }}>
          © {new Date().getFullYear()} PizzIA — Todos los Derechos Reservados
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .ant-input::placeholder { color: rgba(0,210,255,0.3) !important; }
        .ant-input-password input::placeholder { color: rgba(0,210,255,0.3) !important; }
        .ant-input-group-addon { background:#0a0e14!important; border-color:rgba(0,210,255,0.3)!important; color:#00d2ff!important; }
      `}</style>
    </div>
  );
}
