from django.contrib import admin
from .models import Venta, DetalleVenta


class DetalleVentaInline(admin.TabularInline):
    model = DetalleVenta
    extra = 1
    raw_id_fields = ['producto']


@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'numero_comprobante', 'cliente', 
        'estado', 'total', 'creado_en'
    ]
    search_fields = ['numero_comprobante', 'cliente__nombre']
    list_filter = ['estado', 'creado_en']
    readonly_fields = ['subtotal', 'descuento', 'impuesto', 'total', 'creado_en', 'actualizado_en']
    inlines = [DetalleVentaInline]
    
    fieldsets = (
        ('Información General', {
            'fields': ('cliente', 'cliente_nombre')
        }),
        ('Documento', {
            'fields': ('numero_comprobante', 'tipo_comprobante')
        }),
        ('Estado y Totales', {
            'fields': ('estado', 'subtotal', 'descuento', 'impuesto', 'total')
        }),
        ('Notas', {
            'fields': ('notas',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if obj.estado == 'CONFIRMADA' and change:
            obj.registrar_salida_stock()


@admin.register(DetalleVenta)
class DetalleVentaAdmin(admin.ModelAdmin):
    list_display = ['venta', 'producto', 'cantidad', 'precio_venta', 'descuento', 'subtotal']
    search_fields = ['producto__nombre', 'venta__numero_comprobante']
