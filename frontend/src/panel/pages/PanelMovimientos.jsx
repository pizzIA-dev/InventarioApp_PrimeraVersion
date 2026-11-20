import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DatePicker, Select, Table, Tag, message } from 'antd';
import { panelAPI, mensajeError } from '../panelApi';
import { ACCIONES, COLOR_ACCION, fecha, fechaHora, iso } from '../utils';

export default function PanelMovimientos() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({});

  const params = useMemo(() => ({
    page,
    accion: filtros.accion,
    fecha_desde: iso(filtros.rango?.[0]),
    fecha_hasta: iso(filtros.rango?.[1]),
  }), [page, filtros]);

  useEffect(() => {
    setLoading(true);
    panelAPI.movimientos(params)
      .then((r) => { setRows(r.data.results); setTotal(r.data.count); })
      .catch((e) => message.error(mensajeError(e)))
      .finally(() => setLoading(false));
  }, [params]);

  const filtrar = (c) => { setPage(1); setFiltros((f) => ({ ...f, ...c })); };

  const columns = [
    { title: 'Fecha', dataIndex: 'creado_en', width: 150, render: (v) => <span className="num">{fechaHora(v)}</span> },
    { title: 'Empresa', width: 200, render: (_, m) => <Link to={`/panel/empresas/${m.empresa}`}>{m.empresa_nombre}</Link> },
    { title: 'Acción', dataIndex: 'accion', width: 150, render: (v) => <Tag color={COLOR_ACCION[v]}>{ACCIONES[v] || v}</Tag> },
    { title: 'Detalle', dataIndex: 'detalle' },
    {
      title: 'Vencimiento', width: 210, render: (_, m) => (m.fecha_fin_anterior || m.fecha_fin_nueva) && (
        <span className="num" style={{ fontSize: 12.5 }}>{fecha(m.fecha_fin_anterior)} → {fecha(m.fecha_fin_nueva)}</span>
      ),
    },
    { title: 'Por', dataIndex: 'usuario_nombre', width: 140 },
  ];

  return (
    <>
      <div className="pnl-head">
        <div>
          <div className="pnl-eyebrow">Auditoría</div>
          <h1 className="pnl-title">Acciones sobre suscripciones</h1>
          <div className="pnl-sub">Registro inmutable de quién hizo qué y cuándo.</div>
        </div>
      </div>
      <div className="pnl-card">
        <div className="pnl-toolbar">
          <DatePicker.RangePicker format="DD/MM/YYYY" onChange={(v) => filtrar({ rango: v })} />
          <Select allowClear placeholder="Acción" style={{ width: 200 }} onChange={(v) => filtrar({ accion: v })}
            options={Object.entries(ACCIONES).map(([value, label]) => ({ value, label }))} />
        </div>
        <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} scroll={{ x: 1000 }}
          pagination={{ current: page, total, pageSize: 20, showSizeChanger: false, onChange: setPage }} />
      </div>
    </>
  );
}
