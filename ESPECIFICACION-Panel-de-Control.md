# ESPECIFICACIÓN — Panel de Control (Back-office de Propietarios)

> Documento de diseño del módulo de administración para los **dueños del SaaS NegocIA**.
> Estado: **implementado (v1)** el 2026-11-19 en `dev-racosta`. La sección 0 resume lo que cambió respecto a la propuesta original (secciones 1–13, que se conservan como referencia).

---

## 0. Implementación v1: decisiones finales y cambios respecto a la propuesta

| Tema | Propuesta original | Implementado | Motivo |
|---|---|---|---|
| Nombre de la app | `apps/platform` | **`apps/panel`** (en `SHARED_APPS`) | `platform` choca con el módulo estándar de Python. |
| Prefijo de API | `/api/platform/` | **`/api/panel/`** (solo en `config/urls.py`) | Coherente con la ruta del frontend `/panel`. |
| Token del panel | JWT normal + chequeo de staff | **Tipo de token propio** (`panel_access` / `panel_refresh`) + `PanelJWTAuthentication` + `IsPanelAdmin` | Un JWT normal del schema public también lo usan los Gerentes (platform-login). Con un tipo propio, los tokens de negocio no sirven en el panel y viceversa. Además, cada petición vuelve a verificar `is_staff`/`is_superuser`. |
| Login | Sin límite | **Throttle de 10 intentos por minuto** en login y refresh; mismo mensaje para "no existe" y "no es staff" | Evita fuerza bruta y no revela qué cuentas existen. |
| Almacenamiento en el frontend | `platform_access_token`… | **`panel_access_token`, `panel_refresh_token`, `panel_user`** en `sessionStorage` | `platform_*` ya lo usa el login de Gerentes. |
| Duración por defecto | 30 días | **1 mes calendario** (19/11 → 18/12), o N días, o una fecha exacta | Coincide con lo que el cliente espera ("pagué un mes"). |
| Inicio del periodo | Hoy si está suspendida | **Al día siguiente de `fecha_fin` si todavía quedan días** (aunque esté suspendida); si ya venció, hoy | El cliente no pierde días pagados. |
| Estados | activa/vencida/suspendida/sandbox | **`activa`, `por_vencer` (≤7 días), `sandbox`, `vencida`, `suspendida`, `sin_suscripcion`** en `apps/suscripciones/estado.py` | Fuente única que usan el middleware, los logins y el panel. |
| Pago `estado` | REGISTRADO/CONFIRMADO/REVERSADO | **CONFIRMADO / REVERSADO**; los pagos **no se eliminan ni cambian de monto** (`POST /pagos/{id}/revertir/` con motivo); solo se editan la referencia, el método y las notas | Integridad del historial financiero. |
| Pago | — | Campos **`periodo_inicio` / `periodo_fin`** | Cada pago muestra qué periodo cubrió. |
| `MovimientoSuscripcion` | FK a `Suscripcion` (CASCADE) | **FK a `Cliente` (PROTECT)** + `usuario_nombre`; acción nueva `REVERSION_PAGO` | La auditoría sobrevive aunque se recree la suscripción o se borre el usuario. |
| Gasto | 5 categorías | Se agrega la categoría `SERVICIOS` | Licencias y SaaS de terceros. |
| Métricas | Ingresos, gastos, MRR | Además: **ARPU**, número de pagantes, **serie mensual de 12 meses**, recaudación histórica y lista de "requieren atención". PEN y USD siempre por separado | — |
| Acceso al negocio | No contemplado | **Bloqueo inmediato**: `TenantFromPathMiddleware` responde **402 `SUSCRIPCION_INACTIVA`** en `/t/{schema}/api/` si la suscripción está suspendida o vencida. El frontend cierra la sesión y muestra el aviso en `/acceder` | Antes, al suspender solo se bloqueaba el siguiente login (las sesiones seguían hasta 7 días). |
| Admin del panel | `createsuperuser` | Comando **`python manage.py crear_admin_panel --username X [--email] [--superuser]`** (siempre en el schema public) | Evita crear el usuario en un schema equivocado. Se recomienda un username que no sea un email. |

