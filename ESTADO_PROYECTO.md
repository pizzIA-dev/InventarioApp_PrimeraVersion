# ESTADO_PROYECTO.md — Estado actual del proyecto

> Documento vivo con el estado del proyecto NegocIA (inventario y balance SaaS). Actualizado por última vez: 2026-11-19.
> Complemento del índice del vault: `D:\Obsidian_vaults\Proyectos_PizzIA\ProyectoInventario\00-Indice.md`.

## Documentación detallada disponible

Además de este archivo, en el vault de Obsidian hay catálogos a nivel de campo/endpoint (leer antes de tocar código):
- `Base-de-datos.md` → catálogo completo de modelos (campos, tipos, choices, relaciones, métodos).
- `Backend.md` → catálogo completo de endpoints/ViewSets/actions por app.
- `Frontend.md` → referencia completa de `api.js`, rutas, contextos y storage.
- `Autenticacion-y-Roles.md` y `Multi-tenancy-SaaS.md` → detalle de auth, roles y SaaS.

## Resumen ejecutivo

**NegocIA** es un SaaS multi-tenant (django-tenants) de inventario y balance para negocios de venta directa. El core funcional (los 10 módulos de negocio + fiados + usuarios/roles + backups) está **implementado y funcional**, con frontend React/AntD completo y despliegue configurado en Railway (backend) + Vercel (frontend).

Se pasó de una **v1 monolítica (SQLite, sin multi-tenant)** a una **v2 SaaS multi-tenant** con esquema PostgreSQL por negocio, autenticación JWT, suscripciones con pago Culqi y acceso por código de acceso.

## Estado por módulo

| Módulo | App(s) | Estado |
|---|---|---|
| Dashboard | `reportes` + `frontend/Dashboard` | ✅ Funcional (métricas, gráficos, filtros año/mes/producto/servicio) |
| Productos + stock/kardex | `inventario` | ✅ Funcional (CRUD, stock bajo, movimientos, export Excel) |
| Proveedores | `proveedores` | ✅ Funcional (CRUD, histórico de precios, export) |
| Clientes | `clientes` | ✅ Funcional (CRUD, recurrencia, kardex, export) |
| Ventas (productos y servicios) | `ventas` + `servicios.VentaServicio` | ✅ Funcional (comprobantes, boleta/factura, IGV, cancelación con motivo, kardex) |
| Compras (productos y servicios) | `compras` + `servicios.CompraServicio` | ✅ Funcional (estados, confirmación, reversión) |
| Capital / activos | `capital` | ✅ Funcional (tipos, depreciación, kardex, export) |
| Servicios ofrecidos + categorías | `servicios` | ✅ Funcional (catálogo, duración, kardex, export) |
| Transacciones no operativas | `transacciones` | ✅ Funcional (ingresos/egresos, categorías, auditoría) |
| Reportes / balance | `reportes` | ✅ Funcional (balance, composición, top 10, reporte mensual Excel) |
| Fiados (créditos) | `fiados` | ✅ Funcional (abonos, liquidación → venta automática, cancelación/reactivación) |
| Registro SaaS + planes + pago | `clientes_saas` + `suscripciones` | ✅ Funcional (registro, Culqi, planes Emprendedor/Empresario) |
| Auth + roles + usuarios | `core` | ✅ Funcional (JWT, GERENTE/COLABORADOR, RBAC plan Empresario, código de acceso) |
| Backups | `core` | ✅ Rehecho (2026-11-19): respaldo completo de las 9 apps de negocio, manual y automático (`run_backups` recorre todos los negocios), descarga autenticada y restauración atómica con respaldo de seguridad previo. El automático requiere crear el servicio cron (ver "Respaldos automáticos en Railway") |
| **Panel de Control (back-office)** | `panel` + `frontend/src/panel` | ✅ Nuevo (2026-11-19): empresas, activación/extensión/suspensión manual, pagos, gastos, métricas (MRR/ARPU) y auditoría. Ver `ESPECIFICACION-Panel-de-Control.md` §0 |

## Historial reciente (destacado)

