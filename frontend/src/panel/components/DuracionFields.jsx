import { DatePicker, Form, InputNumber, Segmented } from 'antd';
import dayjs from 'dayjs';
import { fecha } from '../utils';

/**
 * Campos de duración: N meses (por defecto 1), N días o una fecha exacta.
 * Muestra en vivo hasta cuándo quedaría la suscripción.
 * `inicio` = día desde el que corre el nuevo periodo (calculado por el padre).
 */
export function previewFin(values, inicio) {
  const modo = values?.modo || 'meses';
  if (modo === 'fecha') return values?.fecha_fin || null;
  if (modo === 'dias') return values?.dias ? inicio.add(values.dias - 1, 'day') : null;
  return values?.meses ? inicio.add(values.meses, 'month').subtract(1, 'day') : null;
}

export function duracionPayload(values) {
  const modo = values.modo || 'meses';
  if (modo === 'fecha') return { fecha_fin: values.fecha_fin?.format('YYYY-MM-DD') };
  if (modo === 'dias') return { dias: values.dias };
  return { meses: values.meses };
}

/** Día en que arranca el nuevo periodo: tras la fecha_fin vigente, o hoy si ya venció. */
export function inicioPeriodo(suscripcion) {
  const hoy = dayjs().startOf('day');
  const fin = suscripcion?.fecha_fin ? dayjs(suscripcion.fecha_fin) : null;
  return fin && !fin.isBefore(hoy) ? fin.add(1, 'day') : hoy;
}

export default function DuracionFields({ form, inicio }) {
  const values = Form.useWatch([], form);
  const modo = values?.modo || 'meses';
  const fin = previewFin(values, inicio);

  return (
    <>
      <Form.Item name="modo" label="Duración" initialValue="meses">
        <Segmented options={[
          { label: 'Meses', value: 'meses' },
          { label: 'Días', value: 'dias' },
          { label: 'Hasta fecha', value: 'fecha' },
        ]} />
      </Form.Item>
      {modo === 'meses' && (
        <Form.Item name="meses" initialValue={1} rules={[{ required: true, message: 'Indica los meses' }]}>
          <InputNumber min={1} max={36} addonAfter="mes(es)" style={{ width: 200 }} />
        </Form.Item>
      )}
      {modo === 'dias' && (
        <Form.Item name="dias" initialValue={30} rules={[{ required: true, message: 'Indica los días' }]}>
          <InputNumber min={1} max={1095} addonAfter="día(s)" style={{ width: 200 }} />
        </Form.Item>
      )}
      {modo === 'fecha' && (
        <Form.Item name="fecha_fin" rules={[{ required: true, message: 'Elige la fecha' }]}>
          <DatePicker format="DD/MM/YYYY" disabledDate={(d) => d.isBefore(dayjs().startOf('day'))} />
        </Form.Item>
      )}
      <div style={{ margin: '-6px 0 18px', fontSize: 13, color: '#6b7280' }}>
        Periodo: <span className="num">{fecha(inicio)}</span> → <b className="num">{fin ? fecha(fin) : '—'}</b>
      </div>
    </>
  );
}