### Endpoints finales (`/api/panel/`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `auth/login/`, `auth/refresh/` | Login y refresh del panel (públicos, con throttle) |
| GET | `auth/me/` | Admin actual |
| GET | `metricas/?desde=&hasta=` | KPIs (por defecto, el mes actual) |
| GET | `planes/` | Planes disponibles |
| GET | `empresas/?search=&estado=&plan=&ordering=&page=` | Listado (`estado` acepta varios separados por coma) |
| GET | `empresas/{id}/` | Detalle con los últimos 50 pagos, 50 movimientos y el total pagado |
| POST | `empresas/{id}/activar/` | **Pago y activación/extensión atómicos.** Body: `plan_id?, monto, moneda, metodo_pago, referencia?, fecha_pago?, meses|dias|fecha_fin, notas?`. Devuelve `avisos` si la referencia ya existe |
| POST | `empresas/{id}/extender/` | Extensión sin pago (cortesía) |
| POST | `empresas/{id}/suspender/`, `reactivar/` | `{notas?}` |
| POST | `empresas/{id}/cambiar-plan/` | `{plan_id, notas?}` |
| GET/POST/PATCH | `pagos/` | Listado, pago suelto (sin tocar la suscripción) y corrección de datos descriptivos |
| POST | `pagos/{id}/revertir/` | `{motivo}` |
| CRUD | `gastos/` | — |
| GET | `movimientos/?empresa_id=&accion=&fecha_desde=&fecha_hasta=` | Auditoría |

### Seguridad adicional corregida junto con el panel

1. **JWT atado al schema** (`apps/core/jwt.py`): todo token lleva el claim `schema` y `SchemaBoundJWTAuthentication` (la autenticación por defecto de DRF) lo rechaza si no coincide con el schema de la petición. Antes, un token del negocio A servía en `/t/B/` como el usuario con el mismo id (normalmente su Gerente). El refresh también verifica el schema. **Efecto del despliegue:** todas las sesiones abiertas tienen que volver a iniciar sesión una vez.
2. **Cuentas staff protegidas**: `_crear_usuario_plataforma` (registro y platform-login) ya no reemplaza la contraseña de un usuario staff/superuser del schema public. Antes, registrar un negocio con el username de un admin le cambiaba la contraseña.
3. `tenant-token` ahora también verifica que la suscripción esté activa.

### Archivos

- Backend: `apps/panel/{models,auth,services,serializers,views,urls,admin}.py`, `apps/panel/management/commands/crear_admin_panel.py`, `apps/panel/tests/test_panel.py` (22 tests), `apps/suscripciones/estado.py`, `apps/core/jwt.py`; cambios en `config/settings.py`, `config/urls.py`, `config/tenant_urls.py`, `config/tenant_middleware.py`, `apps/core/auth_views.py` y `apps/clientes_saas/views.py`.
- Frontend: `frontend/src/panel/` (`PanelApp`, `panelApi`, `PanelAuthContext`, `utils`, `panel.css`, `components/`, `pages/`), cargado de forma diferida desde `App.jsx` en `/panel/*`. El cliente `api.js` de los negocios maneja el 402 y `Landing.jsx` muestra el aviso.

### Despliegue (Railway)

1. El `preDeployCommand` ya ejecuta `migrate_schemas --shared`, que crea las tablas del panel en public.
2. Crear el primer admin: `railway run python manage.py crear_admin_panel --username <usuario> --email <correo> --superuser` (pide la contraseña).
3. Entrar en `https://<frontend>/panel/login`.
4. Revisar las suscripciones en sandbox **sin `fecha_fin`**: tienen acceso indefinido hasta que se registre un pago o se extiendan con una fecha.

