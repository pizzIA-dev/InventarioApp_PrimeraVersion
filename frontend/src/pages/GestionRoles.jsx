import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Checkbox, message, Space, Result } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { rolesAPI } from '../services/api';

const MÓDULOS_SCOPES = [
  { label: 'Inventario (Lectura)', value: 'inventario:leer' },
  { label: 'Inventario (Escritura)', value: 'inventario:escribir' },
  { label: 'Ventas (Crear y Leer)', value: 'ventas:crear' },
  { label: 'Finanzas/Capital (Acceso Total)', value: 'capital:acceso' },
  { label: 'Reportes (Visualización)', value: 'reportes:ver' },
  { label: 'Usuarios y Empleados (Gestión)', value: 'usuarios:manejo' },
];

const GestionRoles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isUpsell, setIsUpsell] = useState(false);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await rolesAPI.getAll();
      setRoles(res.data);
      setIsUpsell(false);
    } catch (error) {
      if (error.response?.status === 403) {
        setIsUpsell(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      nombre: record.nombre,
      descripcion: record.descripcion,
      permisos: record.permisos || [],
    });
    setIsModalVisible(true);
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: '¿Eliminar este Rol?',
      content: 'Los usuarios con este rol perderán inmediatamente el acceso a las funciones extra.',
      onOk: async () => {
        try {
          await rolesAPI.delete(id);
          message.success('Rol eliminado');
          fetchRoles();
        } catch (error) {
          // El interceptor global mostrará el error si es que falla
        }
      }
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await rolesAPI.update(editingId, values);
        message.success('Rol actualizado con éxito');
      } else {
        await rolesAPI.create(values);
        message.success('Rol creado con éxito');
      }
      setIsModalVisible(false);
      fetchRoles();
    } catch (error) {
      console.error(error);
    }
  };

  if (isUpsell) {
    return (
      <div style={{ padding: '24px', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Result
          status="403"
          title="Función Corporativa (Plan Empresario)"
          subTitle="El Motor Avanzado de Roles y Permisos Granulares (RBAC) está disponible exclusivamente para clientes Empresarios. Contacta a nuestro equipo de ventas para hacer el upgrade."
          extra={<Button type="primary">Contactar a Ventas</Button>}
        />
      </div>
    );
  }

  const columns = [
    {
      title: 'Nombre del Rol',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
    },
    {
      title: 'Niveles de Acceso',
      dataIndex: 'permisos',
      key: 'permisos',
      render: (permisos) => (
        <span>{permisos?.length || 0} Reglas Privilegiadas</span>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>
          <SafetyCertificateOutlined style={{ marginRight: '8px' }} />
          Motor de Roles Avanzados
        </h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Nuevo Rol Corporate
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={roles}
        rowKey="id"
        loading={loading}
        pagination={false}
      />

      <Modal
        title={editingId ? 'Editar Rol' : 'Diseñar Nuevo Rol'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        okText="Guardar Cambios"
        cancelText="Cancelar"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="nombre"
            label="Título del Rol"
            rules={[{ required: true, message: 'Ingrese un nombre para el rol' }]}
          >
            <Input placeholder="Ej. Cajero, Sub-Gerente, Auditor..." />
          </Form.Item>
          
          <Form.Item name="descripcion" label="Descripción (Opcional)">
            <Input.TextArea placeholder="Describe brevemente de qué se encarga este rol" />
          </Form.Item>

          <Form.Item
            name="permisos"
            label="Interruptores de Acceso"
            tooltip="Habilita exactamente las secciones a las que este rol tendrá entrada."
          >
            <Checkbox.Group style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {MÓDULOS_SCOPES.map(scope => (
                <Checkbox key={scope.value} value={scope.value}>
                  {scope.label}
                </Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GestionRoles;
