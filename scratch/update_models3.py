import os
import re

models_to_patch = {
    "apps/capital/models.py": ["MovimientoCapital"],
    "apps/clientes/models.py": ["MovimientoEstadoCliente"],
    "apps/compras/models.py": ["MovimientoEstadoCompra"],
    "apps/fiados/models.py": ["HistorialFiado"],
    "apps/inventario/models.py": ["MovimientoStock"],
    "apps/proveedores/models.py": ["MovimientoProveedor"],
    "apps/servicios/models.py": ["MovimientoServicio", "MovimientoEstadoVentaServicio"],
    "apps/transacciones/models.py": ["HistorialTransaccion", "MovimientoCategoria"],
    "apps/ventas/models.py": ["MovimientoEstadoVenta"]
}

usuario_field_template = "    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)\n"
save_logic = """        if getattr(self, "usuario_id", None) is None:
            from apps.core.middleware import get_current_user
            user = get_current_user()
            if user and user.is_authenticated:
                self.usuario = user
"""

save_method = f"""
    def save(self, *args, **kwargs):
{save_logic}        super().save(*args, **kwargs)
"""

for filepath, classes in models_to_patch.items():
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    if not any("from django.conf import settings" in line for line in lines):
        lines.insert(0, "from django.conf import settings\n")
        
    for cls in classes:
        # Find class definition line
        class_idx = -1
        for i, line in enumerate(lines):
            if line.startswith(f"class {cls}(models.Model):"):
                class_idx = i
                break
        
        if class_idx == -1:
            print(f"Not found {cls}")
            continue
            
        # Find the end of this class definition
        end_class_idx = len(lines)
        for i in range(class_idx + 1, len(lines)):
            if lines[i].startswith("class "):
                end_class_idx = i
                break
                
        # Check if already patched
        has_usuario = any("usuario = models.ForeignKey(settings.AUTH_USER_MODEL" in line for line in lines[class_idx:end_class_idx])
        if has_usuario:
            continue
            
        # Insert field at start of class
        lines.insert(class_idx + 1, usuario_field_template)
        # Shift our known indices since we inserted a line
        end_class_idx += 1
        
        # Check if class has save method
        has_save = False
        save_idx = -1
        for i in range(class_idx + 2, end_class_idx):
            if re.match(r"^    def save\(self, \*args, \*\*kwargs\):", lines[i]) or re.match(r"^    def save\(self, .*?\):", lines[i]):
                has_save = True
                save_idx = i
                break
                
        if has_save:
            # Inject just the logic into existing save method
            # We insert it on the next line after def save(self, ...):
            lines.insert(save_idx + 1, save_logic)
        else:
            # Inject full save method right before the end of the class (or before class Meta)
            insert_save_idx = end_class_idx
            # Try to find class Meta
            for i in range(class_idx + 2, end_class_idx):
                if lines[i].startswith("    class Meta"):
                    insert_save_idx = i
                    break
            if insert_save_idx == end_class_idx:
                 # Or just append at end_class_idx
                 pass
            # Reverse apply the new method
            for l in reversed(save_method.splitlines(True)):
                lines.insert(insert_save_idx, l)
                
    with open(filepath, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"Patched {filepath}")
