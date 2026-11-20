from django.contrib import admin

from .models import Gasto, MovimientoSuscripcion, Pago


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ('empresa', 'monto', 'moneda', 'metodo_pago', 'fecha_pago', 'estado')
    list_filter = ('estado', 'moneda', 'metodo_pago')
    search_fields = ('empresa__nombre', 'referencia')


@admin.register(Gasto)
class GastoAdmin(admin.ModelAdmin):
    list_display = ('concepto', 'categoria', 'monto', 'moneda', 'fecha')
    list_filter = ('categoria', 'moneda')
    search_fields = ('concepto',)


@admin.register(MovimientoSuscripcion)
class MovimientoSuscripcionAdmin(admin.ModelAdmin):
    list_display = ('empresa', 'accion', 'usuario_nombre', 'creado_en')
    list_filter = ('accion',)
    search_fields = ('empresa__nombre', 'detalle')

    def has_change_permission(self, request, obj=None):
        return False  # La auditoría no se edita

    def has_delete_permission(self, request, obj=None):
        return False
