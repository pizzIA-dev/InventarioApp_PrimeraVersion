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
  TeamOutlined,
} from '@ant-design/icons';

function GestionUsuarios() {
  const { isGerente } = useContext(AuthContext);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal crear usuario
  const [showCrear, setShowCrear] = useState(false);
  const [formCrear, setFormCrear] = useState({ username: '', password: '', email: '' });
  const [errCrear, setErrCrear] = useState('');
  const [savingCrear, setSavingCrear] = useState(false);

  // Modal cambiar contraseña
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
      setErrCrear('El usuario y la contraseña son obligatorios.');
      return;
    }
    if (formCrear.password.length < 6) {
      setErrCrear('La contraseña debe tener al menos 6 caracteres.');
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
    if (!window.confirm(`¿Estás seguro de que deseas ${accion} a "${usuario.username}"?`)) return;
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
      setErrPass('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrPass('Las contraseñas no coinciden.');
      return;
    }
    setSavingPass(true);
    try {
      await usuariosAPI.cambiarPassword(selectedUser.id, { new_password: newPassword });
      setShowPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setSelectedUser(null);
      alert(`Contraseña de "${selectedUser.username}" actualizada correctamente.`);
    } catch (err) {
      setErrPass(err.response?.data?.error || 'Error al cambiar contraseña.');
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
            <TeamOutlined /> Gestión de Usuarios
          </h1>
          <p className="page-subtitle">Administra los accesos de los vendedores al sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCrear(true); setErrCrear(''); }}>
          <PlusOutlined /> Nuevo Vendedor
        </button>
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
                    No hay vendedores registrados aún. Crea el primero con el botón de arriba.
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.55 }}>
                    <td style={{ fontWeight: 600 }}>
                      <UserOutlined style={{ marginRight: '6px', color: 'var(--primary-color)' }} />
                      {u.username}
                    </td>
                    <td>{u.email || <span style={{ color: 'var(--text-muted)' }}>"”</span>}</td>
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
                          title="Cambiar contraseña"
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

      {/* â”€â”€â”€â”€ MODAL: Nuevo Vendedor â”€â”€â”€â”€ */}
      {showCrear && (
        <div className="modal-overlay" onClick={() => setShowCrear(false)} style={{ zIndex: 1000 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="modal-title"><PlusOutlined /> Crear Nuevo Vendedor</h3>
              <button className="modal-close" onClick={() => setShowCrear(false)}>Ã—</button>
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
                    <LockOutlined style={{ marginRight: '6px' }} />Contraseña *
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Mínimo 6 caracteres"
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
                  El nuevo usuario tendrá acceso únicamente a Ventas, Fiados, Clientes, Productos y Servicios.
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

      {/* â”€â”€â”€â”€ MODAL: Cambiar Contraseña â”€â”€â”€â”€ */}
      {showPassword && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPassword(false)} style={{ zIndex: 1000 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="modal-title"><KeyOutlined /> Cambiar Contraseña</h3>
              <button className="modal-close" onClick={() => setShowPassword(false)}>Ã—</button>
            </div>
            <form onSubmit={handleCambiarPassword}>
              <div className="modal-body">
                <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                  Actualizando contraseña para: <strong>{selectedUser.username}</strong>
                </p>
                <div className="form-group">
                  <label className="form-label">Nueva Contraseña *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                    disabled={savingPass}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar Contraseña *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Repite la contraseña"
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
                  {savingPass ? 'Guardando...' : 'Actualizar Contraseña'}
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

