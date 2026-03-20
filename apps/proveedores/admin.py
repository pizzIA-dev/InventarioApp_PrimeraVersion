from django.contrib import admin
from .models import Proveedor, HistoricoPrecio


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = [
        'nombre', 'identificador', 'categoria', 
        'tiene_contrato', 'limite_credito', 'activo'
    ]
    search_fields = ['nombre', 'identificador', 'email', 'telefono']
    list_filter = ['categoria', 'tiene_contrato', 'activo']
    readonly_fields = ['creado_en', 'actualizado_en']
    
    fieldsets = (
        ('Información General', {
            'fields': ('nombre', 'identificador', 'contacto', 'email', 'telefono', 'direccion')
        }),
        ('Categoría', {
            'fields': ('categoria',)
        }),
        ('Contratos y Crédito', {
            'fields': ('tiene_contrato', 'detalles_contrato', 'dias_credito', 'limite_credito')
        }),
        ('Control', {
            'fields': ('activo', 'creado_en', 'actualizado_en')
        }),
    )


@admin.register(HistoricoPrecio)
class HistoricoPrecioAdmin(admin.ModelAdmin):
    list_display = ['producto', 'proveedor', 'precio_compra', 'cantidad', 'fecha']
    search_fields = ['producto__nombre', 'proveedor__nombre']
    list_filter = ['fecha', 'proveedor']
