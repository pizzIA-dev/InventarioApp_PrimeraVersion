import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, message, Modal, Form, Input, Select, DatePicker, InputNumber } from 'antd';
import { PlusOutlined, CheckOutlined, PlayCircleOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { comprasServiciosAPI, serviciosAPI, proveedoresAPI } from '../services/api';
import ExportDropdown from '../components/ExportDropdown';
import SearchableSelect from '../components/SearchableSelect';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const ESTADO_COLORS = {
  PENDIENTE:   'orange',
  EN_PROCESO:  'blue',
  COMPLETADO:  'green',
  CANCELADO:   'red',
};

function ComprasServicios() {
  const [data, setData]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [servicios, setServicios]     = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [form]                        = Form.useForm();
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const PAGE_SIZE = 15;

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await comprasServiciosAPI.getAll({ page: p, page_size: PAGE_SIZE });
      setData(res.data.results || res.data);
      setTotal(res.data.count || 0);
    } catch { message.error('Error al cargar compras de servicios'); }
    setLoading(false);
  };

  const fetchCatalogs = async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        serviciosAPI.getAll({ page_size: 999, activo: true }),
        proveedoresAPI.getAll({ page_size: 999 }),
      ]);
      setServicios(sRes.data.results || sRes.data);
      setProveedores(pRes.data.results || pRes.data);
    } catch {}
  };

  useEffect(() => { fetchData(); fetchCatalogs(); }, []);

  const handleCreate = async (values) => {
    try {
      const payload = {
        ...values,
        fecha_programada: values.fecha_programada ? values.fecha_programada.format('YYYY-MM-DD') : null,
      };
      await comprasServiciosAPI.create(payload);
      message.success('Compra de servicio registrada');
      setModalOpen(false);
      form.resetFields();
      fetchData(page);
    } catch (e) {
      message.error(e.response?.data?.error || 'Error al crear');
    }
  };

  const handleCompletar = async (id) => {
    try {
      await comprasServiciosAPI.completar(id);
      message.success('Marcado como completado');
      fetchData(page);
    } catch { message.error('Error al completar'); }
  };

  const handleIniciar = async (id) => {
    try {
      await comprasServiciosAPI.iniciar(id);
      message.success('Servicio iniciado');
      fetchData(page);
    } catch { message.error('Error al iniciar'); }
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Eliminar compra de servicio?',
      content: 'Esta accion no se puede deshacer.',
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await comprasServiciosAPI.delete(id);
          message.success('Eliminado');
          fetchData(page);
        } catch { message.error('Error al eliminar'); }
      },
    });
  };

  const columns = [
    { title: 'Servicio',    dataIndex: 'servicio_nombre',   key: 'servicio',   ellipsis: true },
    { title: 'Proveedor',   dataIndex: 'proveedor_nombre',  key: 'proveedor',  ellipsis: true },
    { title: 'Precio',      dataIndex: 'precio',            key: 'precio',     render: v => `S/ ${parseFloat(v || 0).toFixed(2)}` },
    { title: 'Fecha',       dataIndex: 'fecha_programada',  key: 'fecha' },
    {
      title: 'Estado', dataIndex: 'estado', key: 'estado',
      render: v => <Tag color={ESTADO_COLORS[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Acciones', key: 'acciones',
      render: (_, record) => (
        <Space size="small">
          {record.estado === 'PENDIENTE' && (
            <Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleIniciar(record.id)}>
              Iniciar
            </Button>
          )}
          {record.estado === 'EN_PROCESO' && (
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleCompletar(record.id)}>
              Completar
            </Button>
          )}
          {record.estado === 'PENDIENTE' && (
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Compra de Servicios</h2>
        <Space>
          <ExportDropdown
            onExport={(fmt) => comprasServiciosAPI.exportar({ formato: fmt })}
            formats={['excel', 'csv']}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Nueva compra
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page, total, pageSize: PAGE_SIZE,
          onChange: (p) => { setPage(p); fetchData(p); },
          showTotal: (t) => `${t} registros`,
        }}
        size="middle"
      />

      <Modal
        open={modalOpen}
        title="Nueva Compra de Servicio"
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Registrar"
        cancelText="Cancelar"
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="servicio" label="Servicio" rules={[{ required: true }]}>
            <Select showSearch placeholder="Seleccionar servicio" filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }>
              {servicios.map(s => <Option key={s.id} value={s.id}>{s.nombre}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="proveedor" label="Proveedor (opcional)">
            <Select showSearch allowClear placeholder="Seleccionar proveedor" filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }>
              {proveedores.map(p => <Option key={p.id} value={p.id}>{p.nombre}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="precio" label="Precio" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="fecha_programada" label="Fecha programada">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="notas" label="Notas">
            <TextArea rows={3} placeholder="Descripcion o notas adicionales" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ComprasServicios;
