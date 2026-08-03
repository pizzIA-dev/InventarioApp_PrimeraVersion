import { useState, useEffect, useContext } from 'react';
import { usuariosAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
  PlusOutlined,
  UserOutlined,
  LockOutlined,
  CheckCircleOutlined,
  StopOutlined,
  KeyOutlined,
  TeamOutlined, CloseOutlined, CopyOutlined } from '@ant-design/icons';

function GestionUsuarios() {
  const { isGerente } = useContext(AuthContext);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal crear usuario
  const [showCrear, setShowCrear] = useState(false);
  const [formCrear, setFormCrear] = useState({ username: '', password: '', email: '' });
  const [errCrear, setErrCrear] = useState('');
  const [savingCrear, setSavingCrear] = useState(false);

  // Modal cambiar contrase├▒a
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errPass, setErrPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    if (isGerente) fetchUsuarios();
  }, [isGerente]);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await usuariosAPI.listar();
      setUsuarios(res.data);
    } catch (err) {
      console.error('Error fetching usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    setErrCrear('');
    if (!formCrear.username.trim() || !formCrear.password.trim()) {
      setErrCrear('El usuario y la contrase├▒a son obligatorios.');
      return;
    }
    if (formCrear.password.length < 6) {
      setErrCrear('La contrase├▒a debe tener al menos 6 caracteres.');
      return;
    }
    setSavingCrear(true);
    try {
      await usuariosAPI.crear(formCrear);
      setShowCrear(false);
      setFormCrear({ username: '', password: '', email: '' });
      fetchUsuarios();
    } catch (err) {
      setErrCrear(err.response?.data?.error || 'Error al crear el usuario.');
    } finally {
      setSavingCrear(false);
    }
  };

  const handleToggle = async (usuario) => {
    const accion = usuario.is_active ? 'desactivar' : 'activar';
    if (!window.confirm(`┬┐Est├ís seguro de que deseas ${accion} a "${usuario.username}"?`)) return;
    try {
      await usuariosAPI.toggle(usuario.id);
      fetchUsuarios();
    } catch (err) {
      alert(err.response?.data?.error || `Error al ${accion} usuario.`);
    }
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    setErrPass('');
    if (newPassword.length < 6) {
      setErrPass('La contrase├▒a debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrPass('Las contrase├▒as no coinciden.');
      return;
    }
    setSavingPass(true);
    try {
      await usuariosAPI.cambiarPassword(selectedUser.id, { new_password: newPassword });
      setShowPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setSelectedUser(null);
      alert(`Contrase├▒a de "${selectedUser.username}" actualizada correctamente.`);
    } catch (err) {
      setErrPass(err.response?.data?.error || 'Error al cambiar contrase├▒a.');
    } finally {
      setSavingPass(false);
    }
  };

  if (!isGerente) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger-color)' }}>Acceso Denegado</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Solo el Gerente puede gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TeamOutlined /> Gesti├│n de Usuarios
          </h1>
          <p className="page-subtitle">Administra los accesos de los vendedores al sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCrear(true); setErrCrear(''); }}>
          <PlusOutlined /> Nuevo Vendedor
        </button>
      </div>

      <div style={{
        marginBottom: '24px',
        padding: '16px 20px',
        background: 'rgba(139, 92, 246, 0.08)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h3 style={{ margin: '0 0 4px', color: 'var(--text-color)', fontSize: '15px', fontWeight: 600 }}>
            C├│digo de acceso para tu equipo
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
            Tus colaboradores necesitan este c├│digo ├║nico del negocio para iniciar sesi├│n en sus cuentas.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'var(--bg-card)',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px dashed rgba(139, 92, 246, 0.5)',
            fontWeight: 'bold',
            fontSize: '16px',
            color: '#8b5cf6',
            letterSpacing: '1px'
          }}>
            {localStorage.getItem('tenant_codigo_acceso') || '---'}
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const code = localStorage.getItem('tenant_codigo_acceso');
              if (code) {
                navigator.clipboard.writeText(code);
                alert('C├│digo copiado al portapapeles');
              }
            }}
            title="Copiar c├│digo"
          >
            <CopyOutlined /> Copiar
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th><UserOutlined /> Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Fecha de Registro</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No hay vendedores registrados a├║n. Crea el primero con el bot├│n de arriba.
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.55 }}>
                    <td style={{ fontWeight: 600 }}>
                      <UserOutlined style={{ marginRight: '6px', color: 'var(--primary-color)' }} />
                      {u.username}
                    </td>
                    <td>{u.email || <span style={{ color: 'var(--text-muted)' }}>"ÔÇØ</span>}</td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '11px' }}>{u.rol}</span>
                    </td>
                    <td>{u.date_joined}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          title="Cambiar contrase├▒a"
                          onClick={() => { setSelectedUser(u); setNewPassword(''); setConfirmPassword(''); setErrPass(''); setShowPassword(true); }}
                        >
                          <KeyOutlined />
                        </button>
                        <button
                          className={`btn ${u.is_active ? 'btn-warning' : 'btn-success'}`}
                          title={u.is_active ? 'Desactivar usuario' : 'Reactivar usuario'}
                          onClick={() => handleToggle(u)}
                          style={{ color: 'white' }}
                        >
                          {u.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ├óÔÇØÔé¼├óÔÇØÔé¼├óÔÇØÔé¼├óÔÇØÔé¼ MODAL: Nuevo Vendedor ├óÔÇØÔé¼├óÔÇØÔé¼├óÔÇØÔé¼├óÔÇØÔé¼ */}
      {showCrear && (
        <div className="modal-overlay" onClick={() => setShowCrear(false)} style={{ zIndex: 1000 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="modal-title"><PlusOutlined /> Crear Nuevo Vendedor</h3>
              <button className="modal-close" onClick={() => setShowCrear(false)}><CloseOutlined /></button>
            </div>
            <form onSubmit={handleCrear}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">
                    <UserOutlined style={{ marginRight: '6px' }} />Nombre de Usuario *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ej: vendedor_juan"
                    value={formCrear.username}
                    onChange={(e) => setFormCrear(prev => ({ ...prev, username: e.target.value }))}
                    autoFocus
                    disabled={savingCrear}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <LockOutlined style={{ marginRight: '6px' }} />Contrase├▒a *
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="M├¡nimo 6 caracteres"
                    value={formCrear.password}
                    onChange={(e) => setFormCrear(prev => ({ ...prev, password: e.target.value }))}
                    disabled={savingCrear}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email (opcional)</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="correo@ejemplo.com"
                    value={formCrear.email}
                    onChange={(e) => setFormCrear(prev => ({ ...prev, email: e.target.value }))}
                    disabled={savingCrear}
                  />
                </div>
                {errCrear && (
                  <div style={{ background: 'rgba(255,77,79,0.12)', border: '1px solid #ff4d4f', borderRadius: '8px', padding: '10px 14px', color: '#ff4d4f', fontSize: '13px' }}>
                    {errCrear}
                  </div>
                )}
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  El nuevo usuario tendr├í acceso ├║nicamente a Ventas, Fiados, Clientes, Productos y Servicios.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCrear(false)} disabled={savingCrear}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={savingCrear}>
                  {savingCrear ? 'Creando...' : 'Crear Vendedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ├óÔÇØÔé¼├óÔÇØÔé¼├óÔÇØÔé¼├óÔÇØÔé¼ MODAL: Cambiar Contrase├▒a ├óÔÇØÔé¼├óÔÇØÔé¼├óÔÇØÔé¼├óÔÇØÔé¼ */}
      {showPassword && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPassword(false)} style={{ zIndex: 1000 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="modal-title"><KeyOutlined /> Cambiar Contrase├▒a</h3>
              <button className="modal-close" onClick={() => setShowPassword(false)}><CloseOutlined /></button>
            </div>
            <form onSubmit={handleCambiarPassword}>
              <div className="modal-body">
                <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                  Actualizando contrase├▒a para: <strong>{selectedUser.username}</strong>
                </p>
                <div className="form-group">
                  <label className="form-label">Nueva Contrase├▒a *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="M├¡nimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                    disabled={savingPass}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar Contrase├▒a *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Repite la contrase├▒a"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={savingPass}
                  />
                </div>
                {errPass && (
                  <div style={{ background: 'rgba(255,77,79,0.12)', border: '1px solid #ff4d4f', borderRadius: '8px', padding: '10px 14px', color: '#ff4d4f', fontSize: '13px' }}>
                    {errPass}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPassword(false)} disabled={savingPass}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={savingPass}>
                  {savingPass ? 'Guardando...' : 'Actualizar Contrase├▒a'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionUsuarios;

