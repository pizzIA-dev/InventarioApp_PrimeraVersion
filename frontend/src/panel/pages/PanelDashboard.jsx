import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, DatePicker, Empty, Segmented, Skeleton } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { panelAPI, mensajeError } from '../panelApi';
import { ESTADOS, diasTexto, fecha, money } from '../utils';
import EstadoTag from '../components/EstadoTag';

const COLOR_ESTADO = {
  activa: '#0f766e', por_vencer: '#b7791f', sandbox: '#2563eb',
  vencida: '#b42318', suspendida: '#6b7280', sin_suscripcion: '#c4bfb2',
};
const ORDEN_ESTADOS = ['activa', 'por_vencer', 'sandbox', 'vencida', 'suspendida', 'sin_suscripcion'];

const PERIODOS = {
  mes: () => [dayjs().startOf('month'), dayjs()],
  trimestre: () => [dayjs().subtract(2, 'month').startOf('month'), dayjs()],
  anio: () => [dayjs().startOf('year'), dayjs()],
};

function Kpi({ label, pen, usd, tone, accent }) {
  const cls = ['pnl-kpi', accent && 'accent', tone].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <div className="pnl-kpi-label">{label}</div>
      <div className="pnl-kpi-value">{money(pen, 'PEN')}</div>
      {usd !== undefined && <div className="pnl-kpi-alt">{money(usd, 'USD')}</div>}
    </div>
  );
}

export default function PanelDashboard() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState('mes');
  const [rango, setRango] = useState(PERIODOS.mes());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [moneda, setMoneda] = useState('PEN');

  useEffect(() => {
    setError('');
    panelAPI.metricas({ desde: rango[0].format('YYYY-MM-DD'), hasta: rango[1].format('YYYY-MM-DD') })
      .then((r) => setData(r.data))
      .catch((e) => setError(mensajeError(e, 'No se pudieron cargar las métricas.')));
  }, [rango]);

  const cambiarPeriodo = (p) => {
    setPeriodo(p);
    if (PERIODOS[p]) setRango(PERIODOS[p]());
  };

  const serie = (data?.serie_mensual || []).map((f) => ({
    mes: dayjs(`${f.mes}-01`).locale('es').format('MMM YY'),
    Ingresos: Number(f[`ingresos_${moneda}`]),
    Gastos: Number(f[`gastos_${moneda}`]),
  }));
  const balancePen = Number(data?.balance?.PEN || 0);

  return (
    <>
      <div className="pnl-head">
        <div>
          <div className="pnl-eyebrow">Resumen</div>
          <h1 className="pnl-title">Estado de la plataforma</h1>
          <div className="pnl-sub">
            {fecha(rango[0])} — {fecha(rango[1])}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Segmented value={periodo} onChange={cambiarPeriodo} options={[
            { label: 'Este mes', value: 'mes' }, { label: 'Trimestre', value: 'trimestre' },
            { label: 'Este año', value: 'anio' }, { label: 'Rango', value: 'rango' },
          ]} />
          {periodo === 'rango' && (
            <DatePicker.RangePicker value={rango} format="DD/MM/YYYY" allowClear={false}
              onChange={(v) => v && setRango(v)} />
          )}
        </div>
      </div>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 18 }} />}
      {!data && !error && <Skeleton active paragraph={{ rows: 8 }} />}

      {data && (
        <div className="pnl-stack">
          <div className="pnl-kpis">
            <Kpi label="Ingresos del periodo" pen={data.ingresos.PEN} usd={data.ingresos.USD} accent />
            <Kpi label="Gastos del periodo" pen={data.gastos.PEN} usd={data.gastos.USD} />
            <Kpi label="Balance" pen={data.balance.PEN} usd={data.balance.USD}
              tone={balancePen > 0 ? 'pos' : balancePen < 0 ? 'neg' : ''} />
            <div className="pnl-kpi">
              <div className="pnl-kpi-label">MRR estimado</div>
              <div className="pnl-kpi-value">{money(data.mrr.PEN)}</div>
              <div className="pnl-kpi-alt">
                {data.suscripciones_pagantes} pagante(s) · ARPU {money(data.arpu.PEN)}
              </div>
            </div>
          </div>

          <div>
            <div className="pnl-card-title" style={{ marginBottom: 10 }}>
              Empresas · {data.empresas.total} en total
            </div>
            <div className="pnl-states">
              {ORDEN_ESTADOS.map((e) => (
                <button key={e} type="button" className="pnl-state"
                  onClick={() => navigate(`/panel/empresas?estado=${e}`)}>
                  <div className="n">{data.empresas[e]}</div>
                  <div className="l"><span className="pnl-dot" style={{ background: COLOR_ESTADO[e] }} />{ESTADOS[e].label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pnl-grid-2">
            <div className="pnl-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="pnl-card-title" style={{ marginBottom: 0 }}>Ingresos vs. gastos · 12 meses</div>
                <Segmented size="small" value={moneda} onChange={setMoneda} options={['PEN', 'USD']} />
              </div>
              <div style={{ height: 280, marginTop: 14 }}>
                <ResponsiveContainer>
                  <BarChart data={serie} barGap={2}>
                    <CartesianGrid stroke="#ece8de" vertical={false} />
                    <XAxis dataKey="mes" interval={0} tick={{ fontSize: 10.5, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={56} />
                    <Tooltip formatter={(v) => money(v, moneda)} cursor={{ fill: '#f4efe4' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Ingresos" fill="#0f766e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Gastos" fill="#b4532a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="pnl-card">
              <div className="pnl-card-title">Requieren atención</div>
              {data.atencion.length === 0 && (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nada vencido ni por vencer" />
              )}
              {data.atencion.map((e) => (
                <div key={e.id} className="pnl-alert-row">
                  <div>
                    <Link to={`/panel/empresas/${e.id}`}>{e.nombre}</Link>
                    <div style={{ fontSize: 12, color: '#6b7280' }} className="num">
                      {fecha(e.suscripcion?.fecha_fin)} · {diasTexto(e.suscripcion?.dias_restantes)}
                    </div>
                  </div>
                  <EstadoTag estado={e.estado} />
                </div>
              ))}
              <div style={{ marginTop: 16, fontSize: 12.5, color: '#6b7280' }}>
                Recaudado histórico: <span className="num">{money(data.ingresos_historicos.PEN)}</span>
                {' · '}<span className="num">{money(data.ingresos_historicos.USD, 'USD')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
