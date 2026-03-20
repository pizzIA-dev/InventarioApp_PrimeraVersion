from django.contrib import admin
from .models import Compra, DetalleCompra


class DetalleCompraInline(admin.TabularInline):
    model = DetalleCompra
    extra = 1
    raw_id_fields = ['producto']


@admin.register(Compra)
class CompraAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'numero_comprobante', 'proveedor', 'tipo_compra', 
        'estado', 'total', 'creado_en'
    ]
    search_fields = ['numero_comprobante', 'proveedor__nombre']
    list_filter = ['estado', 'tipo_compra', 'creado_en']
    readonly_fields = ['subtotal', 'impuesto', 'total', 'creado_en', 'actualizado_en']
    inlines = [DetalleCompraInline]
    
    fieldsets = (
        ('Información General', {
            'fields': ('proveedor', 'proveedor_nombre', 'tipo_compra')
        }),
        ('Documento', {
            'fields': ('numero_comprobante', 'tipo_comprobante')
        }),
        ('Estado y Totales', {
            'fields': ('estado', 'subtotal', 'impuesto', 'total')
        }),
        ('Notas', {
            'fields': ('notas',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if obj.estado == 'CONFIRMADA' and change:
            obj.registrar_stock()


@admin.register(DetalleCompra)
class DetalleCompraAdmin(admin.ModelAdmin):
    list_display = ['compra', 'producto', 'cantidad', 'precio_compra', 'subtotal']
    search_fields = ['producto__nombre', 'compra__numero_comprobante']
