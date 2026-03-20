from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta, date
from django.db.models import Sum, Count
from apps.inventario.models import Producto, MovimientoStock
from apps.ventas.models import Venta
from apps.compras.models import Compra
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
                'margen_porcentaje': round(margen, 2),
                'estado': 'GANANCIA' if balance > 0 else ('PÉRDIDA' if balance < 0 else 'EQUILIBRIO')
            }
        })


class DashboardView(APIView):
    """Vista principal del dashboard con métricas clave"""
    
    def get(self, request):
        hoy = timezone.now().date()
        inicio_mes = hoy.replace(day=1)
        inicio_semana = hoy - timedelta(days=hoy.weekday())
        
        # MÉTRICAS DE VENTAS
        ventas_mes = Venta.objects.filter(
            estado='CONFIRMADA', creado_en__date__gte=inicio_mes
        )
        total_ventas_mes = sum(v.total for v in ventas_mes)
        
        servicios_mes = VentaServicio.objects.filter(
            estado='TERMINADO', creado_en__date__gte=inicio_mes
        )
        total_servicios_mes = sum(s.total for s in servicios_mes)
        
        # MÉTRICAS DE COMPRAS
        compras_mes = Compra.objects.filter(
            estado='CONFIRMADA', creado_en__date__gte=inicio_mes
        )
        total_compras_mes = sum(c.total for c in compras_mes)
        
        # STOCK
        total_productos = Producto.objects.filter(activo=True).count()
        productos_stock_bajo = Producto.objects.filter(activo=True, stock_actual__lt=10).count()
        valor_stock = sum(p.precio_compra * p.stock_actual for p in Producto.objects.filter(activo=True))
        
        # CLIENTES Y PROVEEDORES
        total_clientes = Cliente.objects.filter(activo=True).count()
        total_proveedores = Proveedor.objects.filter(activo=True).count()
        
        # BALANCE DEL MES
        ingresos_mes = total_ventas_mes + total_servicios_mes
        egresos_mes = total_compras_mes
        balance_mes = ingresos_mes - egresos_mes
        
        return Response({
            'ventas': {
                'total_mes': total_ventas_mes,
                'cantidad_ventas': ventas_mes.count()
            },
            'servicios': {
                'total_mes': total_servicios_mes,
                'cantidad_servicios': servicios_mes.count()
            },
            'compras': {
                'total_mes': total_compras_mes,
                'cantidad_compras': compras_mes.count()
            },
            'inventario': {
                'total_productos': total_productos,
                'productos_stock_bajo': productos_stock_bajo,
                'valor_stock': valor_stock
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
        
        datos_mensuales = []
        
        for mes in range(1, 13):
            inicio_mes = date(int(anio), mes, 1)
            if mes == 12:
                fin_mes = date(int(anio) + 1, 1, 1)
            else:
                fin_mes = date(int(anio), mes + 1, 1)
            
            # Ventas del mes
            ventas = Venta.objects.filter(
                estado='CONFIRMADA',
                creado_en__date__gte=inicio_mes,
                creado_en__date__lt=fin_mes
            )
            total_ventas = sum(v.total for v in ventas)
            
            # Compras del mes
            compras = Compra.objects.filter(
                estado='CONFIRMADA',
                creado_en__date__gte=inicio_mes,
                creado_en__date__lt=fin_mes
            )
            total_compras = sum(c.total for c in compras)
            
            # Servicios del mes
            servicios = VentaServicio.objects.filter(
                estado='TERMINADO',
                creado_en__date__gte=inicio_mes,
                creado_en__date__lt=fin_mes
            )
            total_servicios = sum(s.total for s in servicios)
            
            # Balance
            ingresos = total_ventas + total_servicios
            egresos = total_compras
            balance = ingresos - egresos
            
            datos_mensuales.append({
                'mes': mes,
                'nombre_mes': inicio_mes.strftime('%B'),
                'ventas': total_ventas,
                'compras': total_compras,
                'servicios': total_servicios,
                'ingresos': ingresos,
                'egresos': egresos,
                'balance': balance
            })
        
        return Response({
            'anio': anio,
            'datos': datos_mensuales
        })
