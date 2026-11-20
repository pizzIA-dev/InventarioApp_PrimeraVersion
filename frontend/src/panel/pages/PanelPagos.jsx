import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Table, Tag, message,
} from 'antd';
import { PlusOutlined, RollbackOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { panelAPI, mensajeError } from '../panelApi';
import { METODOS, fecha, iso, money } from '../utils';

function NuevoPagoModal({ open, onClose, onDone }) {
  const [form] = Form.useForm();
  const [opciones, setOpciones] = useState([]);
  const [loading, setLoading] = useState(false);

  const buscar = (search) => panelAPI.empresas({ search, page_size: 20 })
    .then((r) => setOpciones(r.data.results.map((e) => ({ value: e.id, label: `${e.nombre} (${e.schema_name})` }))))
    .catch(() => {});

  useEffect(() => { if (open) buscar(''); }, [open]); // eslint-disable-line

  const onOk = async () => {
    const v = await form.validateFields();
    setLoading(true);
    try {
      const { data } = await panelAPI.crearPago({ ...v, fecha_pago: iso(v.fecha_pago) });
      message.success('Pago registrado.');
      (data.avisos || []).forEach((a) => message.warning(a, 6));
      onDone();
      onClose();
    } catch (e) {
      message.error(mensajeError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} title="Registrar pago suelto" onCancel={onClose} onOk={onOk} okText="Registrar"
      confirmLoading={loading} destroyOnClose width={520}>
      <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="Esto solo registra el ingreso. Para activar o extender la suscripción usa “Registrar pago y activar” en el detalle de la empresa." />
      <Form form={form} layout="vertical" requiredMark={false} preserve={false}
        initialValues={{ moneda: 'PEN', metodo_pago: 'TRANSFERENCIA', fecha_pago: dayjs() }}>
        <Form.Item name="empresa" label="Empresa" rules={[{ required: true, message: 'Elige la empresa' }]}>
          <Select showSearch filterOption={false} onSearch={buscar} options={opciones} placeholder="Buscar empresa" />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
          <Form.Item name="monto" label="Monto" rules={[{ required: true, message: 'Indica el monto' }]}>
            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="moneda" label="Moneda">
            <Select options={[{ value: 'PEN' }, { value: 'USD' }]} />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="metodo_pago" label="Método">
            <Select options={METODOS.map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="fecha_pago" label="Fecha" rules={[{ required: true }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <Form.Item name="referencia" label="Referencia"><Input maxLength={100} /></Form.Item>
        <Form.Item name="notas" label="Notas"><Input.TextArea rows={2} /></Form.Item>
      </Form>
    </Modal>
  );
}

export default function PanelPagos() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ rango: [dayjs().startOf('month'), dayjs()] });
  const [nuevo, setNuevo] = useState(false);
  const [revertir, setRevertir] = useState(null);
  const [motivo, setMotivo] = useState('');

  const params = useMemo(() => ({
    page,
    fecha_desde: iso(filtros.rango?.[0]),
    fecha_hasta: iso(filtros.rango?.[1]),
    moneda: filtros.moneda,
    estado: filtros.estado,
    search: filtros.search || undefined,
  }), [page, filtros]);

  const cargar = () => {
    setLoading(true);
    panelAPI.pagos(params)
      .then((r) => { setRows(r.data.results); setTotal(r.data.count); })
      .catch((e) => message.error(mensajeError(e)))
      .finally(() => setLoading(false));
  };
  useEffect(cargar, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtrar = (cambios) => { setPage(1); setFiltros((f) => ({ ...f, ...cambios })); };

  const confirmarReversion = async () => {
    try {
      await panelAPI.revertirPago(revertir.id, { motivo });
      message.success('Pago reversado. Ya no cuenta como ingreso.');
      setRevertir(null);
      setMotivo('');
      cargar();
    } catch (e) {
      message.error(mensajeError(e));
    }
  };

  const subtotal = rows.filter((p) => p.estado !== 'REVERSADO').reduce((acc, p) => {
    acc[p.moneda] = (acc[p.moneda] || 0) + Number(p.monto);
    return acc;
  }, {});

  const columns = [
    { title: 'Fecha', dataIndex: 'fecha_pago', render: (v) => <span className="num">{fecha(v)}</span> },
    { title: 'Empresa', render: (_, p) => <Link to={`/panel/empresas/${p.empresa}`}>{p.empresa_nombre}</Link> },
    { title: 'Plan', dataIndex: 'plan_nombre', render: (v) => v || '—' },
    {
      title: 'Monto', align: 'right', render: (_, p) => (
        <span className="num" style={{ fontWeight: 600, textDecoration: p.estado === 'REVERSADO' ? 'line-through' : 'none' }}>
          {money(p.monto, p.moneda)}
        </span>
      ),
    },
    { title: 'Método', dataIndex: 'metodo_pago_display' },
    { title: 'Referencia', dataIndex: 'referencia', render: (v) => v || '—' },
    { title: 'Estado', dataIndex: 'estado', render: (v) => <Tag color={v === 'REVERSADO' ? 'orange' : 'green'}>{v}</Tag> },
    { title: 'Registró', dataIndex: 'registrado_por_nombre', render: (v) => v || 'sistema' },
    {
      title: '', width: 60, render: (_, p) => p.estado !== 'REVERSADO' && (
        <Button size="small" type="text" danger icon={<RollbackOutlined />} title="Revertir"
          onClick={() => setRevertir(p)} />
      ),
    },
  ];

  return (
    <>
      <div className="pnl-head">
        <div>
          <div className="pnl-eyebrow">Ingresos</div>
          <h1 className="pnl-title">Pagos recibidos</h1>
          <div className="pnl-sub num">
            En esta página: {money(subtotal.PEN || 0)} · {money(subtotal.USD || 0, 'USD')}
          </div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setNuevo(true)}>Pago suelto</Button>
      </div>

      <div className="pnl-card">
        <div className="pnl-toolbar">
          <DatePicker.RangePicker format="DD/MM/YYYY" value={filtros.rango} onChange={(v) => filtrar({ rango: v })} />
          <Input.Search allowClear placeholder="Empresa o referencia" style={{ width: 240 }}
            onSearch={(v) => filtrar({ search: v.trim() })} />
          <Select allowClear placeholder="Moneda" style={{ width: 120 }} onChange={(v) => filtrar({ moneda: v })}
            options={[{ value: 'PEN' }, { value: 'USD' }]} />
          <Select allowClear placeholder="Estado" style={{ width: 150 }} onChange={(v) => filtrar({ estado: v })}
            options={[{ value: 'CONFIRMADO', label: 'Confirmado' }, { value: 'REVERSADO', label: 'Reversado' }]} />
        </div>
        <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} scroll={{ x: 960 }}
          pagination={{ current: page, total, pageSize: 20, showSizeChanger: false, onChange: setPage }} />
      </div>

      <NuevoPagoModal open={nuevo} onClose={() => setNuevo(false)} onDone={cargar} />
      <Modal open={!!revertir} title="Revertir pago" okText="Revertir" okButtonProps={{ danger: true, disabled: !motivo.trim() }}
        onOk={confirmarReversion} onCancel={() => { setRevertir(null); setMotivo(''); }} destroyOnClose>
        {revertir && (
          <p>
            {revertir.empresa_nombre} · <span className="num">{money(revertir.monto, revertir.moneda)}</span> del {fecha(revertir.fecha_pago)}.
            {' '}Dejará de contar como ingreso. La suscripción no se modifica: si corresponde, suspéndela aparte.
          </p>
        )}
        <Input.TextArea rows={3} placeholder="Motivo (obligatorio)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </Modal>
    </>
  );
}
