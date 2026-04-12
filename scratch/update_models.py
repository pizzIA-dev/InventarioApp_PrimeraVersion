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

usuario_field = "\n    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)\n"

save_method = """
    def save(self, *args, **kwargs):
        if not self.usuario_id:
            from apps.core.middleware import get_current_user
            user = get_current_user()
            if user and user.is_authenticated:
                self.usuario = user
        super().save(*args, **kwargs)
"""

for filepath, classes in models_to_patch.items():
    if not os.path.exists(filepath):
        print(f"File {filepath} not found")
        continue
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    if "from django.conf import settings" not in content:
        content = "from django.conf import settings\n" + content
    
    for cls in classes:
        # Check if already patched
        if f"class {cls}(models.Model):" not in content:
            print(f"Class {cls} not found in {filepath}")
            continue
            
        if "usuario = models.ForeignKey" in content.split(f"class {cls}")[1].split("class ")[0]:
            print(f"Class {cls} in {filepath} might be already patched.")
            continue
        
        # Inject at the top of the class definition
        content = content.replace(f"class {cls}(models.Model):", f"class {cls}(models.Model):{usuario_field}")
        
        # Inject the save method at the very end of the class, or just before __str__
        # finding the next def __str__ or class Meta
        match_str = re.search(r"(" + f"class {cls}" + r".*?)(    def __str__|    class Meta)", content, re.DOTALL)
        if match_str:
            insertion_point = match_str.group(2)
            content = content.replace(insertion_point, save_method + "\n" + insertion_point, 1)
        else:
            # If no __str__ or Meta, append to class
            pass # fallback, usually they have __str__ or Meta
            
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Patched {filepath}")
