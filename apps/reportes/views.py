from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta, date
from django.db.models import Sum, Count


from apps.ventas.models import Venta, DetalleVenta
from apps.compras.models import Compra, DetalleCompra
from apps.servicios.models import VentaServicio
from apps.transacciones.models import Transaccion
from apps.clientes.models import Cliente
from apps.proveedores.models import Proveedor


class BalanceGeneralView(APIView):
    """Balance general de ingresos y egresos"""
    
    def get(self, request):
        # Rango de fechas (por defecto todo el historial)
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        
        # INGRESOS
        # Ventas de productos
        ventas_query = Venta.objects.filter(estado='CONFIRMADA')
        if fecha_inicio:
            ventas_query = ventas_query.filter(creado_en__date__gte=fecha_inicio)
        if fecha_fin:
            ventas_query = ventas_query.filter(creado_en__date__lte=fecha_fin)
        total_ventas = sum(v.total for v in ventas_query)
        
        # Ventas de servicios
        servicios_query = VentaServicio.objects.filter(estado='TERMINADO')
        if fecha_inicio:
            servicios_query = servicios_query.filter(creado_en__date__gte=fecha_inicio)
        if fecha_fin:
            servicios_query = servicios_query.filter(creado_en__date__lte=fecha_fin)
        total_servicios = sum(s.total for s in servicios_query)
        
        # Ingresos independientes
        ingresos_query = Transaccion.objects.filter(tipo='INGRESO')
        if fecha_inicio:
            ingresos_query = ingresos_query.filter(fecha__date__gte=fecha_inicio)
        if fecha_fin:
            ingresos_query = ingresos_query.filter(fecha__date__lte=fecha_fin)
        total_ingresos_extra = sum(t.monto for t in ingresos_query)
        
        # Total ingresos
        total_ingresos = total_ventas + total_servicios + total_ingresos_extra
        
        # EGRESOS
        # Compras a proveedores
        compras_query = Compra.objects.filter(estado='CONFIRMADA')
        if fecha_inicio:
            compras_query = compras_query.filter(creado_en__date__gte=fecha_inicio)
        if fecha_fin:
            compras_query = compras_query.filter(creado_en__date__lte=fecha_fin)
        total_compras = sum(c.total for c in compras_query)
        
        # Egresos independientes
        egresos_query = Transaccion.objects.filter(tipo='EGRESO')
        if fecha_inicio:
            egresos_query = egresos_query.filter(fecha__date__gte=fecha_inicio)
        if fecha_fin:
            egresos_query = egresos_query.filter(fecha__date__lte=fecha_fin)
        total_egresos_extra = sum(t.monto for t in egresos_query)
        
        # Total egresos
        total_egresos = total_compras + total_egresos_extra
        
        # BALANCE
        balance = total_ingresos - total_egresos
        margen = (balance / total_ingresos * 100) if total_ingresos > 0 else 0
        
        return Response({
            'periodo': {
                'fecha_inicio': fecha_inicio or 'Todo el historial',
                'fecha_fin': fecha_fin or 'Actual'
            },
            'ingresos': {
                'total': total_ingresos,
                'desglose': {
                    'ventas_productos': total_ventas,
                    'ventas_servicios': total_servicios,
                    'ingresos_extra': total_ingresos_extra
                }
            },
            'egresos': {
                'total': total_egresos,
                'desglose': {
                    'compras': total_compras,
                    'egresos_extra': total_egresos_extra
                }
            },
            'balance': {
                'total': balance,
                'margen_porcentaje': round(float(margen), 2),
                'estado': 'GANANCIA' if balance > 0 else ('PÉRDIDA' if balance < 0 else 'EQUILIBRIO')
            }
        })