- **2026-03 → 2026-04** (`RoAlro`): v1 monolítica. Se construyeron los módulos de negocio (productos, proveedores, compras, ventas, clientes, servicios, capital, transacciones, reportes, fiados), kardex, export Excel, autenticación y roles.
- **2026-04-24 → 2026-05-31** (`Luis Sanchez`): **migración a SaaS v2** — multi-tenancy (django-tenants, path-based), registro SaaS, planes, pago Culqi, despliegue Railway/Vercel.
- **2026-06-xx**: estabilización de fiados (unificación de cliente con `clientes.Cliente`, liquidación automática a venta), compras de servicios (`ServicioContratado`), múltiples fixes de build React (error 310, lazy/Suspense, hooks).
- **2026-07-31**: rediseño de login y permisos por roles (`feat(auth)`), tabs Gerente/Colaborador.
- **2026-08-03**: `codigo_acceso` alfanumérico para acceso de colaboradores; fix de seguridad en `tenant-lookup` (solo acepta `codigo_acceso`, no `schema_name`).
- **2026-11-19**: **Panel de Control** (`apps/panel`, `/api/panel/`, `/panel/*`) para los dueños del SaaS. Además:
  - **Seguridad (JWT):** todo token lleva el claim `schema` (`apps/core/jwt.py`); un token de un negocio ya no sirve en otro. ⚠️ Al desplegar, todos los usuarios deben iniciar sesión otra vez una vez.
  - **Bloqueo inmediato:** una suscripción suspendida o vencida corta el acceso en la siguiente petición (402 `SUSCRIPCION_INACTIVA` desde `TenantFromPathMiddleware`).
  - Las cuentas staff del schema public ya no pueden ser sobrescritas por un registro con el mismo username.
  - Corregido el error de sintaxis de `Login.jsx` (`.trim(...)`): impedía compilar el frontend.
- **2026-11-19 (2)**: resolución de deuda técnica:
  - **Backups** rehechos (`apps/core/backup_service.py`): antes no existía `generar`, el automático nunca corría (se ejecutaba en public), el respaldo omitía tablas (detalles de venta y compra, fiados, servicios…) y restaurar fallaba o perdía datos. Los ZIP se guardan como archivos "raw" (o en `private_media/` en local) y se descargan solo vía API.
  - **`ClienteFiado` eliminado**: la migración `fiados.0009` copia sus filas huérfanas a `clientes.Cliente` (sin duplicar) y borra la tabla. "Exportar clientes" de Fiados ahora exporta los clientes reales con su deuda.
  - Eliminados 8 componentes sin uso (`VentaTable`, `VentaFilters`, `CompraFormModal`, `CompraFilters`, `CompraTable`, `Movimiento*`) y `ClienteFiadoHistorialModal`.
  - **Encoding reparado** en 9 archivos (~1.200 caracteres mal codificados, incluidos mensajes visibles como "contraseña" y "suscripción").

## Incidencias / deuda técnica conocida

### Backend
1. **Código de "Almacenes/Cajas"** (se conserva a propósito por si se retoma la idea; no eliminar): modelos `Almacen`, `StockAlmacen`, `TrasladoStock`, `HistorialAsignacionAlmacen` eliminados (migraciones "emptied"), pero quedan referencias rotas:
   - `apps/inventario/views.py` → `ProductoViewSet.ajustar_stock` (NameError si se invoca).
   - `apps/inventario/serializers.py` → `MovimientoStockCreateSerializer.Meta.fields` incluye `'almacen'`.
   - `apps/core/backup_views.py` → `restore_backup` referencia `TrasladoStock` (NameError).
2. **`Transaccion` sin campo `usuario` propio**: los exports de transacciones muestran "−" como responsable (la auditoría va por `HistorialTransaccion`/`MovimientoCategoria`).
3. ~~**`ClienteFiado` es legacy**~~ → **eliminado 2026-11-19** (datos migrados a `clientes.Cliente`).
4. **Reversión de compras por `referencia`** (menos robusta que la de ventas, que genera movimiento inverso).
5. `admin.py` vacíos en todas las apps (sin registros en el admin de Django).

### Frontend
6. **`AjusteStockModal.jsx`** está incompleto (depende de almacenes); **se conserva a propósito** junto con el resto del código de almacenes. No se importa, así que no afecta al build.
7. ~~**`Backups.jsx`** llama a `backupsAPI.generar()` inexistente~~ → **resuelto 2026-11-19** (ver historial).
8. ~~**`Login.jsx`** (línea ~163): argumentos incorrectos a `.trim()`~~ → **corregido 2026-11-19** (era un error de sintaxis que rompía el build).
9. ~~Componentes extraídos sin uso~~ → **eliminados 2026-11-19**.
10. ~~Encoding corrupto~~ → **reparado 2026-11-19**. Quedan algunos strings escritos sin tildes a mano (no es corrupción).

## Próximos pasos sugeridos (roadmap)

