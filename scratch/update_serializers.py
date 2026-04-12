import os
import re

serializers_to_patch = {
    "apps/capital/serializers.py": ["MovimientoCapitalSerializer"],
    "apps/clientes/serializers.py": ["MovimientoEstadoClienteSerializer"],
    "apps/compras/serializers.py": ["MovimientoEstadoCompraSerializer"],
    "apps/fiados/serializers.py": ["HistorialFiadoSerializer"],
    "apps/proveedores/serializers.py": ["MovimientoProveedorSerializer"],
    "apps/servicios/serializers.py": ["MovimientoServicioSerializer", "MovimientoEstadoVentaServicioSerializer"],
    "apps/transacciones/serializers.py": ["HistorialTransaccionSerializer", "MovimientoCategoriaSerializer"],
    "apps/ventas/serializers.py": ["MovimientoEstadoVentaSerializer"]
}

fields_to_add = "    usuario_nombre = serializers.SerializerMethodField()\n    usuario_rol = serializers.SerializerMethodField()\n"

methods_to_add = """
    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return getattr(obj.usuario, "get_full_name", lambda: "")() or obj.usuario.username
        return "Sistema"

    def get_usuario_rol(self, obj):
        if obj.usuario and hasattr(obj.usuario, "perfil"):
            return obj.usuario.perfil.get_rol_display()
        return "-"
"""

for filepath, classes in serializers_to_patch.items():
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    original = content
    for cls in classes:
        if f"class {cls}" not in content:
            continue
        if "usuario_nombre =" in content.split(f"class {cls}")[1].split("class ")[0]:
            print(f"Skipping {cls}")
            continue
            
        # 1. Insert method fields
        content = content.replace(f"class {cls}(serializers.ModelSerializer):", f"class {cls}(serializers.ModelSerializer):\n{fields_to_add}")
        
        # 2. Insert method logic
        parts = content.split(f"class {cls}(serializers.ModelSerializer):\n{fields_to_add}")
        header = parts[0]
        body = parts[1]
        
        next_class_idx = body.find("\nclass ")
        if next_class_idx != -1:
            body = body[:next_class_idx] + methods_to_add + body[next_class_idx:]
        else:
            body = body + methods_to_add
            
        # 3. Add to "fields" array in Meta
        meta_pattern = re.compile(r"(class Meta:.*?fields = \[.*?)(.id.)", re.DOTALL)
        body = meta_pattern.sub(r"\1\2, 'usuario', 'usuario_nombre', 'usuario_rol'", body, count=1)
            
        content = header + f"class {cls}(serializers.ModelSerializer):\n{fields_to_add}" + body

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Patched {filepath}")
