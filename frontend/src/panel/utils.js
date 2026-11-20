import dayjs from 'dayjs';

export const SIMBOLO = { PEN: 'S/', USD: '$' };

export const money = (valor, moneda = 'PEN') => {
  const n = Number(valor || 0);
  const txt = Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? '−' : ''}${SIMBOLO[moneda] || ''} ${txt}`;
};

export const fecha = (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '—');
export const fechaHora = (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—');
export const iso = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : undefined);

export const ESTADOS = {
  activa:          { label: 'Activa',          color: 'success',    hint: 'Pagada y vigente' },
  por_vencer:      { label: 'Por vencer',      color: 'warning',    hint: 'Vence en 7 días o menos' },
  sandbox:         { label: 'Sandbox',         color: 'processing', hint: 'Registrada sin pago real' },
  vencida:         { label: 'Vencida',         color: 'error',      hint: 'Sin acceso: venció' },
  suspendida:      { label: 'Suspendida',      color: 'default',    hint: 'Sin acceso: suspendida manualmente' },
  sin_suscripcion: { label: 'Sin suscripción', color: 'default',    hint: 'Negocio legacy sin suscripción' },
};

export const METODOS = [
  ['TRANSFERENCIA', 'Transferencia'], ['YAPE', 'Yape'], ['PLIN', 'Plin'],
  ['EFECTIVO', 'Efectivo'], ['TARJETA', 'Tarjeta'], ['CULQI', 'Culqi'], ['OTRO', 'Otro'],
];

export const CATEGORIAS_GASTO = [
  ['INFRAESTRUCTURA', 'Infraestructura'], ['PASARELA', 'Comisiones de pasarela'],
  ['SERVICIOS', 'Servicios y licencias'], ['PERSONAL', 'Personal'],
  ['MARKETING', 'Marketing'], ['OTRO', 'Otro'],
];

export const ACCIONES = {
  CREACION: 'Creación', ACTIVACION: 'Activación', EXTENSION: 'Extensión',
  SUSPENSION: 'Suspensión', REACTIVACION: 'Reactivación', CAMBIO_PLAN: 'Cambio de plan',
  REVERSION_PAGO: 'Reversión de pago',
};

export const COLOR_ACCION = {
  CREACION: 'blue', ACTIVACION: 'green', EXTENSION: 'cyan', SUSPENSION: 'red',
  REACTIVACION: 'lime', CAMBIO_PLAN: 'purple', REVERSION_PAGO: 'orange',
};

export const diasTexto = (dias) => {
  if (dias === null || dias === undefined) return 'sin vencimiento';
  if (dias < 0) return `venció hace ${Math.abs(dias)} d`;
  if (dias === 0) return 'vence hoy';
  return `${dias} d restantes`;
};
