from django.contrib import admin
from .models import CategoriaTransaccion, Transaccion


@admin.register(CategoriaTransaccion)
class CategoriaTransaccionAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'tipo', 'activo']
    search_fields = ['nombre']
    list_filter = ['tipo', 'activo']


@admin.register(Transaccion)
class TransaccionAdmin(admin.ModelAdmin):
    list_display = [
        'fecha', 'descripcion', 'categoria', 'tipo', 
        'monto', 'metodo_pago'
    ]
    search_fields = ['descripcion', 'referencia', 'notas']
    list_filter = ['tipo', 'categoria', 'metodo_pago', 'fecha']
    readonly_fields = ['creado_en', 'actualizado_en']
    
    fieldsets = (
        ('Información General', {
            'fields': ('categoria', 'tipo', 'descripcion', 'monto')
        }),
        ('Método de Pago', {
            'fields': ('metodo_pago', 'referencia')
        }),
        ('Fecha', {
            'fields': ('fecha',)
        }),
        ('Notas', {
            'fields': ('notas',)
        }),
    )
