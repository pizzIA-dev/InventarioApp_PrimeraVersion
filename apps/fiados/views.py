from django.http import HttpResponse
from django.utils import timezone
from decimal import Decimal, InvalidOperation
from rest_framework import viewsets, status
from apps.core.export_utils import create_excel_response, get_period_range, get_period_label
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ClienteFiado, Fiado, HistorialFiado
from .serializers import ClienteFiadoSerializer, FiadoSerializer, FiadoCreateSerializer

class ClienteFiadoViewSet(viewsets.ModelViewSet):
    queryset = ClienteFiado.objects.all()
    serializer_class = ClienteFiadoSerializer

    def get_queryset(self):
        queryset = self.queryset
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            queryset = queryset.filter(empresa_id=empresa_id)
        return queryset

    def perform_create(self, serializer):
        # Si viene empresa en la data, usarla, si no usar la de los params
        empresa_id = self.request.data.get('empresa') or self.request.query_params.get('empresa')
        if empresa_id:
            serializer.save(empresa_id=empresa_id)
        else:
            serializer.save()

    def list(self, request, *args, **kwargs):
        """Sobrescribir listado para incluir la fecha límite más próxima de sus fiados"""
        from django.db.models import Min, Q
        
        queryset = self.get_queryset()
        # Agregar anotación de la fecha límite mínima de fiados no liquidados
        queryset = queryset.annotate(
            proxima_fecha_limite=Min(
                'fiados__fecha_limite',
                filter=Q(fiados__estado__in=['PENDIENTE', 'PAGADO_PARCIAL']) & Q(fiados__fecha_limite__isnull=False)
            )
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            data = []
            for c in page:
                d = self.get_serializer(c).data
                d['proxima_fecha_limite'] = c.proxima_fecha_limite.isoformat() if hasattr(c, 'proxima_fecha_limite') and c.proxima_fecha_limite else None
                data.append(d)
            return self.get_paginated_response(data)
            
        data = []
        for c in queryset:
            d = self.get_serializer(c).data
            d['proxima_fecha_limite'] = c.proxima_fecha_limite.isoformat() if hasattr(c, 'proxima_fecha_limite') and c.proxima_fecha_limite else None
            data.append(d)
            
        return Response(data)

    # Soft delete
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Verificar si tiene fiados pendientes
        if instance.fiados.filter(estado__in=['PENDIENTE', 'PAGADO_PARCIAL']).exists():
            return Response(
                {"error": "No se puede eliminar un cliente con fiados pendientes."},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Si tiene operaciones antiguas, solo desactivar
        if instance.fiados.exists():
            instance.activo = False
            instance.save()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        """Retorna todo el historial de movimientos de todos los fiados del cliente"""
        cliente = self.get_object()
        historial = HistorialFiado.objects.filter(fiado__cliente=cliente).order_by('-fecha')
        
        # Filtros de fecha
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_desde:
            historial = historial.filter(fecha__date__gte=fecha_desde)
        if fecha_hasta:
            historial = historial.filter(fecha__date__lte=fecha_hasta)

        # Paginación manual simple
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 15))
        total_count = historial.count()
        
        start = (page - 1) * page_size
        end = start + page_size
        paged_historial = historial[start:end]
        
        data = []
        for h in paged_historial:
            data.append({
                "id": h.id,
                "fiado_id": h.fiado.id,
                "fiado_tipo": h.fiado.tipo,
                "fecha": h.fecha.isoformat(),
                "total_deuda": str(h.total_deuda),
                "abono": str(h.abono),
                "saldo_restante": str(h.saldo_restante),
                "fecha_limite": h.fiado.fecha_limite.isoformat() if h.fiado.fecha_limite else None,
                "estado_nuevo": h.estado_nuevo,
                "notas": h.notas
            })
            
        return Response({
            "count": total_count,
            "results": data,
            "page": page,
            "page_size": page_size
        })

    @action(detail=True, methods=['get'])
    def exportar_historial(self, request, pk=None):
        """Exporta el historial de movimientos de un cliente a Excel usando el formato estándar"""
        cliente = self.get_object()
        historial = HistorialFiado.objects.filter(fiado__cliente=cliente).order_by('-fecha')

        headers = [
            'ID Fiado', 'Tipo Operación', 'Fecha Movimiento', 'Fecha Límite',
            'Total Deuda (S/.)', 'Abono Realizado (S/.)', 'Saldo Pendiente (S/.)', 
            'Estado', 'Notas'
        ]
        
        rows = []
        for h in historial:
            rows.append([
                f"#{h.fiado.id}",
                h.fiado.get_tipo_display(),
                h.fecha.strftime("%d/%m/%Y %H:%M:%S") if h.fecha else '',
                h.fiado.fecha_limite.strftime("%d/%m/%Y") if h.fiado.fecha_limite else '-',
                float(h.total_deuda),
                float(h.abono),
                float(h.saldo_restante),
                h.estado_nuevo,
                h.notes or ''
            ])

        return create_excel_response(
            filename=f"kardex_cliente_{cliente.documento or cliente.id}.xlsx",
            sheet_name="Kardex Global",
            headers=headers,
            rows=rows,
            title=f"Kardex Global de Cliente: {cliente.nombre} (DNI: {cliente.documento or 'S/D'})",
            period_label="Historial Completo"
        )


