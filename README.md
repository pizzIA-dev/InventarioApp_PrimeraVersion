# Inventario y Balance - Aplicación Web de Gestión

Aplicación web de inventarios y balance (registro de ingresos y egresos) para negocios pequeños o medianos de venta directa al consumidor.

## Tecnologías

- **Backend**: Django 5.0 + Django REST Framework
- **Frontend**: React 18 + Vite + Ant Design
- **Base de Datos**: SQLite (por defecto, configurable a PostgreSQL)

## Funcionalidades Principales

1. **Registro de Productos en Stock**: Gestión completa de productos con código, nombre, cantidad, precios de compra y venta.

2. **Actualización Automática de Stock**: El stock se actualiza automáticamente al registrar compras o ventas.

3. **Registro de Compras a Proveedores**: Compras a proveedores o al por menor con actualización automática de stock.

4. **Registro de Proveedores**: Gestión de proveedores con histórico de precios por producto.

5. **Registro de Ventas**: Ventas a clientes con descuentos, múltiples productos y actualización de stock.

6. **Registro de Clientes**: Clientes individuales, negocios o empresas con seguimiento de recurrencia.

7. **Registro de Ingresos/Egresos Independientes**: Transacciones independientes al negocio principal.

8. **Balance de Ingresos y Egresos**: Balance completo con desglose de ganancias/pérdidas.

9. **Registro de Capital**: Bienes, activos y capital en dinero del negocio.

10. **Registro de Servicios**: Línea de servicios con seguimiento de ventas y estado.

## Instalación

### Backend (Django)

1. Crear entorno virtual:
```bash
python -m venv venv
venv\Scripts\activate  # Windows
# o
source venv/bin/activate  # Linux/Mac
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Configurar variables de entorno:
```bash
# Copiar .env.example a .env
copy .env.example .env  # Windows
# o
cp .env.example .env  # Linux/Mac
```

4. Ejecutar migraciones:
```bash
python manage.py makemigrations
python manage.py migrate
```

5. Crear superusuario:
```bash
python manage.py createsuperuser
```

6. Iniciar servidor:
```bash
python manage.py runserver
```

### Frontend (React)

1. Navegar al directorio frontend:
```bash
cd frontend
```

2. Instalar dependencias:
```bash
npm install
```

3. Iniciar servidor de desarrollo:
```bash
npm run dev
```

4. Acceder a la aplicación:
```
http://localhost:5173
```

## Estructura del Proyecto

```
ProyectoInventario/
├── config/                 # Configuración de Django
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── apps/                   # Aplicaciones Django
│   ├── inventario/        # Productos y stock
│   ├── proveedores/       # Gestión de proveedores
│   ├── clientes/          # Gestión de clientes
│   ├── compras/           # Compras a proveedores
│   ├── ventas/            # Ventas a clientes
│   ├── capital/           # Capital y activos
│   ├── servicios/         # Servicios
│   ├── transacciones/     # Ingresos/egresos independientes
│   └── reportes/          # Reportes y balance
├── frontend/              # Aplicación React
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
├── manage.py
└── requirements.txt
```

## API Endpoints

- `/api/productos/` - Gestión de productos
- `/api/proveedores/` - Gestión de proveedores
- `/api/clientes/` - Gestión de clientes
- `/api/ventas/` - Gestión de ventas
- `/api/compras/` - Gestión de compras
- `/api/capital/` - Gestión de capital
- `/api/servicios/` - Gestión de servicios
- `/api/transacciones/` - Gestión de transacciones
- `/api/reportes/` - Reportes y balances

## Características de la UI

- Diseño inspirado en ODOO pero más simple e intuitivo
- Menú lateral de navegación
- Dashboard con métricas clave
- Gráficos de balance y tendencias
- Tablas con operaciones CRUD
- Modales para creación/edición
- Responsive design

## Desarrollo

### Agregar datos de prueba

Puedes usar el admin de Django para agregar datos de prueba:
```
http://localhost:8000/admin/
```

### Personalización

- Los colores y estilos están en `frontend/src/index.css`
- La configuración de la API está en `frontend/src/services/api.js`
- Las rutas están en `frontend/src/App.jsx`

## Licencia

MIT
