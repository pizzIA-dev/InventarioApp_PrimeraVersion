from django.contrib import admin
from .models import Cliente, SegmentoCliente


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = [
        'nombre', 'tipo_cliente', 'numero_documento', 
        'telefono', 'recurrencia', 'total_comprado', 'activo'
    ]
    search_fields = ['nombre', 'numero_documento', 'email', 'telefono']
    list_filter = ['tipo_cliente', 'tipo_documento', 'activo']
    readonly_fields = ['creado_en', 'actualizado_en', 'recurrencia', 'total_comprado']
    
    fieldsets = (
        ('Información General', {
            'fields': (
                'nombre', 'tipo_cliente', 'tipo_documento', 'numero_documento',
                'contacto', 'email', 'telefono', 'direccion'
            )
        }),
        ('Control', {
            'fields': ('activo', 'creado_en', 'actualizado_en')
        }),
    )


@admin.register(SegmentoCliente)
class SegmentoClienteAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'descuento_por_defecto', 'activo']
    search_fields = ['nombre']
    list_filter = ['activo']
