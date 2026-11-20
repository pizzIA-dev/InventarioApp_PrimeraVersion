# CLAUDE.md — Contexto del proyecto para agentes

> Guía de referencia rápida para cualquier agente (Claude Code, OpenCode, etc.) que vaya a trabajar en este repositorio. Léela antes de modificar código.

## ¿Qué es este proyecto?

**NegocIA** — SaaS multi-tenant de **inventario y balance** para pequeños/medianos negocios de venta directa. Permite gestionar productos, compras, ventas, clientes, proveedores, capital, servicios, fiados (créditos), transacciones no operativas y reportes financieros.

- **Repositorio Git:** `https://github.com/pizzIA-dev/InventarioApp_PrimeraVersion`
- **Ramas:** `main`, `development`, `production`, `dev-racosta`, `dev-lsanchez` (remoto). Rama activa de trabajo: `dev-racosta`.
- **Producto/portafolio:** PizzIA.

## Stack tecnológico

### Backend (`/`)
| Tecnología | Versión |
|---|---|
| Python | 3.11.9 (`runtime.txt`) |
| Django | 5.0.6 |
| Django REST Framework | 3.15.1 |
| django-tenants | >=3.5 (multi-tenant por esquema PostgreSQL) |
| djangorestframework-simplejwt | >=5.3 (JWT stateless) |
| django-cors-headers | 4.3.1 |
| django-filter | 24.2 |
| Pillow / cloudinary / django-cloudinary-storage | Imágenes y media en Cloudinary |
| openpyxl | >=3.1 (export a Excel) |
| psycopg2-binary / dj-database-url | PostgreSQL |
| python-decouple | Variables de entorno |

### Frontend (`/frontend`)
| Tecnología | Versión |
|---|---|
| React | 18.2 |
| Vite | 5.1 |
| Ant Design | 5.14 (+ @ant-design/icons) |
| react-router-dom | 6.22 |
| axios | 1.6 |
| recharts | 2.12 |
| dayjs | 1.11 |

## Cómo ejecutar

### Backend (desarrollo local)
```bash
python -m venv venv
venv\Scripts\activate            # Windows
pip install -r requirements.txt
# Configurar .env (copiar .env.example) con PostgreSQL local (DB_NAME=inventario_saas)
python manage.py migrate_schemas --shared
python manage.py migrate_schemas
python manage.py create_initial_plans
python manage.py runserver       # http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173 (o 5175)
```

> ⚠️ El backend usa `django_tenants.postgresql_backend`, **no SQLite**. Los archivos `db.sqlite3` y `db_v2.sqlite3` en la raíz son restos de una versión anterior (monolítica pre-SaaS).

## Arquitectura clave

### Multi-tenancy (path-based)
- Un esquema PostgreSQL por negocio. Modelo tenant: `apps.clientes_saas.Cliente` (`TENANT_MODEL`), dominio: `Domain`.
- Las rutas de negocio son **tenant-aware**: `/t/{schema}/api/...` (no por subdominio).
- `config/tenant_middleware.py` (`TenantFromPathMiddleware`) activa el schema correcto leyendo el slug del path.
- Apps compartidas (`SHARED_APPS`) vs. apps de tenant (`TENANT_APPS`) en `config/settings.py`.

### Rutas
- Públicas: `config/urls.py` → `/api/public/...` (registro, planes, tenant-lookup, platform-login, tenant-token) y `/api/auth/...`.
- Negocio: `config/tenant_urls.py` → `/t/{schema}/api/...` (productos, ventas, compras, proveedores, clientes, capital, servicios, transacciones, reportes, fiados, core, backups).
- **Panel de Control** (dueños del SaaS): `config/urls.py` → `/api/panel/...` (`apps/panel`, solo schema public). **Nunca** registrar sus rutas en `tenant_urls.py`. Frontend en `frontend/src/panel/` (`/panel/*`).

### Autenticación y roles
- **JWT stateless** (simplejwt). ACCESS 60 min, REFRESH 7 días, sin rotación ni blacklist (incompatibilidad FK cross-schema).
- **Todo JWT lleva el claim `schema`** y `apps.core.jwt.SchemaBoundJWTAuthentication` (la autenticación por defecto) lo exige igual al schema activo. Para emitir tokens fuera del login estándar usa `apps.core.jwt.refresh_para_usuario(user, schema)`, nunca `RefreshToken.for_user` a secas.
- **Panel de Control**: tokens de tipo propio (`panel_access`/`panel_refresh`, `apps/panel/auth.py`) solo para staff/superuser del schema public. Admins con `python manage.py crear_admin_panel`.
- Roles: `GERENTE`, `COLABORADOR`, `VENDEDOR` (VENDEDOR es legacy/alias de colaborador).
- **RBAC avanzado** (`RolPersonalizado`, permisos JSON) solo en plan **EMPRESARIO** (`IsEmpresarioPlan`).
- Permisos en `apps/core/permissions.py`: `IsGerente`, `IsVendedorPlus`, `HasRBACScope`, `IsEmpresarioPlan`.
- Acceso colaboradores por **código de acceso** (`Cliente.codigo_acceso`, 8 caracteres alfanuméricos).

