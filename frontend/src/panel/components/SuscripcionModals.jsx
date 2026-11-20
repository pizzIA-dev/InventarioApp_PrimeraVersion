/**
 * Modales de acciones sobre la suscripción de una empresa.
 * Todos devuelven la empresa actualizada vía onDone(data).
 */
import { useEffect, useState } from 'react';
import { Alert, DatePicker, Form, Input, InputNumber, Modal, Select, message } from 'antd';
import dayjs from 'dayjs';
import { panelAPI, mensajeError } from '../panelApi';
import { METODOS, money } from '../utils';
import DuracionFields, { duracionPayload, inicioPeriodo } from './DuracionFields';

function useEnviar(onDone, onClose) {
  const [loading, setLoading] = useState(false);
  const enviar = async (fn, exito) => {
    setLoading(true);
    try {
      const { data } = await fn();
      message.success(exito);
      (data.avisos || []).forEach((a) => message.warning(a, 6));
      onDone?.(data);
      onClose();
    } catch (err) {
      message.error(mensajeError(err));
    } finally {
      setLoading(false);
    }
  };
  return [loading, enviar];
}

/** Acción principal: registrar pago + activar/extender en una sola operación. */
export function ActivarModal({ open, empresa, planes, onClose, onDone }) {
  const [form] = Form.useForm();
  const [loading, enviar] = useEnviar(onDone, onClose);
  const sus = empresa?.suscripcion;
  const planId = Form.useWatch('plan_id', form);
  const meses = Form.useWatch('meses', form);
  const modo = Form.useWatch('modo', form);

  // El modal se destruye al cerrarse: initialValues se recalcula en cada apertura.
  const planInicial = sus?.plan || planes[0];
  const iniciales = {
    plan_id: planInicial?.id, moneda: 'PEN', metodo_pago: 'TRANSFERENCIA', fecha_pago: dayjs(),
    monto: planInicial ? Number(planInicial.precio_mensual) : undefined,
  };

  // Sugerir monto = precio del plan × meses (editable)
  useEffect(() => {
    if (!open || (modo && modo !== 'meses')) return;
    const plan = planes.find((p) => p.id === planId);
    if (plan && meses) form.setFieldValue('monto', Number((plan.precio_mensual * meses).toFixed(2)));
  }, [planId, meses, modo]); // eslint-disable-line react-hooks/exhaustive-deps

  const onOk = async () => {
    const v = await form.validateFields();
    enviar(() => panelAPI.activar(empresa.id, {
      plan_id: v.plan_id, monto: v.monto, moneda: v.moneda, metodo_pago: v.metodo_pago,
      referencia: v.referencia || '', fecha_pago: v.fecha_pago?.format('YYYY-MM-DD'),
      notas: v.notas || '', ...duracionPayload(v),
    }), 'Pago registrado y suscripción actualizada.');
  };

  return (
    <Modal open={open} title={`Registrar pago y activar · ${empresa?.nombre || ''}`} onCancel={onClose}
      onOk={onOk} okText="Registrar y activar" confirmLoading={loading} width={560} destroyOnClose>
      <Form form={form} layout="vertical" requiredMark={false} preserve={false} initialValues={iniciales}>
        <Form.Item name="plan_id" label="Plan" rules={[{ required: true }]}>
          <Select options={planes.map((p) => ({
            value: p.id, label: `${p.nombre_display} · ${money(p.precio_mensual)} / mes`,
          }))} />
        </Form.Item>
        <DuracionFields form={form} inicio={inicioPeriodo(sus)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
          <Form.Item name="monto" label="Monto recibido" rules={[{ required: true, message: 'Indica el monto' }]}>
            <InputNumber min={0.01} step={0.1} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="moneda" label="Moneda">
            <Select options={[{ value: 'PEN', label: 'PEN' }, { value: 'USD', label: 'USD' }]} />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="metodo_pago" label="Método">
            <Select options={METODOS.map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="fecha_pago" label="Fecha del pago">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <Form.Item name="referencia" label="Referencia / Nro. de operación">
          <Input maxLength={100} placeholder="Opcional" />
        </Form.Item>
        <Form.Item name="notas" label="Notas">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/** Extensión de cortesía: no registra ingreso. */
export function ExtenderModal({ open, empresa, onClose, onDone }) {
  const [form] = Form.useForm();
  const [loading, enviar] = useEnviar(onDone, onClose);
  const onOk = async () => {
    const v = await form.validateFields();
    enviar(() => panelAPI.extender(empresa.id, { notas: v.notas || '', ...duracionPayload(v) }),
      'Suscripción extendida.');
  };
  return (
    <Modal open={open} title="Extender sin pago (cortesía)" onCancel={onClose} onOk={onOk}
      okText="Extender" confirmLoading={loading} destroyOnClose>
      <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="No se registra ningún ingreso. Úsalo para pruebas gratis o compensaciones." />
      <Form form={form} layout="vertical" requiredMark={false} preserve={false}>
        <DuracionFields form={form} inicio={inicioPeriodo(empresa?.suscripcion)} />
        <Form.Item name="notas" label="Motivo"><Input.TextArea rows={2} maxLength={500} /></Form.Item>
      </Form>
    </Modal>
  );
}

export function CambiarPlanModal({ open, empresa, planes, onClose, onDone }) {
  const [form] = Form.useForm();
  const [loading, enviar] = useEnviar(onDone, onClose);
  const actual = empresa?.suscripcion?.plan?.id;
  const onOk = async () => {
    const v = await form.validateFields();
    enviar(() => panelAPI.cambiarPlan(empresa.id, v), 'Plan actualizado.');
  };
  return (
    <Modal open={open} title="Cambiar plan" onCancel={onClose} onOk={onOk} okText="Cambiar"
      confirmLoading={loading} destroyOnClose>
      <Form form={form} layout="vertical" requiredMark={false} preserve={false}>
        <Form.Item name="plan_id" label="Nuevo plan" rules={[{ required: true, message: 'Elige un plan' }]}>
          <Select options={planes.filter((p) => p.id !== actual).map((p) => ({
            value: p.id, label: `${p.nombre_display} · ${money(p.precio_mensual)} / mes`,
          }))} />
        </Form.Item>
        <Form.Item name="notas" label="Notas"><Input.TextArea rows={2} maxLength={500} /></Form.Item>
      </Form>
    </Modal>
  );
}

/** Suspender / reactivar: solo pide una nota. */
export function NotaModal({ open, titulo, texto, okText, danger, accion, exito, onClose, onDone }) {
  const [form] = Form.useForm();
  const [loading, enviar] = useEnviar(onDone, onClose);
  const onOk = async () => {
    const v = await form.validateFields();
    enviar(() => accion({ notas: v.notas || '' }), exito);
  };
  return (
    <Modal open={open} title={titulo} onCancel={onClose} onOk={onOk} okText={okText}
      okButtonProps={{ danger }} confirmLoading={loading} destroyOnClose>
      {texto && <p style={{ color: '#4b5563' }}>{texto}</p>}
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="notas" label="Motivo (queda en la auditoría)">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