### Pendiente (v2)

- Webhook de Culqi (§10): llamará a `services.registrar_pago_y_activar(..., metodo_pago='CULQI')`.
- Tasa de cambio PEN/USD para consolidar las métricas.
- Varios admins con roles de plataforma (`PlatformUser`).
- Recordatorios por email antes del vencimiento (los datos ya están en `estado=por_vencer`).
> Se basa en el mapeo real del proyecto (ver `CLAUDE.md`, `ESTADO_PROYECTO.md` y el vault en `D:\Obsidian_vaults\Proyectos_PizzIA\ProyectoInventario\`).

---

## 1. Resumen y objetivo

El SaaS **NegocIA** es multi-tenant (django-tenants, un esquema PostgreSQL por negocio). Hoy el **cobro es manual**: un cliente paga por fuera y no existe una forma oficial de activar/extender su suscripción ni de ver el estado global del negocio (cuántas empresas, cuánto ingresa, cuánto se gasta).

Este documento especifica un **Panel de Control (back-office)** exclusivo para los propietarios/administradores del software, con tres propósitos:

1. **Monitorear** todas las empresas (tenants) y el estado de sus suscripciones.
2. **Gestionar suscripciones manualmente** (activar, extender, suspender, reactivar) mientras no haya cobro automático por pasarela.
3. **Registrar ingresos y gastos** de la plataforma y ver métricas (ingresos, gastos, balance, MRR).

**Principio de seguridad:** este panel vive **fuera** de la aplicación de los tenants. Ningún usuario de un negocio (Gerente/Colaborador/Vendedor) puede acceder a él.

---

## 2. Alcance

### Incluido (v1)
- Autenticación propia de plataforma (solo administradores).
- Listado y detalle de empresas (tenants) con estado de suscripción.
- Activación / extensión / suspensión / reactivación manual de suscripciones con duración configurable (por defecto 1 mes).
- Registro manual de pagos (ingresos) y gastos.
- Métricas: ingresos, gastos, balance, MRR, empresas activas/vencidas/en sandbox.
- Auditoría de acciones sobre suscripciones.

### Fuera de alcance (v1)
- Cobro automático por Culqi (se deja preparado el punto de extensión, ver §10).
- Gestión de facturación electrónica / SUNAT.
- Multi-admin con roles granulares de plataforma (v1 = superusuario Django del esquema public; se puede evolucionar a un modelo `PlatformUser`).

---

## 3. Decisiones de arquitectura

| Decisión | Elección | Justificación |
|---|---|---|
| Ubicación de la app | Nueva app **`apps/platform`** en el esquema **public** (agregada a `SHARED_APPS`) | Los datos de plataforma (tenants, pagos, gastos) no pertenecen a ningún tenant; deben vivir en `public` |
| Autenticación | **Superusuario/staff de Django del esquema public** + permiso `IsPlatformStaff` | Rápido y suficiente para v1; se puede migrar a `PlatformUser` luego |
| Rutas | Prefijo **`/api/platform/...`** registrado en `config/urls.py` (nunca en `config/tenant_urls.py`) | Garantiza que no sean alcanzables vía `/t/{schema}/...` |
| Frontend | Sección dedicada `/panel/*` en la SPA con contexto de auth propio y cliente axios propio (sin prefijo tenant) | Reutiliza el stack; el backend impone la seguridad real |
| Reuso | Reutiliza `Cliente` (tenant), `Plan` y `Suscripcion` existentes | No duplicar el modelo de suscripciones |

### 3.1 Cambios en `config/settings.py`

Agregar `apps.platform.apps.PlatformConfig` a `SHARED_APPS` (NO a `TENANT_APPS`):

```python
SHARED_APPS = [
    'django_tenants',
    'apps.clientes_saas',
    'apps.suscripciones',
    'apps.platform',            # ← NUEVO: back-office (solo esquema public)
    # ... resto igual
]
```

> ⚠️ Al agregar a `SHARED_APPS`, las tablas de `platform` se crean solo en el esquema `public` al correr `migrate_schemas --shared`.

### 3.2 Cambios en `config/urls.py`

```python
urlpatterns = [
    # ... rutas existentes ...
    path('api/platform/', include('apps.platform.urls')),   # ← NUEVO
]
```

No se toca `config/tenant_urls.py`.

---

## 4. Roles y seguridad

### 4.1 Modelo de acceso (v1)

- Usuarios de plataforma = **superusuarios (`is_superuser=True`) o staff (`is_staff=True`) del esquema `public`**.
- El login de plataforma emite un JWT que **solo se emite si el usuario es staff/superuser**.
- Los tokens de los tenants **no sirven** para el panel (se validan en otro esquema y con otro serializador).

### 4.2 Clase de permiso `IsPlatformStaff` (`apps/platform/permissions.py`)

```python
from rest_framework import permissions

class IsPlatformStaff(permissions.BasePermission):
    """Solo staff/superuser del esquema public pueden usar el panel."""
    message = "Acceso restringido al personal de la plataforma."

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.is_staff)
        )
```

Toda vista del panel usa `permission_classes = [IsPlatformStaff]` (salvo el webhook de Culqi, §10).

### 4.3 Serializador de token de plataforma

`PlatformTokenObtainPairSerializer`: igual que `CustomTokenObtainPairView`, pero:
- Autentica contra el esquema **public** (sin `set_tenant`).
- Rechaza con 403 si el usuario no es `is_staff`/`is_superuser`.
- Claims: `user_id`, `username`, `email`, `is_platform: true`.

### 4.4 Reglas de seguridad

1. Ninguna ruta del panel se registra en `tenant_urls.py`.
2. El frontend de los tenants no importa el contexto/cliente del panel.
3. Toda acción crítica (activar/extender/suspender) queda registrada en `MovimientoSuscripcion` con el usuario que la ejecutó.

---

## 5. Modelo de datos (nuevos modelos en `apps/platform/models.py`)

Todos viven en el esquema `public`. Convención: auditoría con `usuario_plataforma` (FK a `AUTH_USER_MODEL`, el superusuario).

### 5.1 `Pago` — ingreso por suscripción (manual o futura pasarela)

| Campo | Tipo | Notas |
|---|---|---|
| `empresa` | FK(`clientes_saas.Cliente`, `PROTECT`, `related_name='pagos'`) | PROTECT evita borrar historial si se borra el tenant |
| `plan` | FK(`suscripciones.Plan`, `PROTECT`, null=True, blank=True) | Plan pagado (null si pago ad-hoc) |
| `monto` | Decimal(10,2) | Monto pagado |
| `moneda` | CharField(3, choices `PEN`/`USD`, default `PEN`) | |
| `metodo_pago` | CharField(20, choices `TRANSFERENCIA`/`EFECTIVO`/`YAPE`/`TARJETA`/`CULQI`/`OTRO`) | |
| `referencia` | CharField(100, null) | Comprobante / nro. de operación |
| `fecha_pago` | DateField | |
| `estado` | CharField(20, choices `REGISTRADO`/`CONFIRMADO`/`REVERSADO`, default `CONFIRMADO`) | |
| `notas` | TextField(null) | |
| `usuario_plataforma` | FK(`AUTH_USER_MODEL`, `SET_NULL`, null) | Quién lo registró |
| `creado_en` | DateTimeField(auto_now_add) | |

`Meta.ordering = ['-fecha_pago', '-creado_en']`.

### 5.2 `Gasto` — egreso operativo de la plataforma

| Campo | Tipo | Notas |
|---|---|---|
| `concepto` | CharField(200) | |
| `categoria` | CharField(30, choices `INFRAESTRUCTURA`/`PASARELA`/`PERSONAL`/`MARKETING`/`OTRO`) | |
| `monto` | Decimal(10,2) | |
| `moneda` | CharField(3, choices `PEN`/`USD`, default `PEN`) | |
| `fecha` | DateField | |
| `notas` | TextField(null) | |
| `usuario_plataforma` | FK(`AUTH_USER_MODEL`, `SET_NULL`, null) | |
| `creado_en` | DateTimeField(auto_now_add) | |

### 5.3 `MovimientoSuscripcion` — auditoría de acciones sobre suscripciones

| Campo | Tipo | Notas |
|---|---|---|
| `suscripcion` | FK(`suscripciones.Suscripcion`, `CASCADE`, `related_name='movimientos_plataforma'`) | |
| `usuario_plataforma` | FK(`AUTH_USER_MODEL`, `SET_NULL`, null) | |
| `accion` | CharField(30, choices `CREACION`/`ACTIVACION`/`EXTENSION`/`SUSPENSION`/`REACTIVACION`/`CAMBIO_PLAN`) | |
| `detalle` | TextField | Resumen legible |
| `fecha_fin_anterior` | DateField(null) | |
| `fecha_fin_nueva` | DateField(null) | |
| `plan_anterior` | FK(`Plan`, null) | |
| `plan_nuevo` | FK(`Plan`, null) | |
| `pago` | FK(`Pago`, `SET_NULL`, null) | Vincula el pago si lo hubo |
| `creado_en` | DateTimeField(auto_now_add) | |

---

## 6. Lógica de negocio (`apps/platform/services.py`)

### 6.1 `registrar_pago(...)`
Crea `Pago`. Si se indica, dispara la activación/extensión de la suscripción asociada (ver 6.2).

### 6.2 `activar_o_extender_suscripcion(suscripcion, *, plan=None, duracion_dias=None, fecha_fin=None, pagador=None, pago=None)`

Regla de duración (por defecto **1 mes = 30 días**, configurable):

```
hoy = today()
si fecha_fin explícita:
    nueva_fecha_fin = fecha_fin
sino:
    base = suscripcion.fecha_fin si (suscripcion.activa y suscripcion.fecha_fin > hoy) else hoy
    nueva_fecha_fin = base + timedelta(days=duracion_dias or 30)
```

Luego:
1. `suscripcion.plan = plan or suscripcion.plan`
2. `suscripcion.activa = True`
3. `suscripcion.fecha_inicio = suscripcion.fecha_inicio or hoy`
4. `suscripcion.fecha_fin = nueva_fecha_fin`
5. `suscripcion.estado_pago = 'PAGADO'`
6. `suscripcion.save()`
7. `MovimientoSuscripcion.objects.create(... accion=ACTIVACION|EXTENSION ...)`

> La extensión suma tiempo al `fecha_fin` vigente si la suscripción sigue activa; si está vencida/suspendida, el nuevo periodo arranca desde hoy.

### 6.3 `suspender_suscripcion(suscripcion, pagador)` → `activa=False`, registra `SUSPENSION`.

### 6.4 `reactivar_suscripcion(suscripcion, pagador)` → `activa=True`, registra `REACTIVACION` (sin cambiar `fecha_fin`).

### 6.5 `cambiar_plan(suscripcion, plan_nuevo, pagador)` → actualiza `plan`, registra `CAMBIO_PLAN`.

### 6.6 `metricas_plataforma()` → dict de métricas (ver §9).

---

## 7. API REST (`apps/platform/` → `/api/platform/`)

Permiso por defecto: `IsPlatformStaff`.

### 7.1 Autenticación

| Método | Ruta | Descripción | Request | Response |
|---|---|---|---|---|
| POST | `/api/platform/auth/login/` | Login de plataforma (solo staff) | `{username, password}` | `{access, refresh, user}` |
| POST | `/api/platform/auth/refresh/` | Refrescar token | `{refresh}` | `{access}` |

### 7.2 Métricas

| Método | Ruta | Descripción | Response |
|---|---|---|---|
| GET | `/api/platform/metricas/` | Resumen financiero y de tenants | `{ingresos, gastos, balance, mrr, empresas: {total, activas, vencidas, sandbox, inactivas}, pagos_del_mes, gastos_del_mes}` |

### 7.3 Empresas (tenants)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/platform/empresas/` | Listado paginado. Filtros `?search=&plan=&estado=&sort=` |
| GET | `/api/platform/empresas/{id}/` | Detalle: tenant + `suscripcion` + últimos `pagos` + `movimientos_plataforma` |

Cada ítem del listado incluye: `id`, `nombre`, `owner_email`, `schema_name`, `codigo_acceso`, `creado_en`, `suscripcion` (`plan`, `activa`, `fecha_inicio`, `fecha_fin`, `estado_pago`, `dias_restantes`, `estado_calculado`: `activa`/`vencida`/`suspendida`/`sandbox`).

### 7.4 Gestión de suscripción (acciones sobre una empresa)

| Método | Ruta | Body | Efecto |
|---|---|---|---|
| POST | `/api/platform/empresas/{id}/suscripcion/activar/` | `{plan_id, monto, moneda, metodo_pago, referencia, duracion_dias?, fecha_fin?, notas?}` | Crea `Pago` + activa/extiende suscripción |
| POST | `/api/platform/empresas/{id}/suscripcion/extender/` | `{duracion_dias? , fecha_fin?, notas?}` | Extiende `fecha_fin` (sin registrar pago) |
| POST | `/api/platform/empresas/{id}/suscripcion/suspender/` | `{notas?}` | `activa=False` |
| POST | `/api/platform/empresas/{id}/suscripcion/reactivar/` | `{notas?}` | `activa=True` |
| POST | `/api/platform/empresas/{id}/suscripcion/cambiar-plan/` | `{plan_id}` | Cambia plan |

> `activar/` es la acción principal: **registra el pago y activa/extiende en una sola operación atómica** (`transaction.atomic()`), para que el "ingreso" y la "activación" queden consistentes.

### 7.5 Pagos (ingresos)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/platform/pagos/` | Listado con filtros `?fecha_desde=&fecha_hasta=&moneda=&estado=&empresa_id=` |
| POST | `/api/platform/pagos/` | Registrar pago manual (sin tocar suscripción) |
| GET | `/api/platform/pagos/{id}/` | Detalle |
| PATCH | `/api/platform/pagos/{id}/` | Editar / marcar `REVERSADO` |

### 7.6 Gastos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/platform/gastos/` | Listado con filtros |
| POST | `/api/platform/gastos/` | Crear gasto |
| GET/PATCH/DELETE | `/api/platform/gastos/{id}/` | Detalle / editar / eliminar |

### 7.7 Auditoría

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/platform/movimientos/` | Historial global de acciones (filtro `?empresa_id=&accion=`) |

---

## 8. Frontend (sección `/panel/*` en la SPA)

### 8.1 Autenticación y cliente

- Nuevo contexto **`PlatformAuthContext`** con `platformLogin(username, password)` → `POST /api/platform/auth/login/`.
- Storage propio (no mezclado con el del tenant): `platform_access_token`, `platform_refresh_token`, `platform_user_data`.
- Cliente axios separado `platformApi` con `baseURL = ${_apiBase}/api/platform` (sin prefijo `/t/{schema}`) e interceptor que inyecta `platform_access_token`.

### 8.2 Enrutado (en `App.jsx`)

```jsx
<Route path="/panel/login" element={<PanelLogin />} />
<Route path="/panel" element={<PlatformRoute><PanelLayout /></PlatformRoute>}>
  <Route index element={<PanelDashboard />} />
  <Route path="empresas" element={<PanelEmpresas />} />
  <Route path="empresas/:id" element={<PanelEmpresaDetalle />} />
  <Route path="pagos" element={<PanelPagos />} />
  <Route path="gastos" element={<PanelGastos />} />
  <Route path="movimientos" element={<PanelMovimientos />} />
</Route>
```

`PlatformRoute` = guard que redirige a `/panel/login` si no hay `platform_access_token` válido.

### 8.3 Páginas y componentes (Ant Design)

| Pantalla | Componentes / contenido |
|---|---|
| `PanelLogin` | Formulario de login (solo staff) |
| `PanelLayout` | Sidebar propio: Dashboard, Empresas, Pagos, Gastos, Movimientos |
| `PanelDashboard` | Tarjetas de métricas (`stat-card`), gráficos (recharts) de ingresos/gastos por mes, lista de empresas vencidas |
| `PanelEmpresas` | Tabla con búsqueda/filtros, badges de estado, enlace a detalle |
| `PanelEmpresaDetalle` | Info del tenant + tarjeta de suscripción + botón "Registrar pago y activar" (modal con monto, moneda, método, duración default 30 días) + botones extender/suspender/reactivar/cambiar plan + historial |
| `PanelPagos` | Tabla de pagos + botón "Nuevo pago" |
| `PanelGastos` | Tabla de gastos + botón "Nuevo gasto" |
| `PanelMovimientos` | Tabla de auditoría |

### 8.4 Módulo de API del frontend (`platformAPI` en `api.js` o archivo nuevo)

```js
export const platformAPI = {
  login: (data) => platformApi.post('/auth/login/', data),
  refresh: (data) => platformApi.post('/auth/refresh/', data),
  metricas: () => platformApi.get('/metricas/'),
  empresas: (params) => platformApi.get('/empresas/', { params }),
  empresaDetalle: (id) => platformApi.get(`/empresas/${id}/`),
  activarSuscripcion: (id, data) => platformApi.post(`/empresas/${id}/suscripcion/activar/`, data),
  extenderSuscripcion: (id, data) => platformApi.post(`/empresas/${id}/suscripcion/extender/`, data),
  suspenderSuscripcion: (id, data) => platformApi.post(`/empresas/${id}/suscripcion/suspender/`, data),
  reactivarSuscripcion: (id, data) => platformApi.post(`/empresas/${id}/suscripcion/reactivar/`, data),
  cambiarPlan: (id, data) => platformApi.post(`/empresas/${id}/suscripcion/cambiar-plan/`, data),
  pagos: (params) => platformApi.get('/pagos/', { params }),
  crearPago: (data) => platformApi.post('/pagos/', data),
  gastos: (params) => platformApi.get('/gastos/', { params }),
  crearGasto: (data) => platformApi.post('/gastos/', data),
  movimientos: (params) => platformApi.get('/movimientos/', { params }),
};
```

---

## 9. Métricas financieras (cálculo)

Todas calculadas en el esquema public (sobre `Pago`, `Gasto`, `Suscripcion`, `Plan`):

| Métrica | Fórmula |
|---|---|
| **Ingresos (periodo)** | `sum(Pago.monto)` donde `fecha_pago` ∈ periodo y `estado != 'REVERSADO'` |
| **Gastos (periodo)** | `sum(Gasto.monto)` donde `fecha` ∈ periodo |
| **Balance** | `Ingresos - Gastos` |
| **MRR** | `sum(Plan.precio_mensual)` de suscripciones con `activa=True` (estimar en una moneda base) |
| **Empresas totales** | `Cliente.objects.count()` |
| **Empresas activas** | `Suscripcion.objects.filter(activa=True).count()` |
| **Empresas vencidas** | activas con `fecha_fin < hoy` |
| **En sandbox** | `Suscripcion.objects.filter(estado_pago='SANDBOX').count()` |
| **Pagos del mes** | `Pago` con `fecha_pago` en el mes actual |
| **Gastos del mes** | `Gasto` con `fecha` en el mes actual |

> Nota de moneda: v1 muestra PEN y USD por separado (no se hace conversión automática). Se puede añadir una tasa de cambio manual más adelante.

---

## 10. Automatización futura (Culqi)

El diseño ya separa "registrar pago" (origen de datos) de "activar suscripción" (efecto). Para pasar a cobro automático:

1. Endpoint `POST /api/platform/webhooks/culqi/` (permiso público + **verificación de firma/webhook signature** de Culqi).
2. El webhook recibe el evento de pago → busca la `Suscripcion`/`Cliente` por `culqi_charge_id` o metadata → llama a `activar_o_extender_suscripcion(...)` creando un `Pago` con `metodo_pago='CULQI'`.
3. El botón manual "Registrar pago y activar" pasa a ser solo el caso de pagos fuera de línea.

Transición limpia porque ambos caminos usan el mismo servicio de §6.

---

## 11. Plan de implementación (pasos)

1. Crear app `apps/platform` (models, permissions, services, serializers, views, urls, admin).
2. Agregar `apps.platform` a `SHARED_APPS`.
3. `python manage.py makemigrations platform`
4. `python manage.py migrate_schemas --shared` (aplica en `public`).
5. Registrar `path('api/platform/', include('apps.platform.urls'))` en `config/urls.py`.
6. (Opcional, quick win) registrar `Cliente`, `Suscripcion`, `Plan`, `Pago`, `Gasto`, `MovimientoSuscripcion` en `admin.py` del esquema public.
7. Backend: views + serializers + `IsPlatformStaff`.
8. Frontend: `PlatformAuthContext`, `platformApi`, rutas `/panel/*`, páginas.
9. Pruebas con el tenant de prueba existente (activar 1 mes, extender, suspender, ver métricas).

### Migraciones / gotchas django-tenants

- Los modelos de `platform` solo se migran en `public` (`migrate_schemas --shared`).
- No referenciar modelos de apps de tenant (`TENANT_APPS`) desde `platform` vía FK, porque están en esquemas distintos. Solo se referencia `Cliente` (tenant model, que vive en public) y `Plan`/`Suscripcion` (SHARED_APPS). **Correcto.**

---

## 12. Edge cases y riesgos

- **Tenant sin `Suscripcion`** (legacy): el detalle debe mostrar "sin suscripción" y permitir crear/activar una.
- **Suscripción vencida** (`fecha_fin < hoy`): se muestra "vencida"; extender arranca desde hoy (no suma sobre una fecha pasada).
- **Pago reversado**: al marcar `REVERSADO`, no se desactiva la suscripción automáticamente (decisión manual del admin); se registra en notas.
- **Moneda mixta**: no mezclar PEN y USD en un mismo total sin conversión; mostrar por separado.
- **Doble pago / duplicados**: validar por `referencia` si se repite (warning, no bloqueante).
- **Seguridad**: el panel solo es seguro si `IsPlatformStaff` está en **todas** las vistas y las rutas nunca entran a `tenant_urls.py`.
- **Auditoría**: toda activación/extensión/suspensión debe quedar en `MovimientoSuscripcion`.

---

## 13. Pendientes / decisiones por confirmar

- [ ] ¿Panel como sección de la SPA actual o SPA separada? (v1 recomendado: sección `/panel/*` en la SPA actual).
- [ ] ¿Un solo admin (superusuario) o varios con roles? (v1: superusuario; luego `PlatformUser`).
- [ ] ¿Tasa de cambio PEN/USD para consolidar métricas? (v1: mostrar separado).
- [ ] Duración por defecto exacta: 30 días vs. mes calendario (v1: 30 días, configurable).

---

## Referencias al mapeo existente

- Modelos actuales: `Base-de-datos.md` / `Multi-tenancy-SaaS.md` en el vault.
- Endpoints y auth: `Backend.md`, `Autenticacion-y-Roles.md`.
- Frontend: `Frontend.md`.
- Configuración: `Modulo-Config.md`.
