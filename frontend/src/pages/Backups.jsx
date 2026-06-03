import { useState, useEffect } from 'react';
import { backupsAPI } from '../services/api';
import { CloudServerOutlined, ReloadOutlined, SettingOutlined, WarningOutlined } from '@ant-design/icons';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingScreen from '../components/LoadingScreen';

function Backups() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [backups, setBackups] = useState([]);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [generando, setGenerando] = useState(false);

  const handleGenerar = async () => {
    if (!window.confirm('¿Generar un backup manual ahora?')) return;
    setGenerando(true);
    try {
      await backupsAPI.generar();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al generar el backup.');
    } finally {
      setGenerando(false);
    }
  };

  // Form State
  const [frecuencia, setFrecuencia] = useState('DIARIO');
  const [hora, setHora] = useState('03:00');
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const confRes = await backupsAPI.getConfig();
      setConfig(confRes.data);
      setFrecuencia(confRes.data.frecuencia);
      setHora(confRes.data.hora_ejecucion);
      setActivo(confRes.data.activo);

      const listRes = await backupsAPI.listar();
      setBackups(listRes.data);
    } catch (error) {
      console.error('Error fetching backups data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    try {
      await backupsAPI.saveConfig({ frecuencia, hora_ejecucion: hora, activo });
      alert('Configuración guardada exitosamente.');
      fetchData();
    } catch (error) {
      alert('Error al guardar configuración.');
    }
  };

  const handleRestoreClick = (id) => {
    setSelectedBackupId(id);
    setConfirmVisible(true);
  };

  const processRestore = async () => {
    try {
      setConfirmVisible(false);
      setRestoring(true);
      const res = await backupsAPI.restaurar({ backup_id: selectedBackupId });
      alert(res.data.message || 'restauración completada con éxito.');
      window.location.reload(); // Reload to refresh all application state
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || 'Error crítico al restaurar el backup.');
    } finally {
      setRestoring(false);
    }
  };

  if (loading) return <LoadingScreen message="Cargando configuración de respaldos..." />;

  return (
    <div>
      {restoring && <LoadingScreen message="âš️ RESTAURANDO BASE DE DATOS... NO CIERRE ESTA PÁGINA âš️" />}
      
      <ConfirmDialog
        visible={confirmVisible}
        title="âš️ ADVERTENCIA CRÍTICA: restauración de Backup"
        message="Estás a punto de restaurar la base de datos a un estado anterior. ¡ESTO BORRARÁ TODOS LOS DATOS ACTUALES DE TU EMPRESA DE FORMA IRREVERSIBLE! Todas las ventas, clientes y cambios realizados después de este backup se perderán para siempre. ¿Estás absolutamente seguro?"
        onConfirm={processRestore}
        onCancel={() => setConfirmVisible(false)}
        confirmText="SÍ, DESTRUIR DATOS ACTUALES Y RESTAURAR"
        danger={true}
      />

      <div className="page-header">
        <h1 className="page-title"><CloudServerOutlined /> Backups y restauración</h1>
        <button className="btn btn-primary" onClick={handleGenerar} disabled={generando}>
          {generando ? 'Generando...' : '+ Generar Backup Ahora'}
        </button>
        <p className="page-subtitle">Protege tu información y programa respaldos periódicos seguros en la nube.</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* CONFIGURATION CARD */}
        <div className="card" style={{ flex: 1, minWidth: '300px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SettingOutlined /> Configuración Automática
          </h3>
          <form onSubmit={saveConfig}>
            <div className="form-group">
              <label className="form-label">Estado del Respaldo Automático</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  checked={activo} 
                  onChange={(e) => setActivo(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', color: activo ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {activo ? 'Activo (Generando respaldos)' : 'Inactivo (No se generarán respaldos)'}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Frecuencia</label>
              <select className="form-input" value={frecuencia} onChange={e => setFrecuencia(e.target.value)} disabled={!activo}>
                <option value="DIARIO">Diario (Recomendado)</option>
                <option value="SEMANAL">Semanal</option>
                <option value="MENSUAL">Mensual</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Hora de Ejecución (Horario de baja carga recomendado)</label>
              <input 
                type="time" 
                className="form-input" 
                value={hora} 
                onChange={e => setHora(e.target.value)} 
                disabled={!activo}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Guardar Configuración
            </button>
          </form>
        </div>

        {/* LIST OF BACKUPS CARD */}
        <div className="card" style={{ flex: 2, minWidth: '400px' }}>
          <h3 style={{ marginBottom: '16px' }}>Historial de Respaldos (Retención de 7 días)</h3>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha de Creación</th>
                  <th>Estado</th>
                  <th>Notas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>
                      {new Date(b.fecha_creacion).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${b.estado === 'EXITO' ? 'badge-success' : 'badge-danger'}`}>
                        {b.estado}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{b.notas}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {b.url && (
                          <a href={b.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" title="Descargar ZIP">
                            ⬇️ Descargar
                          </a>
                        )}
                        {b.estado === 'EXITO' && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleRestoreClick(b.id)} title="Restaurar este backup">
                            <ReloadOutlined /> Restaurar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {backups.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No hay respaldos generados todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', borderRadius: '4px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)' }}>
              <WarningOutlined style={{ color: '#ef4444', marginRight: '8px' }} />
              <strong>Atención:</strong> La restauración sobreescribirá los datos actuales de tu negocio. Si necesitas recuperar solo un registro (ej. una factura borrada), es mejor descargar el ZIP y buscarlo manualmente en el archivo JSON.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Backups;

