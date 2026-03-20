from django.contrib import admin
from .models import Categoria, Producto, MovimientoStock


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'activo', 'creado_en']
    search_fields = ['nombre']
    list_filter = ['activo']


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = [
        'codigo', 'nombre', 'categoria', 'stock_actual', 
        'precio_compra', 'precio_venta', 'margen_ganancia', 'activo'
    ]
    search_fields = ['codigo', 'nombre', 'descripcion']
    list_filter = ['categoria', 'activo', 'unidad_medida']
    readonly_fields = ['margen_ganancia', 'creado_en', 'actualizado_en']
    
    fieldsets = (
        ('Información General', {
            'fields': ('codigo', 'nombre', 'descripcion', 'categoria')
        }),
        ('Stock', {
            'fields': ('stock_actual', 'stock_minimo', 'unidad_medida')
        }),
        ('Precios', {
            'fields': ('precio_compra', 'precio_venta', 'margen_ganancia')
        }),
        ('Control', {
            'fields': ('activo', 'creado_en', 'actualizado_en')
        }),
    )


@admin.register(MovimientoStock)
class MovimientoStockAdmin(admin.ModelAdmin):
    list_display = [
        'fecha', 'producto', 'tipo', 'origen', 
        'cantidad', 'stock_anterior', 'stock_nuevo'
    ]
    search_fields = ['producto__nombre', 'referencia']
    list_filter = ['tipo', 'origen', 'fecha']
    readonly_fields = ['stock_anterior', 'stock_nuevo', 'fecha']
