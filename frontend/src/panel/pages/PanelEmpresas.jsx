import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Input, Select, Table, message } from 'antd';
import { panelAPI, mensajeError } from '../panelApi';
import { ESTADOS, diasTexto, fecha } from '../utils';
import EstadoTag from '../components/EstadoTag';

export default function PanelEmpresas() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState(params.get('search') || '');

  const page = Number(params.get('page') || 1);
  const filtros = {
    search: params.get('search') || undefined,
    estado: params.get('estado') || undefined,
    plan: params.get('plan') || undefined,
    ordering: params.get('ordering') || undefined,
  };

  const setParam = (cambios) => {
    const next = new URLSearchParams(params);
    Object.entries(cambios).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in cambios)) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    setLoading(true);
    panelAPI.empresas({ ...filtros, page })
      .then((r) => { setRows(r.data.results); setTotal(r.data.count); })
      .catch((e) => message.error(mensajeError(e)))
      .finally(() => setLoading(false));
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    {
      title: 'Empresa', dataIndex: 'nombre', key: 'nombre', sorter: true,
      sortOrder: filtros.ordering === 'nombre' ? 'ascend' : filtros.ordering === '-nombre' ? 'descend' : null,
      render: (v, r) => (
        <div>
          <Link to={`/panel/empresas/${r.id}`} style={{ fontWeight: 500 }}>{v}</Link>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{r.owner_email || 'sin email'}</div>
        </div>
      ),
    },
    { title: 'Schema', dataIndex: 'schema_name', render: (v) => <span className="num">{v}</span> },
    { title: 'Código', dataIndex: 'codigo_acceso', render: (v) => <span className="pnl-code">{v}</span> },
    { title: 'Plan', render: (_, r) => r.suscripcion?.plan?.nombre_display || '—' },
    { title: 'Estado', dataIndex: 'estado', render: (v) => <EstadoTag estado={v} /> },
    {
      title: 'Vence', key: 'fecha_fin', sorter: true,
      sortOrder: filtros.ordering === 'fecha_fin' ? 'ascend' : filtros.ordering === '-fecha_fin' ? 'descend' : null,
      render: (_, r) => (
        <div className="num" style={{ fontSize: 13 }}>
          {fecha(r.suscripcion?.fecha_fin)}
          <div style={{ fontSize: 11.5, color: '#6b7280' }}>{diasTexto(r.suscripcion?.dias_restantes)}</div>
        </div>
      ),
    },
    {
      title: 'Registro', dataIndex: 'creado_en', key: 'creado_en', sorter: true,
      sortOrder: filtros.ordering === 'creado_en' ? 'ascend' : filtros.ordering === '-creado_en' ? 'descend' : null,
      render: (v) => <span className="num">{fecha(v)}</span>,
    },
  ];

  return (
    <>
      <div className="pnl-head">
        <div>
          <div className="pnl-eyebrow">Empresas</div>
          <h1 className="pnl-title">Negocios registrados</h1>
          <div className="pnl-sub">{total} resultado(s)</div>
        </div>
      </div>

      <div className="pnl-card">
        <div className="pnl-toolbar">
          <Input.Search allowClear placeholder="Nombre, email, schema o código" style={{ width: 300 }}
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            onSearch={(v) => setParam({ search: v.trim() })} />
          <Select allowClear placeholder="Estado" style={{ width: 180 }} value={filtros.estado}
            onChange={(v) => setParam({ estado: v })}
            options={Object.entries(ESTADOS).map(([value, m]) => ({ value, label: m.label }))} />
          <Select allowClear placeholder="Plan" style={{ width: 160 }} value={filtros.plan}
            onChange={(v) => setParam({ plan: v })}
            options={[{ value: 'EMPRENDEDOR', label: 'Emprendedor' }, { value: 'EMPRESARIO', label: 'Empresario' }]} />
        </div>
        <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} scroll={{ x: 900 }}
          pagination={{ current: page, total, pageSize: 20, showSizeChanger: false }}
          onChange={(pag, _f, sorter) => {
            const orden = sorter?.order
              ? `${sorter.order === 'descend' ? '-' : ''}${sorter.columnKey}` : undefined;
            const cambios = { ordering: orden };
            if (pag.current !== page) cambios.page = String(pag.current);
            setParam(cambios);
          }} />
      </div>
    </>
  );
}