class DashboardView(APIView):
    """Vista principal del dashboard con métricas clave"""
    
    def get(self, request):
        hoy = timezone.now().date()
        anio = request.query_params.get('anio')
        mes = request.query_params.get('mes')
        producto_id = request.query_params.get('producto_id')
        servicio_id = request.query_params.get('servicio_id')
        
        if anio:
            if mes:
                inicio_periodo = date(int(anio), int(mes), 1)
                if int(mes) == 12:
                    fin_periodo = date(int(anio) + 1, 1, 1)
                else:
                    fin_periodo = date(int(anio), int(mes) + 1, 1)
            else:
                inicio_periodo = date(int(anio), 1, 1)
                fin_periodo = date(int(anio) + 1, 1, 1)
            filtro_fechas = {'creado_en__date__gte': inicio_periodo, 'creado_en__date__lt': fin_periodo}
        else:
            inicio_periodo = hoy.replace(day=1)
            filtro_fechas = {'creado_en__date__gte': inicio_periodo}
        
        # MÉTRICAS DE VENTAS
        if producto_id:
            detalles = DetalleVenta.objects.filter(
                venta__estado='CONFIRMADA', 
                producto_id=producto_id,
                venta__creado_en__date__gte=filtro_fechas.get('creado_en__date__gte')
            )
            if 'creado_en__date__lt' in filtro_fechas:
                detalles = detalles.filter(venta__creado_en__date__lt=filtro_fechas['creado_en__date__lt'])
            
            total_ventas_mes = detalles.aggregate(total=Sum('subtotal'))['total'] or 0
            cantidad_ventas = detalles.values('venta').distinct().count()
        elif servicio_id:
            total_ventas_mes = 0
            cantidad_ventas = 0
        else:
            ventas_mes = Venta.objects.filter(estado='CONFIRMADA', **filtro_fechas)
            total_ventas_mes = sum(v.total for v in ventas_mes)
            cantidad_ventas = ventas_mes.count()
        
        # MÉTRICAS DE SERVICIOS
        if servicio_id:
            servicios_mes = VentaServicio.objects.filter(
                estado='TERMINADO', 
                servicio_id=servicio_id,
                creado_en__date__gte=filtro_fechas.get('creado_en__date__gte')
            )
            if 'creado_en__date__lt' in filtro_fechas:
                servicios_mes = servicios_mes.filter(creado_en__date__lt=filtro_fechas['creado_en__date__lt'])
            total_servicios_mes = sum(s.total for s in servicios_mes)
            cantidad_servicios = servicios_mes.count()
        elif producto_id:
            total_servicios_mes = 0
            cantidad_servicios = 0
        else:
            servicios_mes = VentaServicio.objects.filter(estado='TERMINADO', **filtro_fechas)
            total_servicios_mes = sum(s.total for s in servicios_mes)
            cantidad_servicios = servicios_mes.count()
        
        # MÉTRICAS DE COMPRAS
        if producto_id:
            detalles_c = DetalleCompra.objects.filter(
                compra__estado='CONFIRMADA', 
                producto_id=producto_id,
                compra__creado_en__date__gte=filtro_fechas.get('creado_en__date__gte')
            )
            if 'creado_en__date__lt' in filtro_fechas:
                detalles_c = detalles_c.filter(compra__creado_en__date__lt=filtro_fechas['creado_en__date__lt'])
            
            total_compras_mes = detalles_c.aggregate(total=Sum('subtotal'))['total'] or 0
            cantidad_compras = detalles_c.values('compra').distinct().count()
        elif servicio_id:
            total_compras_mes = 0
            cantidad_compras = 0
        else:
            compras_mes = Compra.objects.filter(estado='CONFIRMADA', **filtro_fechas)
            total_compras_mes = sum(c.total for c in compras_mes)
            cantidad_compras = compras_mes.count()
        
        # CLIENTES Y PROVEEDORES
        total_clientes = Cliente.objects.filter(activo=True).count()
        total_proveedores = Proveedor.objects.filter(activo=True).count()
        
        # INGRESOS Y EGRESOS EXTRAORDINARIOS
        if producto_id or servicio_id:
            total_ingresos_extra = 0
            total_egresos_extra = 0
        else:
            filtro_transacciones = {}
            if 'creado_en__date__gte' in filtro_fechas:
                filtro_transacciones['fecha__date__gte'] = filtro_fechas['creado_en__date__gte']
            if 'creado_en__date__lt' in filtro_fechas:
                filtro_transacciones['fecha__date__lt'] = filtro_fechas['creado_en__date__lt']
            
            ingresos_extra_query = Transaccion.objects.filter(tipo='INGRESO', **filtro_transacciones)
            total_ingresos_extra = sum(t.monto for t in ingresos_extra_query)
            
            egresos_extra_query = Transaccion.objects.filter(tipo='EGRESO', **filtro_transacciones)
            total_egresos_extra = sum(t.monto for t in egresos_extra_query)
        
        # BALANCE DEL PERIODO
        ingresos_mes = total_ventas_mes + total_servicios_mes + total_ingresos_extra
        egresos_mes = total_compras_mes + total_egresos_extra
        balance_mes = ingresos_mes - egresos_mes
        
        return Response({
            'ventas': {
                'total_mes': total_ventas_mes,
                'cantidad_ventas': cantidad_ventas
            },
            'servicios': {
                'total_mes': total_servicios_mes,
                'cantidad_servicios': cantidad_servicios
            },
            'compras': {
                'total_mes': total_compras_mes,
                'cantidad_compras': cantidad_compras
            },
            'clientes': {
                'total': total_clientes
            },
            'proveedores': {
                'total': total_proveedores
            },
            'balance': {
                'ingresos_mes': ingresos_mes,
                'egresos_mes': egresos_mes,
                'balance_mes': balance_mes,
                'estado': 'GANANCIA' if balance_mes > 0 else ('PÉRDIDA' if balance_mes < 0 else 'EQUILIBRIO')
            }
        })