class FiadoViewSet(viewsets.ModelViewSet):
    queryset = Fiado.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return FiadoCreateSerializer
        return FiadoSerializer

    def get_queryset(self):
        queryset = self.queryset
        empresa_id = self.request.query_params.get('empresa')
        tipo = self.request.query_params.get('tipo')
        estado = self.request.query_params.get('estado')
        cliente = self.request.query_params.get('cliente')

        if empresa_id:
            queryset = queryset.filter(empresa_id=empresa_id)
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        if estado:
            queryset = queryset.filter(estado=estado)
        if cliente:
            queryset = queryset.filter(cliente_id=cliente)

        return queryset

    def perform_create(self, serializer):
        # Intentar obtener empresa de la data, o de los params, o del cliente
        empresa_id = self.request.data.get('empresa') or self.request.query_params.get('empresa')
        
        if not empresa_id:
            # Buscar la empresa del cliente seleccionado
            cliente_id = self.request.data.get('cliente')
            if cliente_id:
                try:
                    cliente = ClienteFiado.objects.get(id=cliente_id)
                    empresa_id = cliente.empresa_id
                except ClienteFiado.DoesNotExist:
                    pass
        
        if empresa_id:
            serializer.save(empresa_id=empresa_id)
        else:
            serializer.save()
        
    @action(detail=True, methods=['post'])
    def abonar(self, request, pk=None):
        """Registra un pago parcial o total en el fiado"""
        fiado = self.get_object()
        
        try:
            monto = Decimal(str(request.data.get('monto', 0)))
            notas = request.data.get('notas', '')
        except (ValueError, InvalidOperation):
            return Response({"error": "El monto debe ser un valor numérico válido"}, status=status.HTTP_400_BAD_REQUEST)
            
        if monto <= 0:
            return Response({"error": "El abono debe ser mayor a 0"}, status=status.HTTP_400_BAD_REQUEST)
            
        if monto > fiado.saldo_pendiente:
            return Response({"error": "El abono no puede superar el saldo pendiente"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Aplicar el abono
        fiado.saldo_pendiente -= monto
        
        # Guardar (el save ya calculará el estado automáticamente)
        fiado.save()
        
        # Registrar en el historial unificado (Abono + Estado)
        HistorialFiado.objects.create(
            fiado=fiado,
            total_deuda=fiado.total,
            abono=monto,
            saldo_restante=fiado.saldo_pendiente,
            estado_nuevo=fiado.estado,
            notas=notas or f"Abono de S/ {monto:.2f} registrado. Estado: {fiado.get_estado_display()}."
        )
        
        return Response(FiadoSerializer(fiado).data)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela el fiado y revierte el stock retirado de productos"""
        fiado = self.get_object()
        
        if fiado.estado == 'CANCELADO':
            return Response({"error": "El fiado ya se encuentra cancelado."}, status=status.HTTP_400_BAD_REQUEST)
            
        if fiado.venta_ref or fiado.venta_servicio_ref:
            return Response({"error": "No se puede cancelar un fiado que ya fue formalizado en Venta."}, status=status.HTTP_400_BAD_REQUEST)
            
        fiado.estado = 'CANCELADO'
        fiado.save()
        
        # Devolver stock
        fiado.revertir_stock()
        
        HistorialFiado.objects.create(
            fiado=fiado,
            total_deuda=fiado.total,
            abono=0,
            saldo_restante=fiado.saldo_pendiente,
            estado_nuevo='CANCELADO',
            notas="Fiado CANCELADO manualmente. Stock revertido."
        )
        
        return Response(FiadoSerializer(fiado).data)

    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        """Retorna el historial de movimientos de un fiado específico"""
        fiado = self.get_object()
        historial = fiado.historial.all().order_by('-fecha')
        
        # Filtros de fecha
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_desde:
            historial = historial.filter(fecha__date__gte=fecha_desde)
        if fecha_hasta:
            historial = historial.filter(fecha__date__lte=fecha_hasta)

        # Paginación
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 15))
        total_count = historial.count()

        start = (page - 1) * page_size
        end = start + page_size
        paged_historial = historial[start:end]
        
        data = []
        for h in paged_historial:
            data.append({
                "id": h.id,
                "fecha": h.fecha.isoformat(),
                "total_deuda": str(h.total_deuda),
                "abono": str(h.abono),
                "saldo_restante": str(h.saldo_restante),
                "fecha_limite": fiado.fecha_limite.isoformat() if fiado.fecha_limite else None,
                "estado_nuevo": h.estado_nuevo,
                "notas": h.notas
            })
            
        return Response({
            "count": total_count,
            "results": data,
            "page": page,
            "page_size": page_size
        })

    @action(detail=True, methods=['get'])
    def exportar_historial(self, request, pk=None):
        """Exporta el historial de un fiado a Excel usando el formato estándar"""
        fiado = self.get_object()
        historial = fiado.historial.all().order_by('-fecha')

        headers = [
            'Fecha Movimiento', 'Fecha Límite', 'Total Deuda (S/.)', 
            'Abono Registrado (S/.)', 'Saldo Pendiente (S/.)', 
            'Estado Resultante', 'Notas'
        ]
        
        rows = []
        for h in historial:
            rows.append([
                h.fecha.strftime("%d/%m/%Y %H:%M:%S") if h.fecha else '',
                fiado.fecha_limite.strftime("%d/%m/%Y") if fiado.fecha_limite else '-',
                float(h.total_deuda),
                float(h.abono),
                float(h.saldo_restante),
                h.estado_nuevo,
                h.notas or ''
            ])

        return create_excel_response(
            filename=f"kardex_fiado_{fiado.id}.xlsx",
            sheet_name="Historial",
            headers=headers,
            rows=rows,
            title=f"Historial de Operación: #{str(fiado.id).zfill(6)} - {fiado.cliente.nombre} (DNI: {fiado.cliente.documento or 'S/D'})",
            period_label="Historial Completo"
        )
        
    @action(detail=False, methods=['get'])
    def exportar(self, request):
        """Exportar lista de fiados con filtro de período"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = self.filter_queryset(self.get_queryset())

        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(creado_en__date__gte=date_from, creado_en__date__lte=date_to)

        headers = [
            'ID', 'Fecha Ingreso', 'Cliente Fiado', 'Tipo', 
            'Total Deuda (S/.)', 'Saldo Pendiente (S/.)', 
            'Fecha Límite', 'Estado', 'Última Modificación'
        ]
        
        rows = []
        for obj in queryset:
            fecha_ingreso = obj.creado_en.strftime('%d/%m/%Y %H:%M') if obj.creado_en else ''
            fecha_modificacion = obj.actualizado_en.strftime('%d/%m/%Y %H:%M') if obj.actualizado_en else ''
            fecha_limite = obj.fecha_limite.strftime('%d/%m/%Y') if obj.fecha_limite else '-'
            
            rows.append([
                str(obj.id).zfill(6),
                fecha_ingreso,
                obj.cliente.nombre if obj.cliente else 'Sin Cliente',
                obj.get_tipo_display(),
                float(obj.total),
                float(obj.saldo_pendiente),
                fecha_limite,
                obj.get_estado_display(),
                fecha_modificacion
            ])

        period_label = get_period_label(periodo, anio)
        return create_excel_response(
            filename='reporte_fiados.xlsx',
            sheet_name='Fiados',
            headers=headers,
            rows=rows,
            title='Reporte General de Fiados (Cuentas por Cobrar)',
            period_label=period_label
        )

    @action(detail=False, methods=['get'])
    def exportar_historial_global(self, request):
        """Exportar historial global de movimientos de fiados (Kardex Global)"""
        periodo = request.query_params.get('periodo', 'todo')
        anio = request.query_params.get('anio')
        anio = int(anio) if anio else None

        queryset = HistorialFiado.objects.all().order_by('-fecha')
        
        # Filtro por periodo basado en la fecha del movimiento
        period_range = get_period_range(periodo, anio)
        if period_range:
            date_from, date_to = period_range
            queryset = queryset.filter(fecha__date__gte=date_from, fecha__date__lte=date_to)

        headers = [
            'Fecha Movimiento', 'ID Fiado', 'Cliente', 'Tipo Fiado', 
            'Fecha Límite Fiado', 'Total Deuda (S/.)', 'Abono Realizado (S/.)', 
            'Saldo Pendiente (S/.)', 'Nuevo Estado', 'Notas'
        ]
        
        rows = []
        for h in queryset:
            rows.append([
                h.fecha.strftime("%d/%m/%Y %H:%M:%S") if h.fecha else '',
                f"#{str(h.fiado.id).zfill(6)}",
                h.fiado.cliente.nombre if h.fiado.cliente else 'S/C',
                h.fiado.get_tipo_display(),
                h.fiado.fecha_limite.strftime("%d/%m/%Y") if h.fiado.fecha_limite else '-',
                float(h.total_deuda),
                float(h.abono),
                float(h.saldo_restante),
                h.estado_nuevo,
                h.notas or ''
            ])

        period_label = get_period_label(periodo, anio)
        return create_excel_response(
            filename='kardex_global_fiados.xlsx',
            sheet_name='Historial Global',
            headers=headers,
            rows=rows,
            title='Historial Global de Fiados (Kardex Unificado)',
            period_label=period_label
        )
