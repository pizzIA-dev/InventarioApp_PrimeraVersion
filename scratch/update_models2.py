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

usuario_field_template = "\n    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)\n"

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
            
        # Check if already patched
        has_usuario = any("usuario = models.ForeignKey" in line for line in lines[class_idx:class_idx+15])
        if has_usuario:
            continue
            
        # Insert field
        lines.insert(class_idx + 1, usuario_field_template)
        
        # Now find where to insert the save method.
        # Find next __str__ or Meta, or just EOF
        insert_save_idx = -1
        for i in range(class_idx + 2, len(lines)):
            if lines[i].startswith("class "): 
                # Reached another class without finding Meta or __str__
                insert_save_idx = i
                break
            if lines[i].startswith("    class Meta") or lines[i].startswith("    def __str__"):
                insert_save_idx = i
                break
            
        if insert_save_idx == -1:
            insert_save_idx = len(lines)
            
        save_method = [
            "\n",
            "    def save(self, *args, **kwargs):\n",
            "        if not self.usuario_id:\n",
            "            from apps.core.middleware import get_current_user\n",
            "            user = get_current_user()\n",
            "            if user and user.is_authenticated:\n",
            "                self.usuario = user\n",
            "        super().save(*args, **kwargs)\n",
            "\n"
        ]
        
        # But wait! What if the model ALREADY has a save method?
        has_save = False
        for i in range(class_idx + 2, insert_save_idx):
            if "def save(" in lines[i]:
                has_save = True
                save_idx = i
                break
                
        if has_save:
            # Inject just the logic into existing save method
            lines.insert(save_idx + 1, "        if not getattr(self, \"usuario_id\", None):\n            from apps.core.middleware import get_current_user\n            user = get_current_user()\n            if user and user.is_authenticated:\n                self.usuario = user\n")
        else:
            for l in reversed(save_method):
                lines.insert(insert_save_idx, l)
                
    with open(filepath, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"Patched {filepath}")
