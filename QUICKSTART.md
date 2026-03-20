# Guía de Inicio Rápido

## Primeros Pasos

### 1. Instalar dependencias del Backend

```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual (Windows)
venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

### 2. Configurar base de datos

```bash
# Ejecutar migraciones
python manage.py migrate

# Crear superusuario para acceder al admin
python manage.py createsuperuser
```

### 3. Iniciar el Backend

```bash
python manage.py runserver
```

El backend estará disponible en: http://localhost:8000

### 4. Instalar dependencias del Frontend

```bash
cd frontend
npm install
```

### 5. Iniciar el Frontend

```bash
npm run dev
```

El frontend estará disponible en: http://localhost:5173

## Accesos Directos

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **Admin Django**: http://localhost:8000/admin

## Uso del Script de Inicio

En Windows, puedes usar el script `start.bat` que inicia ambos servidores automáticamente:

```bash
start.bat
```

## Estructura de Menús

La aplicación cuenta con los siguientes módulos:

1. **Dashboard** - Vista general con métricas clave
2. **Productos** - Gestión de productos y stock
3. **Proveedores** - Gestión de proveedores y histórico de precios
4. **Clientes** - Gestión de clientes y recurrencia
5. **Ventas** - Registro de ventas con actualización de stock
6. **Compras** - Registro de compras con actualización de stock
7. **Capital** - Gestión de activos y capital
8. **Servicios** - Gestión de servicios y ventas de servicios
9. **Transacciones** - Ingresos y egresos independientes
10. **Reportes** - Balance general y reportes financieros

## Flujo de Trabajo Recomendado

### Configuración Inicial

1. Registrar productos en el módulo **Productos**
2. Registrar proveedores en el módulo **Proveedores**
3. Registrar clientes en el módulo **Clientes**
4. Registrar capital inicial en el módulo **Capital**

### Operaciones Diarias

1. Registrar compras a proveedores en **Compras** (aumenta stock)
2. Registrar ventas en **Ventas** (disminuye stock)
3. Registrar servicios en **Servicios**
4. Registrar transacciones independientes en **Transacciones**

### Reportes

1. Revisar el **Dashboard** para métricas del mes
2. Ir a **Reportes** para balance detallado
3. Filtrar por fechas para análisis específico

## Características Destacadas

### Actualización Automática de Stock

- Al **confirmar una compra**, el stock del producto aumenta automáticamente
- Al **confirmar una venta**, el stock del producto disminuye automáticamente
- El sistema alerta cuando un producto tiene **stock bajo**

### Seguimiento de Clientes

- Cada cliente tiene un contador de **recurrencia** (número de compras)
- Se registra el **total comprado** históricamente
- Se puede ver el último fecha de compra

### Histórico de Precios

- Cada compra a proveedor registra el precio pagado
- Se puede consultar el histórico de precios por producto
- Útil para análisis de costos y tendencias

### Balance Automático

- El sistema calcula automáticamente ingresos, egresos y balance
- Incluye ventas, servicios y transacciones independientes
- Gráficos de composición de ingresos y egresos

## Solución de Problemas

### El frontend no conecta con el backend

1. Asegúrate que el backend esté corriendo en http://localhost:8000
2. Verifica que CORS esté configurado correctamente en settings.py

### Error de migraciones

```bash
python manage.py makemigrations
python manage.py migrate
```

### Error de dependencias

Backend:
```bash
pip install -r requirements.txt --upgrade
```

Frontend:
```bash
cd frontend
npm install
```

## Personalización

### Cambiar moneda

Los montos están en formato $ pero puedes cambiarlo en los archivos React buscando `$` y reemplazando con tu moneda local.

### Cambiar zona horaria

Edita `config/settings.py`:
```python
TIME_ZONE = 'America/Lima'  # Cambia a tu zona horaria
```

### Cambiar idioma

El sistema está configurado en español. Para cambiar a otro idioma, edita `config/settings.py`:
```python
LANGUAGE_CODE = 'es-pe'  # o 'en-us' para inglés
```

## Soporte

Para reportar errores o solicitar características adicionales, contacta al equipo de desarrollo.