### Stock / Kardex
- `apps.inventario.models.MovimientoStock` es la **única fuente de verdad del stock** (kardex). Su `save()` es atómico (`select_for_update` + update).
- Ventas, compras, fiados, productos y ajustes generan `MovimientoStock` (ENTRADA/SALIDA con origen COMPRA/VENTA/FIADO/AJUSTE/DEVOLUCION/MERMA/CADUCIDAD/EXTRAVIO/ROTURA).

### Suscripciones
- `apps/suscripciones/estado.py` es la fuente única del estado (`activa`, `por_vencer`, `sandbox`, `vencida`, `suspendida`, `sin_suscripcion`) y de `tiene_acceso()`.
- `TenantFromPathMiddleware` bloquea `/t/{schema}/api/` con **402 `SUSCRIPCION_INACTIVA`** si el negocio no tiene acceso. Toda operación sobre suscripciones pasa por `apps/panel/services.py` (y queda auditada en `MovimientoSuscripcion`).

### Auditoría
- `apps/core/middleware.py` (`ThreadLocalMiddleware` + `get_current_user()`) permite que los `save()` de los modelos registren automáticamente el usuario sin request explícito.

## Estructura del proyecto

```
config/                # settings.py, urls.py, tenant_urls.py, tenant_middleware.py, wsgi.py
apps/
  core/                # auth, usuarios, roles, backups, middleware, signals, export_utils
  clientes_saas/       # tenant público (Cliente, Domain), registro SaaS, tenant-token
  suscripciones/       # Plan, Suscripcion, Culqi
  inventario/          # Producto, Categoria, MovimientoStock (kardex)
  ventas/              # Venta, DetalleVenta, MovimientoEstadoVenta
  compras/             # Compra, DetalleCompra
  proveedores/         # Proveedor, HistoricoPrecio, MovimientoProveedor
  clientes/            # Cliente, SegmentoCliente, MovimientoEstadoCliente
  capital/             # Capital, TipoCapital, MovimientoCapital
  servicios/           # Servicio, VentaServicio, CompraServicio, ServicioContratado
  transacciones/       # Transaccion, CategoriaTransaccion (ingresos/egresos no operativos)
  reportes/            # Balance, Dashboard, Reporte mensual (solo views, sin modelos)
  fiados/              # Fiado, DetalleFiado*, ClienteFiado (legacy), HistorialFiado
  panel/               # Panel de Control (SHARED): Pago, Gasto, MovimientoSuscripcion, métricas
frontend/              # React + Vite + AntD (src/pages, src/components, src/services/api.js)
```

## Documentación del proyecto

- **`ESTADO_PROYECTO.md`** (este repo): estado actual, incidencias conocidas y próximos pasos.
- **Vault de Obsidian:** `D:\Obsidian_vaults\Proyectos_PizzIA\ProyectoInventario\` — mapa completo con notas enlazadas (índice en `00-Indice.md`).
- **`README.md`** y **`QUICKSTART.md`**: guías originales (parcialmente desactualizadas respecto al SaaS v2).
- Servidor MCP `obsidian-vault` (filesystem) apunta a ese vault (ver `opencode.json` y `.agents/`).

## Convenciones y gotchas (leer antes de tocar código)

1. **No usar SQLite**: el backend requiere PostgreSQL + django-tenants. Migrar con `migrate_schemas`.
2. **Nunca romper `MovimientoStock.save()`**: es el corazón del kardex/stock.
3. **Código de "Almacenes/Cajas"** (se conserva **a propósito**, por si se retoma la idea; no eliminarlo sin preguntar): los modelos `Almacen`, `StockAlmacen`, `TrasladoStock`, `HistorialAsignacionAlmacen` fueron eliminados (migraciones "emptied"). Quedan referencias rotas:
   - `apps/inventario/views.py` → `ProductoViewSet.ajustar_stock`
   - `apps/inventario/serializers.py` → `MovimientoStockCreateSerializer.Meta.fields` incluye `'almacen'`
   - `apps/core/backup_views.py` → `restore_backup` referencia `TrasladoStock`
4. **`ClienteFiado` ya no existe** (migración `fiados.0009`): los fiados usan `apps.clientes.Cliente`.
5. **Backups**: toda la lógica está en `apps/core/backup_service.py` (respaldo completo de `BACKUP_APPS`, restauración atómica con respaldo de seguridad previo). Los ZIP se guardan en la BD (`RegistroBackup.contenido`) porque el servicio cron y el web de Railway no comparten disco. `run_backups` (cron cada hora, `railway.backups.toml`) recorre todos los tenants, crea la configuración por defecto (diario 03:00) y usa un advisory lock contra ejecuciones simultáneas. `AjusteStockModal.jsx` está incompleto y se conserva con los almacenes.
9. **Entorno local**: hay PostgreSQL portátil y un venv; ver la sección "Entorno local" de `ESTADO_PROYECTO.md`. Los tests del panel están en `apps/panel/tests/`.
6. **Roles**: el colaborador accede por **código de acceso**, no por subdominio. El login de Gerente usa `platform-login` (email) + `tenant-token`.
7. **Deploy**: backend en **Railway** (`railway.toml`, gunicorn; servicio cron de respaldos con `railway.backups.toml`), frontend en **Vercel** (`vercel.json`).
8. Los `admin.py` están vacíos (no hay registros en el admin de Django).
