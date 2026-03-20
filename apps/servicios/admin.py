from django.contrib import admin
from .models import CategoriaServicio, Servicio, VentaServicio


@admin.register(CategoriaServicio)
class CategoriaServicioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'activo']
    search_fields = ['nombre']
    list_filter = ['activo']


@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = [
        'nombre', 'categoria', 'precio_base', 'costo', 
        'margen_ganancia', 'activo'
    ]
    search_fields = ['nombre', 'descripcion']
    list_filter = ['categoria', 'activo']
    readonly_fields = ['margen_ganancia']
    
    fieldsets = (
        ('Información General', {
            'fields': ('nombre', 'descripcion', 'categoria')
        }),
        ('Precios', {
            'fields': ('precio_base', 'costo', 'margen_ganancia')
        }),
        ('Duración', {
            'fields': ('duracion_minutos',)
        }),
        ('Control', {
            'fields': ('activo',)
        }),
    )


@admin.register(VentaServicio)
class VentaServicioAdmin(admin.ModelAdmin):
    list_display = [
        'servicio', 'cliente', 'precio', 'descuento', 
        'total', 'estado', 'fecha_programada'
    ]
    search_fields = ['servicio__nombre', 'cliente__nombre']
    list_filter = ['estado', 'fecha_programada']
    readonly_fields = ['total', 'creado_en', 'actualizado_en']
    
    fieldsets = (
        ('Servicio', {
            'fields': ('servicio', 'servicio_nombre')
        }),
        ('Cliente', {
            'fields': ('cliente', 'cliente_nombre')
        }),
        ('Precios', {
            'fields': ('precio', 'descuento', 'total')
        }),
        ('Fechas y Estado', {
            'fields': ('fecha_programada', 'fecha_completado', 'estado')
        }),
        ('Notas', {
            'fields': ('notas',)
        }),
    )
