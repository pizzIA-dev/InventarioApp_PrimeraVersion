from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum
from .models import TipoCapital, Capital
from .serializers import (
    TipoCapitalSerializer,
    CapitalSerializer, CapitalCreateSerializer
)


class TipoCapitalViewSet(viewsets.ModelViewSet):
    queryset = TipoCapital.objects.all()
    serializer_class = TipoCapitalSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()


class CapitalViewSet(viewsets.ModelViewSet):
    queryset = Capital.objects.all().select_related('tipo')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['nombre', 'descripcion', 'banco', 'cuenta']
    filterset_fields = ['tipo', 'estado']
    ordering_fields = ['nombre', 'valor_actual', 'creado_en']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CapitalCreateSerializer
        return CapitalSerializer
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Obtiene resumen del capital"""
        capital_activo = self.queryset.filter(estado='ACTIVO')
        
        # Total por tipo
        total_dinero = sum(
            c.valor_actual for c in capital_activo 
            if c.tipo and c.tipo.tipo == 'DINERO'
        )
        total_bienes = sum(
            c.valor_actual for c in capital_activo 
            if c.tipo and c.tipo.tipo == 'BIEN'
        )
        
        # Capital total
        capital_total = total_dinero + total_bienes
        
        return Response({
            'capital_total': capital_total,
            'total_dinero': total_dinero,
            'total_bienes': total_bienes,
            'cantidad_activos': capital_activo.count()
        })
    
    @action(detail=False, methods=['get'])
    def por_tipo(self, request):
        """Obtiene capital agrupado por tipo"""
        tipos = TipoCapital.objects.filter(activo=True)
        data = []
        
        for tipo in tipos:
            capital_tipo = Capital.objects.filter(
                tipo=tipo, estado='ACTIVO'
            )
            total = sum(c.valor_actual for c in capital_tipo)
            
            data.append({
                'tipo': tipo.nombre,
                'categoria': tipo.tipo,
                'total': total,
                'cantidad': capital_tipo.count()
            })
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def tipos(self, request):
        """Obtiene todos los tipos de capital"""
        tipos = TipoCapital.objects.filter(activo=True)
        serializer = TipoCapitalSerializer(tipos, many=True)
        return Response(serializer.data)
