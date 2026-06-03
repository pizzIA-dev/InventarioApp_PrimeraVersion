from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta, date
from django.db.models import Sum, Count
from apps.core.export_utils import create_multi_sheet_excel_response


from apps.ventas.models import Venta, DetalleVenta
from apps.compras.models import Compra, DetalleCompra
from apps.servicios.models import VentaServicio, Servicio
from apps.transacciones.models import Transaccion
from apps.clientes.models import Cliente
from apps.proveedores.models import Proveedor
from apps.inventario.models import Producto


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
        
        # ANALÍTICAS
        # Top 10 Productos
        filtro_ventas = {'venta__estado': 'CONFIRMADA'}
        if fecha_inicio:
            filtro_ventas['venta__creado_en__date__gte'] = fecha_inicio
        if fecha_fin:
            filtro_ventas['venta__creado_en__date__lte'] = fecha_fin
            
        top_productos = list(DetalleVenta.objects.filter(**filtro_ventas)
            .values('producto_id', 'producto__nombre', 'producto__unidad_medida')
            .annotate(cantidad=Sum('cantidad'))
            .order_by('-cantidad')[:10]
        )
        
        top_productos_ingresos = list(DetalleVenta.objects.filter(**filtro_ventas)
            .values('producto_id', 'producto__nombre', 'producto__unidad_medida')
            .annotate(ingresos=Sum('subtotal'))
            .order_by('-ingresos')[:10]
        )
        
        # Productos sin rotación
        vendidos_ids = DetalleVenta.objects.filter(**filtro_ventas).values_list('producto_id', flat=True)
        sin_rotacion_prod = list(Producto.objects.filter(activo=True)
            .exclude(id__in=vendidos_ids)
            .values('nombre', 'stock_actual', 'unidad_medida')
            .order_by('nombre')
        )
        
        # Top 10 Servicios
        filtro_servicios = {'estado': 'TERMINADO'}
        if fecha_inicio:
            filtro_servicios['creado_en__date__gte'] = fecha_inicio
        if fecha_fin:
            filtro_servicios['creado_en__date__lte'] = fecha_fin
            
        top_servicios = list(VentaServicio.objects.filter(**filtro_servicios)
            .values('servicio_id', 'servicio__nombre')
            .annotate(cantidad=Count('id'))
            .order_by('-cantidad')[:10]
        )
        
        top_servicios_ingresos = list(VentaServicio.objects.filter(**filtro_servicios)
            .values('servicio_id', 'servicio__nombre')
            .annotate(ingresos=Sum('total'))
            .order_by('-ingresos')[:10]
        )
        
        # Top 10 Productos Más Comprados / Mayor Gasto
        filtro_compras = {'compra__estado': 'CONFIRMADA'}
        if fecha_inicio:
            filtro_compras['compra__creado_en__date__gte'] = fecha_inicio
        if fecha_fin:
            filtro_compras['compra__creado_en__date__lte'] = fecha_fin
            
        top_productos_comprados = list(DetalleCompra.objects.filter(**filtro_compras)
            .values('producto_id', 'producto__nombre', 'producto__unidad_medida')
            .annotate(cantidad=Sum('cantidad'))
            .order_by('-cantidad')[:10]
        )
        
        top_productos_gastos = list(DetalleCompra.objects.filter(**filtro_compras)
            .values('producto_id', 'producto__nombre', 'producto__unidad_medida')
            .annotate(egresos=Sum('subtotal'))
            .order_by('-egresos')[:10]
        )
        
        # Servicios sin rotación
        vendidos_serv_ids = VentaServicio.objects.filter(**filtro_servicios).values_list('servicio_id', flat=True)
        sin_rotacion_serv = list(Servicio.objects.filter(activo=True)
            .exclude(id__in=vendidos_serv_ids)
            .values('nombre')
            .order_by('nombre')
        )
        
        # Top 5 Ingresos No Operativos
        filtro_transacciones = {}
        if fecha_inicio:
            filtro_transacciones['fecha__date__gte'] = fecha_inicio
        if fecha_fin:
            filtro_transacciones['fecha__date__lte'] = fecha_fin

        top_ingresos_extra = list(Transaccion.objects.filter(tipo='INGRESO', **filtro_transacciones)
            .values('categoria__nombre')
            .annotate(total=Sum('monto'))
            .order_by('-total')[:5]
        )
        
        # Top 5 Gastos
        top_gastos = list(Transaccion.objects.filter(tipo='EGRESO', **filtro_transacciones)
            .values('categoria__nombre')
            .annotate(total=Sum('monto'))
            .order_by('-total')[:5]
        )
        
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
            },
            'analiticas': {
                'top_productos': top_productos,
                'top_productos_ingresos': top_productos_ingresos,
                'top_servicios': top_servicios,
                'top_servicios_ingresos': top_servicios_ingresos,
                'top_productos_comprados': top_productos_comprados,
                'top_productos_gastos': top_productos_gastos,
                'top_ingresos_extra': top_ingresos_extra,
                'top_gastos': top_gastos,
                'productos_sin_rotacion': sin_rotacion_prod,
                'servicios_sin_rotacion': sin_rotacion_serv
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
        if producto_id:
            clientes_ids = Venta.objects.filter(
                estado='CONFIRMADA', 
                detalleventa_set__producto_id=producto_id,
                **filtro_fechas
            ).values_list('cliente_id', flat=True).distinct()
            total_clientes = clientes_ids.count()
            
            proveedores_ids = Compra.objects.filter(
                estado='CONFIRMADA',
                detallecompra__producto_id=producto_id,
                **filtro_fechas
            ).values_list('proveedor_id', flat=True).distinct()
            total_proveedores = proveedores_ids.count()
            
        elif servicio_id:
            clientes_ids = VentaServicio.objects.filter(
                estado='TERMINADO',
                servicio_id=servicio_id,
                **filtro_fechas
            ).values_list('cliente_id', flat=True).distinct()
            total_clientes = clientes_ids.count()
            total_proveedores = 0
            
        else:
            # Clientes con ventas o servicios en el periodo
            clientes_v = set(Venta.objects.filter(estado='CONFIRMADA', **filtro_fechas).values_list('cliente_id', flat=True))
            clientes_s = set(VentaServicio.objects.filter(estado='TERMINADO', **filtro_fechas).values_list('cliente_id', flat=True))
            # Eliminar None si existe (por seguridad)
            total_clientes = len({c for c in (clientes_v | clientes_s) if c is not None})
            
            total_proveedores = Compra.objects.filter(estado='CONFIRMADA', **filtro_fechas).values('proveedor_id').distinct().count()
        
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

class ReporteMensualDetalleExportView(APIView):
    """Exportar el detalle mensual del Dashboard a un Excel Multi-Hoja"""
    def get(self, request):
        anio = int(request.query_params.get('anio', timezone.now().year))
        mes = int(request.query_params.get('mes', timezone.now().month))

        MESES_ES = {
            1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
            5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
            9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
        }
        
        inicio_mes = date(anio, mes, 1)
        if mes == 12:
            fin_mes = date(anio + 1, 1, 1)
        else:
            fin_mes = date(anio, mes + 1, 1)
            
        period_label = f"{MESES_ES.get(mes, '')} {anio}"

        # 1. Venta de Productos
        detalles_v = DetalleVenta.objects.filter(
            venta__estado='CONFIRMADA',
            venta__creado_en__date__gte=inicio_mes,
            venta__creado_en__date__lt=fin_mes
        ).select_related('producto', 'venta', 'venta__cliente', 'venta__usuario').order_by('venta__creado_en')
        
        headers_vp = [
            'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente', 'Producto',
            'Código', 'Cant.', 'P. Unit. (S/.)', 'Subtotal (S/.)', 'Desc. (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable'
        ]
        
        rows_vp = []
        for d in detalles_v:
            v = d.venta
            comp_cliente = v.cliente_nombre or (v.cliente.nombre if v.cliente else 'Cliente General')
            tipo_legal = v.tipo_comprobante if v.tipo_comprobante and v.tipo_comprobante != 'SIMPLE' else ""
            num_legal = v.numero_comprobante if tipo_legal else ""
            
            rows_vp.append([
                timezone.localtime(v.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE",
                v.numero_comprobante_simple or "",
                tipo_legal,
                num_legal,
                comp_cliente,
                d.producto.nombre,
                d.producto.codigo,
                float(d.cantidad),
                float(d.precio_venta),
                float(d.cantidad) * float(d.precio_venta),
                float(d.descuento),
                float(v.impuesto),
                (float(d.cantidad) * float(d.precio_venta)) - float(d.descuento) + float(v.impuesto),
                f"{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})" if v.usuario else "Sistema"
            ])

        # 2. Venta de Servicios
        ventas_s = VentaServicio.objects.filter(
            estado='TERMINADO',
            creado_en__date__gte=inicio_mes,
            creado_en__date__lt=fin_mes
        ).select_related('servicio', 'cliente', 'usuario').order_by('creado_en')
        
        headers_vs = [
            'Fecha', 'Tipo Comprobante Simple', 'Comprobante Simple',
            'Tipo Comprobante', 'Comprobante', 'Cliente', 'Servicio',
            'Precio Serv. (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable'
        ]
        
        rows_vs = []
        for v in ventas_s:
            comp_cliente = v.cliente_nombre or (v.cliente.nombre if v.cliente else 'Cliente General')
            tipo_legal = v.tipo_comprobante if v.tipo_comprobante and v.tipo_comprobante != 'SIMPLE' else ""
            num_legal = v.numero_comprobante if tipo_legal else ""
            
            rows_vs.append([
                timezone.localtime(v.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                "COMPROBANTE SIMPLE",
                v.numero_comprobante_simple or "",
                tipo_legal,
                num_legal,
                comp_cliente,
                v.servicio.nombre if v.servicio else "No especificado",
                float(v.precio),
                float(v.descuento),
                float(v.impuesto),
                float(v.total),
                f"{v.usuario.get_full_name() or v.usuario.username} ({v.usuario.perfil.get_rol_display() if hasattr(v.usuario, 'perfil') else '-'})" if v.usuario else "Sistema"
            ])

        # 3. Ingresos no Operativos
        ingresos_extra = Transaccion.objects.filter(
            tipo='INGRESO',
            fecha__date__gte=inicio_mes,
            fecha__date__lt=fin_mes
        ).select_related('categoria').order_by('fecha')
        
        headers_ingresos = ['ID', 'Fecha de Creación', 'Nombre del Ingreso', 'Descripción', 'Monto (S/.)', 'Método de Pago', 'Responsable']
        rows_ingresos = []
        for t in ingresos_extra:
            rows_ingresos.append([
                t.id,
                t.creado_en.strftime("%d/%m/%Y %H:%M:%S") if t.creado_en else '',
                t.categoria.nombre if t.categoria else '-',
                t.descripcion or '',
                float(t.monto),
                t.get_metodo_pago_display(),
                f"{t.usuario.get_full_name() or t.usuario.username} ({t.usuario.perfil.get_rol_display() if hasattr(t.usuario, 'perfil') else '-'})" if hasattr(t, 'usuario') and t.usuario else "Sistema"
            ])

        # 4. Compras
        detalles_c = DetalleCompra.objects.filter(
            compra__estado='CONFIRMADA',
            compra__creado_en__date__gte=inicio_mes,
            compra__creado_en__date__lt=fin_mes
        ).select_related('producto', 'compra', 'compra__proveedor').order_by('compra__creado_en')
        
        headers_compras = ['Fecha', 'Tipo de comprobante', 'Comprobante', 'Proveedor', 'Producto', 'Código de Producto', 'Cantidad', 'Precio de compra (S/.)', 'Descuento (S/.)', 'Impuesto (S/.)', 'Total (S/.)', 'Responsable']
        rows_compras = []
        for d in detalles_c:
            c = d.compra
            comp_prov = c.proveedor_nombre or (c.proveedor.nombre if c.proveedor else 'Sin Proveedor')
            comp_num = c.numero_comprobante or ''
            comp_impuesto = float(c.impuesto or 0)
            rows_compras.append([
                timezone.localtime(c.creado_en).strftime("%d/%m/%Y %H:%M:%S"),
                c.tipo_comprobante or '',
                comp_num,
                comp_prov,
                d.producto.nombre,
                d.producto.codigo,
                float(d.cantidad),
                float(d.precio_compra),
                float(d.descuento),
                comp_impuesto,
                (float(d.cantidad) * float(d.precio_compra)) - float(d.descuento) + comp_impuesto,
                f"{c.usuario.get_full_name() or c.usuario.username} ({c.usuario.perfil.get_rol_display() if hasattr(c.usuario, 'perfil') else '-'})" if hasattr(c, 'usuario') and c.usuario else "Sistema"
            ])

        # 5. Gastos
        egresos_extra = Transaccion.objects.filter(
            tipo='EGRESO',
            fecha__date__gte=inicio_mes,
            fecha__date__lt=fin_mes
        ).select_related('categoria').order_by('fecha')
        
        headers_gastos = ['ID', 'Fecha de Creación', 'Nombre del Gasto', 'Descripción', 'Monto (S/.)', 'Método de Pago', 'Responsable']
        rows_gastos = []
        for t in egresos_extra:
            rows_gastos.append([
                t.id,
                t.creado_en.strftime("%d/%m/%Y %H:%M:%S") if t.creado_en else '',
                t.categoria.nombre if t.categoria else '-',
                t.descripcion or '',
                float(t.monto),
                t.get_metodo_pago_display(),
                f"{t.usuario.get_full_name() or t.usuario.username} ({t.usuario.perfil.get_rol_display() if hasattr(t.usuario, 'perfil') else '-'})" if hasattr(t, 'usuario') and t.usuario else "Sistema"
            ])

        # Variables Auxiliares para rotación
        vendidos_prod_ids = set()
        for d in detalles_v:
            vendidos_prod_ids.add(d.producto_id)
            
        vendidos_serv_ids = set()
        for v in ventas_s:
            if v.servicio_id:
                vendidos_serv_ids.add(v.servicio_id)

        # 6. Productos sin rotación
        prods_sin_rotacion = Producto.objects.filter(activo=True).exclude(id__in=vendidos_prod_ids).order_by('nombre')
        headers_sr_prod = ['Producto', 'Código', 'Categoría', 'Stock Actual']
        rows_sr_prod = [[p.nombre, p.codigo, p.categoria.nombre if p.categoria else '-', f"{float(p.stock_actual)} {p.unidad_medida or ''}".strip()] for p in prods_sin_rotacion]

        # 7. Servicios sin rotación
        servs_sin_rotacion = Servicio.objects.filter(activo=True).exclude(id__in=vendidos_serv_ids).order_by('nombre')
        headers_sr_serv = ['Servicio', 'Categoría', 'Precio Base (S/.)']
        rows_sr_serv = [[s.nombre, s.categoria.nombre if s.categoria else '-', float(s.precio_base)] for s in servs_sin_rotacion]

        # 8 & 10. Productos: Más Vendidos (cant) y Mayor Recaudación (dinero)
        prod_aggs = DetalleVenta.objects.filter(
            venta__estado='CONFIRMADA', venta__creado_en__date__gte=inicio_mes, venta__creado_en__date__lt=fin_mes
        ).values('producto__nombre', 'producto__unidad_medida').annotate(cant=Sum('cantidad'), sub=Sum('subtotal'))
        
        prods_cant = sorted(prod_aggs, key=lambda x: x['cant'], reverse=True)
        prods_rec = sorted(prod_aggs, key=lambda x: x['sub'], reverse=True)
        
        headers_tmv_prod = ['Nombre Producto', 'Cantidad Vendida']
        rows_tmv_prod = [[p['producto__nombre'], f"{float(p['cant'])} {p['producto__unidad_medida'] or ''}".strip()] for p in prods_cant]
        
        headers_tmr_prod = ['Nombre Producto', 'Dinero Recolectado (S/.)']
        rows_tmr_prod = [[p['producto__nombre'], float(p['sub'])] for p in prods_rec]

        # 9 & 11. Servicios: Más Vendidos y Mayor Recaudación
        serv_aggs = VentaServicio.objects.filter(
            estado='TERMINADO', creado_en__date__gte=inicio_mes, creado_en__date__lt=fin_mes
        ).values('servicio__nombre').annotate(cant=Count('id'), tot=Sum('total'))
        
        servs_cant = sorted(serv_aggs, key=lambda x: x['cant'], reverse=True)
        servs_rec = sorted(serv_aggs, key=lambda x: x['tot'], reverse=True)
        
        headers_tmv_serv = ['Nombre Servicio', 'Cantidad Vendida']
        rows_tmv_serv = [[s['servicio__nombre'] or 'No especificado', s['cant']] for s in servs_cant]
        
        headers_tmr_serv = ['Nombre Servicio', 'Dinero Recolectado (S/.)']
        rows_tmr_serv = [[s['servicio__nombre'] or 'No especificado', float(s['tot'])] for s in servs_rec]

        # 12 & 13. Compras: Más Comprados (cant) y Mayor Gasto (dinero)
        comp_aggs = DetalleCompra.objects.filter(
            compra__estado='CONFIRMADA', compra__creado_en__date__gte=inicio_mes, compra__creado_en__date__lt=fin_mes
        ).values('producto__nombre', 'producto__unidad_medida').annotate(cant=Sum('cantidad'), sub=Sum('subtotal'))
        
        comps_cant = sorted(comp_aggs, key=lambda x: x['cant'], reverse=True)
        comps_gast = sorted(comp_aggs, key=lambda x: x['sub'], reverse=True)
        
        headers_tmc_prod = ['Nombre Producto', 'Unidades Compradas']
        rows_tmc_prod = [[p['producto__nombre'], f"{float(p['cant'])} {p['producto__unidad_medida'] or ''}".strip()] for p in comps_cant]
        
        headers_tmg_prod = ['Nombre Producto', 'Dinero Gastado (S/.)']
        rows_tmg_prod = [[p['producto__nombre'], float(p['sub'])] for p in comps_gast]

        # Estructura Multi-hoja
        sheets = [
            {'sheet_name': 'Venta de Productos', 'headers': headers_vp, 'rows': rows_vp, 'title': f'Detalle de Ventas de Productos - {period_label}', 'period_label': period_label},
            {'sheet_name': 'Venta de Servicios', 'headers': headers_vs, 'rows': rows_vs, 'title': f'Detalle de Ventas de Servicios - {period_label}', 'period_label': period_label},
            {'sheet_name': 'Ingresos no Operativos', 'headers': headers_ingresos, 'rows': rows_ingresos, 'title': f'Ingresos no Operativos - {period_label}', 'period_label': period_label},
            {'sheet_name': 'Compras', 'headers': headers_compras, 'rows': rows_compras, 'title': f'Detalle de Compras - {period_label}', 'period_label': period_label},
            {'sheet_name': 'Gastos', 'headers': headers_gastos, 'rows': rows_gastos, 'title': f'Gastos No Operativos - {period_label}', 'period_label': period_label},
            {'sheet_name': 'Productos Sin Rotación', 'headers': headers_sr_prod, 'rows': rows_sr_prod, 'title': f'Productos Sin Salida en {period_label}', 'period_label': period_label},
            {'sheet_name': 'Servicios Sin Rotación', 'headers': headers_sr_serv, 'rows': rows_sr_serv, 'title': f'Servicios No Vendidos en {period_label}', 'period_label': period_label},
            {'sheet_name': 'Productos Más Vendidos', 'headers': headers_tmv_prod, 'rows': rows_tmv_prod, 'title': f'Productos Más Vendidos (Cant) - {period_label}', 'period_label': period_label},
            {'sheet_name': 'Servicios Más Vendidos', 'headers': headers_tmv_serv, 'rows': rows_tmv_serv, 'title': f'Servicios Más Vendidos (Cant) - {period_label}', 'period_label': period_label},
            {'sheet_name': 'Productos (Mayor Recaud)', 'headers': headers_tmr_prod, 'rows': rows_tmr_prod, 'title': f'Productos con Mayor Recaudación - {period_label}', 'period_label': period_label},
            {'sheet_name': 'Servicios (Mayor Recaud)', 'headers': headers_tmr_serv, 'rows': rows_tmr_serv, 'title': f'Servicios con Mayor Recaudación - {period_label}', 'period_label': period_label},
            {'sheet_name': 'Productos Más Comprados', 'headers': headers_tmc_prod, 'rows': rows_tmc_prod, 'title': f'Productos Más Comprados (Cant) - {period_label}', 'period_label': period_label},
            {'sheet_name': 'Productos (Mayor Gasto)', 'headers': headers_tmg_prod, 'rows': rows_tmg_prod, 'title': f'Productos con Mayor Gasto - {period_label}', 'period_label': period_label},
        ]

        # Validar largo máximo de nombre de hoja (Excel limite de 31 caracteres)
        for s in sheets:
            if len(s['sheet_name']) > 31:
                s['sheet_name'] = s['sheet_name'][:31]

        return create_multi_sheet_excel_response(
            filename=f'reporte_detalle_{anio}_{mes:02d}.xlsx',
            sheets_data=sheets
        )