- [ ] ~~Eliminar referencias a `Almacen`/`StockAlmacen`/`TrasladoStock`~~ → **decisión 2026-11-19: se conservan** por si se implementan los almacenes en el futuro.
- [x] Implementar `backupsAPI.generar()` y el endpoint de respaldo manual (más descarga y restauración seguras).
- [x] Código del cron de respaldos listo (`railway.backups.toml`, ZIP en BD, configuración por defecto, candado y aislamiento por negocio).
- [ ] **Crear el servicio cron en Railway** (pasos en "Respaldos automáticos en Railway").
- [x] Corregir `Login.jsx` (argumentos de `.trim()` y paso de `codigo_acceso`).
- [x] Eliminar componentes extraídos sin uso (`AjusteStockModal.jsx` se conserva con los almacenes).
- [ ] Conectar boletas/facturas con **SUNAT** (pendiente desde v1; hoy son comprobantes internos).
- [x] Consolidar `ClienteFiado` legacy → `clientes.Cliente` y eliminar el modelo legacy.
- [ ] (Opcional) `Transaccion.usuario` para auditoría directa en exports.
- [x] Normalizar el encoding (frontend y backend).
- [ ] Panel v2: webhook de Culqi, tasa de cambio PEN/USD, recordatorios de vencimiento y varios admins con roles.
- [ ] Deriva de migración preexistente: `clientes_saas.Cliente.owner_email.help_text` difiere de la migración 0002 (solo una tilde; `makemigrations` la detecta).

## Respaldos automáticos en Railway (configuración única)

El código ya está listo; falta crear **un segundo servicio** en el proyecto de Railway que ejecute `run_backups` cada hora. Usa `railway.backups.toml`.

1. En el proyecto de Railway: **New → GitHub Repo →** el mismo repositorio. Elige **la misma rama** que despliega el servicio web.
2. En el nuevo servicio (por ejemplo, `respaldos`): **Settings → Config-as-code → Railway Config File** = `/railway.backups.toml`. Así toma el cron `0 * * * *`, el comando `python manage.py run_backups` y **no** ejecuta migraciones.
3. **Variables** (como referencias, para no copiar secretos):
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (usa el nombre real de tu servicio de base de datos)
   - `SECRET_KEY` = `${{<servicio-web>.SECRET_KEY}}`
   - `DEBUG` = `False`
   No necesita dominio público, CORS ni Cloudinary: los ZIP se guardan en la propia base de datos.
4. Despliega. Para probar sin esperar a la hora: botón **Run now** del cron, o cambia temporalmente el comando a `python manage.py run_backups --forzar`.
5. Revisa el log: termina con `run_backups: N generados, M sin respaldo pendiente, 0 con error.` Si algún negocio falla, la ejecución sale con error y Railway la marca en rojo.
6. En el Panel de Control, el detalle de cada empresa muestra la tarjeta **Respaldos** (último correcto, fallos y si el Gerente los desactivó).

Notas:
- Railway ejecuta el cron en UTC; el comando decide por la hora de Lima de cada negocio (por defecto, 03:00 diario). Los negocios sin configuración reciben la configuración por defecto.
- Se conservan 7 respaldos por negocio (unos KB cada uno).
- Estos respaldos protegen frente a errores de los usuarios (restaurar el negocio a un día anterior). Ante la **pérdida de la base completa** protegen los backups nativos de Railway Postgres: actívalos en el servicio de la base (pestaña Backups).

## Entorno local (Windows, 2026-11-19)

- `venv/` con Python 3.13 (Django 5.0.6 funciona) y `pip install -r requirements.txt`.
- PostgreSQL 16 portátil (sin servicio de Windows) en `D:\PROYECTOPROGRAMACION\_tools\pgsql`, datos en `_tools\pgdata`, puerto 5432, usuario y contraseña `postgres`/`postgres` (los valores por defecto de `settings.py`):
  - Iniciar: `D:\PROYECTOPROGRAMACION\_tools\pgsql\bin\pg_ctl.exe -D D:\PROYECTOPROGRAMACION\_tools\pgdata -l D:\PROYECTOPROGRAMACION\_tools\pg.log start`
  - Detener: la misma ruta con `stop`.
- BD `inventario_saas` con dos negocios de prueba en sandbox (`bodegademo`, `ferrenorte`) y un admin del panel. Las credenciales están comentadas en `.env` (no versionado).
- Tests: `venv\Scripts\python manage.py test apps` (panel + respaldos).
- `.claude/launch.json` define `backend` (runserver :8000) y `frontend` (vite :5173).
