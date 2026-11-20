import { useEffect, useMemo, useState } from 'react';
import {
  Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Table, Tag, message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { panelAPI, mensajeError } from '../panelApi';
import { CATEGORIAS_GASTO, fecha, iso, money } from '../utils';

function GastoModal({ open, gasto, onClose, onDone }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const iniciales = gasto
    ? { ...gasto, monto: Number(gasto.monto), fecha: dayjs(gasto.fecha) }
    : { categoria: 'INFRAESTRUCTURA', moneda: 'PEN', fecha: dayjs() };

  const onOk = async () => {
    const v = await form.validateFields();
    const data = { ...v, fecha: iso(v.fecha), notas: v.notas || '' };
    setLoading(true);
    try {
      if (gasto) await panelAPI.editarGasto(gasto.id, data);
      else await panelAPI.crearGasto(data);
      message.success(gasto ? 'Gasto actualizado.' : 'Gasto registrado.');
      onDone();
      onClose();
    } catch (e) {
      message.error(mensajeError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} title={gasto ? 'Editar gasto' : 'Nuevo gasto'} onCancel={onClose} onOk={onOk}
      okText="Guardar" confirmLoading={loading} destroyOnClose>
      <Form form={form} layout="vertical" requiredMark={false} preserve={false} initialValues={iniciales}>
        <Form.Item name="concepto" label="Concepto" rules={[{ required: true, message: 'Describe el gasto' }]}>
          <Input maxLength={200} placeholder="Ej. Railway — plan Pro de noviembre" />
        </Form.Item>
        <Form.Item name="categoria" label="Categoría">
          <Select options={CATEGORIAS_GASTO.map(([value, label]) => ({ value, label }))} />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr', gap: 12 }}>
          <Form.Item name="monto" label="Monto" rules={[{ required: true, message: 'Indica el monto' }]}>
            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="moneda" label="Moneda">
            <Select options={[{ value: 'PEN' }, { value: 'USD' }]} />
          </Form.Item>
          <Form.Item name="fecha" label="Fecha" rules={[{ required: true }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <Form.Item name="notas" label="Notas"><Input.TextArea rows={2} /></Form.Item>
      </Form>
    </Modal>
  );
}

export default function PanelGastos() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ rango: [dayjs().startOf('month'), dayjs()] });
  const [editando, setEditando] = useState(undefined); // undefined = cerrado, null = nuevo

  const params = useMemo(() => ({
    page,
    fecha_desde: iso(filtros.rango?.[0]),
    fecha_hasta: iso(filtros.rango?.[1]),
    moneda: filtros.moneda,
    categoria: filtros.categoria,
    search: filtros.search || undefined,
  }), [page, filtros]);

  const cargar = () => {
    setLoading(true);
    panelAPI.gastos(params)
      .then((r) => { setRows(r.data.results); setTotal(r.data.count); })
      .catch((e) => message.error(mensajeError(e)))
      .finally(() => setLoading(false));
  };
  useEffect(cargar, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtrar = (c) => { setPage(1); setFiltros((f) => ({ ...f, ...c })); };

  const eliminar = async (g) => {
    try {
      await panelAPI.eliminarGasto(g.id);
      message.success('Gasto eliminado.');
      cargar();
    } catch (e) {
      message.error(mensajeError(e));
    }
  };

  const subtotal = rows.reduce((acc, g) => { acc[g.moneda] = (acc[g.moneda] || 0) + Number(g.monto); return acc; }, {});

  const columns = [
    { title: 'Fecha', dataIndex: 'fecha', render: (v) => <span className="num">{fecha(v)}</span> },
    { title: 'Concepto', dataIndex: 'concepto' },
    { title: 'Categoría', dataIndex: 'categoria_display', render: (v) => <Tag>{v}</Tag> },
    { title: 'Monto', align: 'right', render: (_, g) => <span className="num" style={{ fontWeight: 600 }}>{money(g.monto, g.moneda)}</span> },
    { title: 'Registró', dataIndex: 'registrado_por_nombre', render: (v) => v || '—' },
    {
      title: '', width: 90, render: (_, g) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => setEditando(g)} />
          <Popconfirm title="¿Eliminar este gasto?" okText="Eliminar" okButtonProps={{ danger: true }} onConfirm={() => eliminar(g)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="pnl-head">
        <div>
          <div className="pnl-eyebrow">Gastos</div>
          <h1 className="pnl-title">Egresos de la plataforma</h1>
          <div className="pnl-sub num">En esta página: {money(subtotal.PEN || 0)} · {money(subtotal.USD || 0, 'USD')}</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditando(null)}>Nuevo gasto</Button>
      </div>

      <div className="pnl-card">
        <div className="pnl-toolbar">
          <DatePicker.RangePicker format="DD/MM/YYYY" value={filtros.rango} onChange={(v) => filtrar({ rango: v })} />
          <Input.Search allowClear placeholder="Concepto" style={{ width: 220 }} onSearch={(v) => filtrar({ search: v.trim() })} />
          <Select allowClear placeholder="Categoría" style={{ width: 200 }} onChange={(v) => filtrar({ categoria: v })}
            options={CATEGORIAS_GASTO.map(([value, label]) => ({ value, label }))} />
          <Select allowClear placeholder="Moneda" style={{ width: 120 }} onChange={(v) => filtrar({ moneda: v })}
            options={[{ value: 'PEN' }, { value: 'USD' }]} />
        </div>
        <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} scroll={{ x: 760 }}
          pagination={{ current: page, total, pageSize: 20, showSizeChanger: false, onChange: setPage }} />
      </div>

      <GastoModal open={editando !== undefined} gasto={editando} onClose={() => setEditando(undefined)} onDone={cargar} />
    </>
  );
}
