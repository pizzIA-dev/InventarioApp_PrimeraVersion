import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Empty, Skeleton, Table, Tabs, Tag, Tooltip, message } from 'antd';
import {
  ArrowLeftOutlined, CopyOutlined, DollarOutlined, FieldTimeOutlined, PauseCircleOutlined,
  PlayCircleOutlined, SwapOutlined,
} from '@ant-design/icons';
import { panelAPI, mensajeError } from '../panelApi';
import { ACCIONES, COLOR_ACCION, diasTexto, fecha, fechaHora, money } from '../utils';
import EstadoTag from '../components/EstadoTag';
import { ActivarModal, CambiarPlanModal, ExtenderModal, NotaModal } from '../components/SuscripcionModals';

const ORIGEN = { MANUAL: 'Manual', AUTOMATICO: 'Automático', PRE_RESTAURACION: 'Antes de restaurar' };

function RespaldosCard({ r }) {
  if (!r) return null;
  if (r.error) {
    return (
      <div className="pnl-card">
        <div className="pnl-card-title">Respaldos</div>
        <Alert type="error" showIcon message="No se pudo leer el estado de respaldos" description={r.error} />
      </div>
    );
  }
  const atrasado = r.activo && (r.dias_sin_respaldo === null || r.dias_sin_respaldo > 2);
  let aviso = null;
  if (!r.activo) aviso = <Alert type="warning" showIcon message="El Gerente desactivó los respaldos automáticos." />;
  else if (r.ultimo_fallo) aviso = <Alert type="error" showIcon message="El último respaldo falló." />;
  else if (atrasado) {
    aviso = <Alert type="warning" showIcon message={r.ultimo_exito
      ? `Sin respaldos hace ${r.dias_sin_respaldo} días.` : 'Todavía no tiene ningún respaldo.'} />;
  }
  return (
    <div className="pnl-card">
      <div className="pnl-card-title">Respaldos</div>
      {aviso && <div style={{ marginBottom: 12 }}>{aviso}</div>}
      <dl className="pnl-kv">
        <dt>Automático</dt>
        <dd>{r.activo ? `${r.frecuencia === 'DIARIO' ? 'Diario' : r.frecuencia === 'SEMANAL' ? 'Semanal' : 'Mensual'} · ${r.hora}` : 'Desactivado'}</dd>
        <dt>Último correcto</dt><dd className="num">{r.ultimo_exito ? fechaHora(r.ultimo_exito) : '—'}</dd>
      </dl>
      {r.recientes.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {r.recientes.map((b) => (
            <div key={b.fecha} className="pnl-alert-row" style={{ padding: '7px 0' }}>
              <span className="num" style={{ fontSize: 12.5 }}>{fechaHora(b.fecha)}</span>
              <span style={{ fontSize: 12.5, color: '#6b7280' }}>
                {ORIGEN[b.origen] || b.origen}{b.tamano_bytes ? ` · ${(b.tamano_bytes / 1024).toFixed(1)} KB` : ''}
              </span>
              <Tag color={b.estado === 'EXITO' ? 'green' : 'red'} style={{ marginInlineEnd: 0 }}>{b.estado}</Tag>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PanelEmpresaDetalle() {
  const { id } = useParams();
  const [empresa, setEmpresa] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);

  const cargar = useCallback(() => {
    panelAPI.empresa(id).then((r) => setEmpresa(r.data))
      .catch((e) => setError(mensajeError(e, 'No se pudo cargar la empresa.')));
  }, [id]);

  useEffect(() => {
    cargar();
    panelAPI.planes().then((r) => setPlanes(r.data)).catch(() => {});
  }, [cargar]);

  if (error) return <Alert type="error" showIcon message={error} />;
  if (!empresa) return <Skeleton active paragraph={{ rows: 10 }} />;

  const sus = empresa.suscripcion;
  const cerrar = () => setModal(null);
  const actualizar = (data) => setEmpresa((prev) => ({ ...prev, ...data }));
  const copiar = (txt) => navigator.clipboard?.writeText(txt).then(() => message.success('Copiado'));

  const colPagos = [
    { title: 'Fecha', dataIndex: 'fecha_pago', render: (v) => <span className="num">{fecha(v)}</span> },
    {
      title: 'Monto', render: (_, p) => (
        <span className="num" style={{ textDecoration: p.estado === 'REVERSADO' ? 'line-through' : 'none' }}>
          {money(p.monto, p.moneda)}
        </span>
      ),
    },
    { title: 'Método', dataIndex: 'metodo_pago_display' },
    { title: 'Referencia', dataIndex: 'referencia', render: (v) => v || '—' },
    {
      title: 'Periodo cubierto', render: (_, p) => (p.periodo_inicio
        ? <span className="num" style={{ fontSize: 12.5 }}>{fecha(p.periodo_inicio)} → {fecha(p.periodo_fin)}</span> : '—'),
    },
    { title: 'Estado', dataIndex: 'estado', render: (v) => <Tag color={v === 'REVERSADO' ? 'orange' : 'green'}>{v}</Tag> },
  ];

  const colMovs = [
    { title: 'Fecha', dataIndex: 'creado_en', width: 150, render: (v) => <span className="num">{fechaHora(v)}</span> },
    { title: 'Acción', dataIndex: 'accion', width: 150, render: (v) => <Tag color={COLOR_ACCION[v]}>{ACCIONES[v] || v}</Tag> },
    { title: 'Detalle', dataIndex: 'detalle' },
    { title: 'Por', dataIndex: 'usuario_nombre', width: 140 },
  ];

  return (
    <>
      <Link to="/panel/empresas" style={{ color: '#6b7280', fontSize: 13 }}><ArrowLeftOutlined /> Empresas</Link>
      <div className="pnl-head" style={{ marginTop: 10 }}>
        <div>
          <div className="pnl-eyebrow">Empresa #{empresa.id}</div>
          <h1 className="pnl-title">{empresa.nombre}</h1>
          <div className="pnl-sub">{empresa.owner_email || 'Sin email de propietario'}</div>
        </div>
        <EstadoTag estado={empresa.estado} />
      </div>

      <div className="pnl-grid-2">
        <div className="pnl-stack">
          <div className="pnl-sus">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, position: 'relative', zIndex: 1 }}>
              <div>
                <div className="lbl">Vence</div>
                <div className="big">{sus?.fecha_fin ? fecha(sus.fecha_fin) : sus ? 'Sin fecha' : '—'}</div>
                <div style={{ color: '#9aa3ae', fontSize: 13 }}>
                  {sus ? diasTexto(sus.dias_restantes) : 'Este negocio no tiene suscripción registrada'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="lbl">Acceso</div>
                <div className="val" style={{ color: sus && !sus.tiene_acceso ? '#f59e8b' : '#7fd1c4' }}>
                  {!sus || sus.tiene_acceso ? 'Habilitado' : 'Bloqueado'}
                </div>
              </div>
            </div>
            <div className="row">
              <div><div className="lbl">Plan</div><div className="val">{sus?.plan?.nombre_display || '—'}</div></div>
              <div><div className="lbl">Estado de pago</div><div className="val">{sus?.estado_pago || '—'}</div></div>
              <div><div className="lbl">Desde</div><div className="val num">{fecha(sus?.fecha_inicio)}</div></div>
            </div>
            <div className="pnl-actions">
              <Button type="primary" icon={<DollarOutlined />} onClick={() => setModal('activar')}>
                Registrar pago y activar
              </Button>
              <Tooltip title={!sus ? 'Primero registra un pago' : ''}>
                <Button ghost icon={<FieldTimeOutlined />} disabled={!sus} onClick={() => setModal('extender')}>Extender</Button>
              </Tooltip>
              <Button ghost icon={<SwapOutlined />} disabled={!sus} onClick={() => setModal('plan')}>Cambiar plan</Button>
              {sus?.activa
                ? <Button ghost danger icon={<PauseCircleOutlined />} onClick={() => setModal('suspender')}>Suspender</Button>
                : sus && <Button ghost icon={<PlayCircleOutlined />} onClick={() => setModal('reactivar')}>Reactivar</Button>}
            </div>
          </div>

          <div className="pnl-card">
            <Tabs items={[
              {
                key: 'pagos', label: `Pagos (${empresa.pagos.length})`,
                children: empresa.pagos.length
                  ? <Table rowKey="id" size="small" columns={colPagos} dataSource={empresa.pagos} pagination={false} scroll={{ x: 640 }} />
                  : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin pagos registrados" />,
              },
              {
                key: 'mov', label: `Auditoría (${empresa.movimientos.length})`,
                children: empresa.movimientos.length
                  ? <Table rowKey="id" size="small" columns={colMovs} dataSource={empresa.movimientos} pagination={false} scroll={{ x: 640 }} />
                  : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin acciones registradas" />,
              },
            ]} />
          </div>
        </div>

        <div className="pnl-stack">
          <div className="pnl-card">
            <div className="pnl-card-title">Datos del negocio</div>
            <dl className="pnl-kv">
              <dt>Schema</dt><dd className="num">{empresa.schema_name}</dd>
              <dt>Código de acceso</dt>
              <dd>
                <span className="pnl-code">{empresa.codigo_acceso}</span>{' '}
                <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copiar(empresa.codigo_acceso)} />
              </dd>
              <dt>Registrado</dt><dd className="num">{fecha(empresa.creado_en)}</dd>
              <dt>Asientos</dt><dd className="num">{sus?.asientos_contratados ?? '—'}</dd>
            </dl>
          </div>
          <RespaldosCard r={empresa.respaldos} />
          <div className="pnl-card">
            <div className="pnl-card-title">Total pagado</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{money(empresa.total_pagado?.PEN || 0)}</div>
            {Number(empresa.total_pagado?.USD || 0) > 0 && (
              <div className="num" style={{ color: '#6b7280' }}>{money(empresa.total_pagado.USD, 'USD')}</div>
            )}
            <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 8 }}>Sin contar pagos reversados.</div>
          </div>
        </div>
      </div>

      <ActivarModal open={modal === 'activar'} empresa={empresa} planes={planes} onClose={cerrar} onDone={actualizar} />
      <ExtenderModal open={modal === 'extender'} empresa={empresa} onClose={cerrar} onDone={actualizar} />
      <CambiarPlanModal open={modal === 'plan'} empresa={empresa} planes={planes} onClose={cerrar} onDone={actualizar} />
      <NotaModal open={modal === 'suspender'} titulo={`Suspender ${empresa.nombre}`} okText="Suspender" danger
        texto="El negocio pierde el acceso de inmediato, incluidas las sesiones abiertas. La fecha de vencimiento no cambia."
        accion={(d) => panelAPI.suspender(empresa.id, d)} exito="Suscripción suspendida."
        onClose={cerrar} onDone={actualizar} />
      <NotaModal open={modal === 'reactivar'} titulo={`Reactivar ${empresa.nombre}`} okText="Reactivar"
        texto="Se devuelve el acceso sin cambiar la fecha de vencimiento. Si ya venció, registra un pago o extiéndela."
        accion={(d) => panelAPI.reactivar(empresa.id, d)} exito="Suscripción reactivada."
        onClose={cerrar} onDone={actualizar} />
    </>
  );
}
