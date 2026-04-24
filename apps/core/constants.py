"""
Constantes centralizadas de NegocIA.
Importar desde aquí en lugar de definir localmente en cada modelo/vista.
"""

# ── Roles de usuario ──────────────────────────────────────────────────────────
# NOTA: 'VENDEDOR' se mantiene por retrocompatibilidad con datos existentes.
# Todos los nuevos perfiles usarán 'COLABORADOR'.
ROL_CHOICES = [
    ('GERENTE',      'Gerente'),
    ('COLABORADOR',  'Colaborador'),
    ('VENDEDOR',     'Colaborador (legacy)'),  # Retrocompat — NO usar en nuevo código
]

# Set de roles que pueden vender (equivalentes operativos)
ROLES_COLABORADOR = {'COLABORADOR', 'VENDEDOR'}

# ── Razones de cancelación (compartidas entre Ventas, Compras y Servicios) ────
RAZON_CANCELACION_CHOICES = [
    ('CONFUSION',       'Confusión en el pedido'),
    ('ARREPENTIMIENTO', 'El cliente se arrepintió'),
    ('SIN_STOCK',       'Sin stock disponible'),
    ('PRECIO',          'Desacuerdo en el precio'),
    ('DUPLICADO',       'Registro duplicado'),
    ('ERROR_SISTEMA',   'Error del sistema'),
    ('OTRO',            'Otro motivo'),
]

RAZON_CANCELACION_SET = {r[0] for r in RAZON_CANCELACION_CHOICES}

# ── Estados comunes ───────────────────────────────────────────────────────────
ESTADO_VENTA_CHOICES = [
    ('BORRADOR',   'Borrador'),
    ('CONFIRMADA', 'Confirmada'),
    ('CANCELADA',  'Cancelada'),
]
