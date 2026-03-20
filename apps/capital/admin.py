from django.contrib import admin
from .models import TipoCapital, Capital


@admin.register(TipoCapital)
class TipoCapitalAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'tipo', 'activo']
    search_fields = ['nombre']
    list_filter = ['tipo', 'activo']


@admin.register(Capital)
class CapitalAdmin(admin.ModelAdmin):
    list_display = [
        'nombre', 'tipo', 'valor_inicial', 'valor_actual', 
        'estado', 'creado_en'
    ]
    search_fields = ['nombre', 'descripcion', 'banco', 'cuenta']
    list_filter = ['tipo', 'estado', 'fecha_adquisicion']
    readonly_fields = ['creado_en', 'actualizado_en']
    
    fieldsets = (
        ('Información General', {
            'fields': ('tipo', 'nombre', 'descripcion')
        }),
        ('Valor', {
            'fields': ('valor_inicial', 'valor_actual')
        }),
        ('Para Bienes', {
            'fields': ('fecha_adquisicion', 'vida_util_anios', 'depreciacion_anual')
        }),
        ('Para Dinero', {
            'fields': ('cuenta', 'banco')
        }),
        ('Control', {
            'fields': ('estado', 'notas', 'creado_en', 'actualizado_en')
        }),
    )
