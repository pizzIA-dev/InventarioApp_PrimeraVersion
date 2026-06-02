# -*- coding: utf-8 -*-
"""
Management command: seed_demo_data
Inserta datos de demostraciÃ³n en un tenant.

Uso:
    python manage.py seed_demo_data --schema=<schema_name>

Ejemplo:
    python manage.py seed_demo_data --schema=pizzia
"""
import random
import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Inserta datos de demostraciÃ³n en un tenant (productos, clientes, proveedores, ventas, compras)'

    def add_arguments(self, parser):
        parser.add_argument('--schema', required=True, help='Schema name del tenant (ej: pizzia)')
        parser.add_argument('--clear', action='store_true', help='Borrar datos demo antes de insertar')

    def handle(self, *args, **options):
        schema = options['schema']
        do_clear = options.get('clear', False)

        from django_tenants.utils import schema_context
        from apps.clientes_saas.models import Cliente as TenantModel

        try:
            tenant = TenantModel.objects.get(schema_name=schema)
        except TenantModel.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"Schema '{schema}' no encontrado."))
            return

        self.stdout.write(self.style.MIGRATE_HEADING(f"Insertando datos en schema: {schema}"))
        with schema_context(schema):
            self._seed(do_clear)
        self.stdout.write(self.style.SUCCESS("Datos de demostracion creados exitosamente!"))

    def _seed(self, do_clear):
        from apps.core.models import Empresa
        from apps.inventario.models import Producto, Categoria
        from apps.clientes.models import Cliente
        from apps.proveedores.models import Proveedor
        from apps.ventas.models import Venta, DetalleVenta
        from apps.compras.models import Compra, DetalleCompra

        empresa = Empresa.objects.first()
        if not empresa:
            self.stderr.write("No hay empresa en el tenant."); return

        if do_clear:
            self.stdout.write("  Limpiando datos...")
            DetalleVenta.objects.all().delete(); Venta.objects.all().delete()
            DetalleCompra.objects.all().delete(); Compra.objects.all().delete()

        # Categorias
        cat_b, _ = Categoria.objects.get_or_create(nombre='Bebidas', empresa=empresa)
        cat_c, _ = Categoria.objects.get_or_create(nombre='Comida', empresa=empresa)
        cat_i, _ = Categoria.objects.get_or_create(nombre='Insumos', empresa=empresa)

        # Productos
        prods_data = [
            ('Coca-Cola 500ml', cat_b, 2.50, 3.50, 50, 10, 'PZA'),
            ('Inca Kola 1L', cat_b, 3.00, 4.50, 40, 8, 'PZA'),
            ('Agua Mineral 600ml', cat_b, 1.00, 1.80, 80, 15, 'PZA'),
            ('Harina 1kg', cat_i, 3.50, 0, 30, 5, 'kg'),
            ('Queso Mozzarella 1kg', cat_i, 20.00, 0, 15, 3, 'kg'),
            ('Pizza Margarita', cat_c, 15.00, 28.00, 20, 5, 'PZA'),
            ('Empanada de Carne', cat_c, 2.50, 5.00, 35, 8, 'PZA'),
            ('Ensalada Mixta', cat_c, 5.00, 12.00, 10, 3, 'PZA'),
            ('Pan Artesanal', cat_c, 1.50, 3.50, 45, 10, 'PZA'),
        ]
        productos = []
        for nombre, cat, costo, precio, stock, min_s, unid in prods_data:
            p, cr = Producto.objects.get_or_create(nombre=nombre, empresa=empresa, defaults={
                'categoria': cat, 'precio_costo': Decimal(str(costo)),
                'precio_venta': Decimal(str(precio)), 'stock': stock,
                'stock_minimo': min_s, 'unidad': unid, 'activo': True,
            })
            productos.append(p)
            if cr: self.stdout.write(f"    + {nombre}")

        # Clientes
        cls_data = [
            ('Maria Garcia', '71234567', 'garcia@email.com', '987654321'),
            ('Carlos Rodriguez', '72345678', 'carlos@email.com', '976543210'),
            ('Ana Martinez', '73456789', 'ana@email.com', '965432109'),
            ('Luis Perez', '74567890', 'luis@email.com', '954321098'),
            ('Rosa Flores', '75678901', 'rosa@email.com', '943210987'),
        ]
        clientes = []
        for nombre, doc, email, tel in cls_data:
            c, _ = Cliente.objects.get_or_create(documento=doc, empresa=empresa, defaults={
                'nombre': nombre, 'email': email, 'telefono': tel, 'activo': True,
            })
            clientes.append(c)

        # Proveedores
        pvr_data = [
            ('Distribuidora Lima SAC', '20123456789', 'ventas@distriblima.com'),
            ('Insumos del Sur EIRL', '20234567890', 'contacto@insumossur.com'),
            ('Bebidas Andinas SRL', '20345678901', 'info@bebandinas.com'),
        ]
        proveedores = []
        for nombre, ruc, email in pvr_data:
            p, _ = Proveedor.objects.get_or_create(identificador=ruc, empresa=empresa, defaults={
                'nombre': nombre, 'email': email, 'activo': True,
            })
            proveedores.append(p)

        today = datetime.date.today()
        ventas_prods = [p for p in productos if float(p.precio_venta or 0) > 0]

        # 25 ventas en los ultimos 90 dias
        self.stdout.write("  Creando 25 ventas de productos...")
        for i in range(25):
            dias = random.randint(0, 89)
            fecha = today - datetime.timedelta(days=dias)
            cliente = random.choice(clientes) if random.random() > 0.3 else None
            items = random.sample(ventas_prods, min(random.randint(1, 3), len(ventas_prods)))
            subtotal = Decimal('0')
            det = []
            for prod in items:
                qty = random.randint(1, 4)
                subtotal += prod.precio_venta * qty
                det.append((prod, qty, prod.precio_venta))
            impuesto = (subtotal * Decimal('0.18')).quantize(Decimal('0.01'))
            v = Venta.objects.create(
                empresa=empresa, cliente=cliente,
                cliente_nombre=cliente.nombre if cliente else 'Cliente General',
                numero_comprobante_simple=f'B{1000+i:04d}',
                tipo_comprobante='BOLETA', estado='CONFIRMADA',
                subtotal=subtotal, impuesto=impuesto, total=subtotal+impuesto,
                creado_en=datetime.datetime.combine(fecha, datetime.time(10, 0)),
            )
            for prod, qty, precio in det:
                DetalleVenta.objects.create(
                    venta=v, producto=prod, cantidad=qty,
                    precio_unitario=precio, subtotal=precio*qty,
                )

        # 10 compras
        self.stdout.write("  Creando 10 compras...")
        insumos = [p for p in productos if float(p.precio_venta or 0) == 0] or productos[:3]
        for i in range(10):
            dias = random.randint(5, 89)
            fecha = today - datetime.timedelta(days=dias)
            prov = random.choice(proveedores)
            items = random.sample(insumos, min(random.randint(1, 2), len(insumos)))
            subtotal = Decimal('0')
            det = []
            for prod in items:
                qty = random.randint(5, 20)
                subtotal += prod.precio_costo * qty
                det.append((prod, qty, prod.precio_costo))
            impuesto = (subtotal * Decimal('0.18')).quantize(Decimal('0.01'))
            c = Compra.objects.create(
                empresa=empresa, proveedor=prov, proveedor_nombre=prov.nombre,
                numero_comprobante=f'F{2000+i:04d}', tipo_comprobante='FACTURA',
                estado='CONFIRMADA', subtotal=subtotal, impuesto=impuesto, total=subtotal+impuesto,
                creado_en=datetime.datetime.combine(fecha, datetime.time(9, 0)),
            )
            for prod, qty, precio in det:
                DetalleCompra.objects.create(
                    compra=c, producto=prod, cantidad=qty,
                    precio_unitario=precio, subtotal=precio*qty,
                )

        self.stdout.write(self.style.SUCCESS(f"  LISTO: {Venta.objects.count()} ventas, {Compra.objects.count()} compras, {Producto.objects.count()} productos"))