class ReporteMensualView(APIView):
    """Reporte mensual de ventas y compras"""
    
    def get(self, request):
        anio = request.query_params.get('anio', timezone.now().year)
        producto_id = request.query_params.get('producto_id')
        servicio_id = request.query_params.get('servicio_id')
        
        MESES_ES = {
            1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
            5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
            9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
        }
        
        datos_mensuales = []
        
        for mes in range(1, 13):
            inicio_mes = date(int(anio), mes, 1)
            if mes == 12:
                fin_mes = date(int(anio) + 1, 1, 1)
            else:
                fin_mes = date(int(anio), mes + 1, 1)
            
            # Ventas del mes
            if producto_id:
                detalles = DetalleVenta.objects.filter(
                    venta__estado='CONFIRMADA', 
                    producto_id=producto_id,
                    venta__creado_en__date__gte=inicio_mes,
                    venta__creado_en__date__lt=fin_mes
                )
                total_ventas = detalles.aggregate(total=Sum('subtotal'))['total'] or 0
            elif servicio_id:
                total_ventas = 0
            else:
                ventas = Venta.objects.filter(
                    estado='CONFIRMADA',
                    creado_en__date__gte=inicio_mes,
                    creado_en__date__lt=fin_mes
                )
                total_ventas = sum(v.total for v in ventas)
            
            # Compras del mes
            if producto_id:
                detalles_c = DetalleCompra.objects.filter(
                    compra__estado='CONFIRMADA', 
                    producto_id=producto_id,
                    compra__creado_en__date__gte=inicio_mes,
                    compra__creado_en__date__lt=fin_mes
                )
                total_compras = detalles_c.aggregate(total=Sum('subtotal'))['total'] or 0
            elif servicio_id:
                total_compras = 0
            else:
                compras = Compra.objects.filter(
                    estado='CONFIRMADA',
                    creado_en__date__gte=inicio_mes,
                    creado_en__date__lt=fin_mes
                )
                total_compras = sum(c.total for c in compras)
            
            # Servicios del mes
            if servicio_id:
                servicios = VentaServicio.objects.filter(
                    estado='TERMINADO',
                    servicio_id=servicio_id,
                    creado_en__date__gte=inicio_mes,
                    creado_en__date__lt=fin_mes
                )
                total_servicios = sum(s.total for s in servicios)
            elif producto_id:
                total_servicios = 0
            else:
                servicios = VentaServicio.objects.filter(
                    estado='TERMINADO',
                    creado_en__date__gte=inicio_mes,
                    creado_en__date__lt=fin_mes
                )
                total_servicios = sum(s.total for s in servicios)
            
            # Ingresos y Egresos Extraordinarios (Módulo Transacciones)
            ingresos_extra = Transaccion.objects.filter(
                tipo='INGRESO',
                fecha__date__gte=inicio_mes,
                fecha__date__lt=fin_mes
            )
            total_ingresos_extra = sum(t.monto for t in ingresos_extra)

            egresos_extra_qs = Transaccion.objects.filter(
                tipo='EGRESO',
                fecha__date__gte=inicio_mes,
                fecha__date__lt=fin_mes
            )
            total_egresos_extra = sum(t.monto for t in egresos_extra_qs)
            
            # Balance
            ingresos = total_ventas + total_servicios + total_ingresos_extra
            egresos = total_compras + total_egresos_extra
            balance = ingresos - egresos
            
            datos_mensuales.append({
                'mes': mes,
                'nombre_mes': MESES_ES[mes],
                'ventas': total_ventas,
                'compras': total_compras,
                'servicios': total_servicios,
                'ingresos_extra': total_ingresos_extra,
                'egresos_extra': total_egresos_extra,
                'ingresos': ingresos,
                'egresos': egresos,
                'balance': balance
            })
        
        return Response({
            'anio': anio,
            'datos': datos_mensuales
        })
