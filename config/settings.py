"""
Django settings for Inventario y Balance application.
"""

from pathlib import Path
from decouple import config
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

# SECURITY WARNING: keep the secret key used in production secret!
# En producción: definir en .env sin default — si falta, Django falla intencionalmente
SECRET_KEY = config('SECRET_KEY', default='django-insecure-DEV-ONLY-change-in-production-!!!' if DEBUG else None)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,.localhost,.nip.io,.onrender.com,.railway.app,.up.railway.app,.herokuapp.com').split(',')

SHARED_APPS = [
    'django_tenants',
    'apps.clientes_saas',  # Nuestra app pública/compartida de tenants
    'apps.suscripciones',  # Planes y Facturación

    'cloudinary_storage',  # Cloudinary Storage
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'cloudinary',          # Cloudinary
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',
    'django_filters',
    'rest_framework_simplejwt',
]

TENANT_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',

    'apps.core.apps.CoreConfig',
    'apps.inventario.apps.InventarioConfig',
    'apps.ventas.apps.VentasConfig',
    'apps.compras.apps.ComprasConfig',
    'apps.proveedores.apps.ProveedoresConfig',
    'apps.clientes.apps.ClientesConfig',
    'apps.capital.apps.CapitalConfig',
    'apps.servicios.apps.ServiciosConfig',
    'apps.transacciones.apps.TransaccionesConfig',
    'apps.reportes.apps.ReportesConfig',
    'apps.fiados.apps.FiadosConfig',
]

INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

TENANT_MODEL = "clientes_saas.Cliente"
TENANT_DOMAIN_MODEL = "clientes_saas.Domain"

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',         # CORS primero — responde OPTIONS antes de tenant routing
    'config.tenant_middleware.TenantFromPathMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.core.middleware.ThreadLocalMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

# django-tenants: el esquema public (dominio raíz) usa las mismas URLs que el resto
# Esto permite que /api/public/registro/ y /api/public/buscar-tenant/ funcionen desde localhost
PUBLIC_SCHEMA_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database Support for SaaS PostgreSQL and Local SQLite
DATABASE_URL = config('DATABASE_URL', default=None)

if DATABASE_URL:
    # Producción: usar DATABASE_URL completo (Railway, Render, Heroku, etc.)
    db_config = dj_database_url.parse(DATABASE_URL, conn_max_age=600, conn_health_checks=True)
    db_config['ENGINE'] = 'django_tenants.postgresql_backend'
    DATABASES = {'default': db_config}
else:
    # Desarrollo local: leer credenciales individuales del .env
    DATABASES = {
        'default': {
            'ENGINE': 'django_tenants.postgresql_backend',
            'NAME': config('DB_NAME', default='inventario_saas'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default='postgres'),
            'HOST': config('DB_HOST', default='127.0.0.1'),
            'PORT': config('DB_PORT', default='5432'),
        }
    }

DATABASE_ROUTERS = (
    'django_tenants.routers.TenantSyncRouter',
)

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'es-pe'
TIME_ZONE = 'America/Lima'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
WHITENOISE_MANIFEST_STRICT = False  # Evita error por fonts faltantes en DRF
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'  # whitenoise middleware sirve los archivos

# Media files
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Cloudinary Integration for Production
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': config('CLOUDINARY_CLOUD_NAME', default='dlhix3p7p'),
    'API_KEY': config('CLOUDINARY_API_KEY', default='placeholder'),
    'API_SECRET': config('CLOUDINARY_API_SECRET', default='placeholder'),
}

DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_RENDERER_CLASSES': (
        ['rest_framework.renderers.JSONRenderer',
         'rest_framework.renderers.BrowsableAPIRenderer']  # Solo en DEBUG
        if DEBUG else
        ['rest_framework.renderers.JSONRenderer']          # En prod: ocultar API browser
    ),
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS':  False,  # Sin rotación: evita escritura en OutstandingToken
    'BLACKLIST_AFTER_ROTATION': False, # Sin blacklist: FK cross-schema incompatible con multi-tenant
    'UPDATE_LAST_LOGIN': True,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': '',
    'AUDIENCE': None,
    'ISSUER': None,
    'JSON_ENCODER': None,
    'JWK_URL': None,
    'LEEWAY': 0,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
}

# CORS settings
CORS_ALLOWED_ORIGINS = [
    orig.strip() for orig in config('CORS_ALLOWED_ORIGINS', default='http://localhost:5173,http://localhost:3000').split(',')
]

# En desarrollo: permitir todos los subdominios .localhost y 127.0.0.1 en cualquier puerto
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://.*\.localhost:\d+$",
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
    r"^http://.*\.nip\.io:\d+$",
]

# Permitir credenciales (tokens JWT en headers Authorization)
CORS_ALLOW_CREDENTIALS = True

# Modo desarrollo: si DEBUG está activo, permitir todos los orígenes para evitar bloqueos locales
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Security Headers (Shielding)
SECURE_BROWSER_XSS_FILTER   = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS             = 'DENY'

# ── Seguridad adicional para HTTPS en PRODUCCIÓN ──────────────────────────────
# Estos se activan automáticamente cuando DEBUG=False (producción)
if not DEBUG:
    SECURE_SSL_REDIRECT          = False  # Railway proxy handles SSL termination
    SECURE_PROXY_SSL_HEADER      = ('HTTP_X_FORWARDED_PROTO', 'https')  # Trust Railway proxy SSL header
    SESSION_COOKIE_SECURE        = True   # Cookie de sesión solo por HTTPS
    CSRF_COOKIE_SECURE           = True   # CSRF cookie solo por HTTPS
    SECURE_HSTS_SECONDS          = 31536000  # 1 año de HSTS
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True # Aplica HSTS a todos los subdominios
    SECURE_HSTS_PRELOAD          = True   # Permite agregar a la lista de preload HSTS
    CSRF_TRUSTED_ORIGINS = [
        orig.strip()
        for orig in config('CORS_ALLOWED_ORIGINS', default='').split(',')
        if orig.strip()
    ]

# BASE_DOMAIN: dominio raíz de la plataforma (usado para construir subdominios de tenants)
# Desarrollo: localhost
# Producción: tudominio.com  (configurar en .env)
BASE_DOMAIN = config('BASE_DOMAIN', default='localhost')
FRONTEND_URL = config('FRONTEND_URL', default=f'http://localhost:5175')

# === Planes y Precios de NegocIA ===
# Usado por RegistroSaaSAPIView para procesar pagos y crear suscripciones
PLAN_PRECIOS = {
    '1': {
        'nombre': 'EMPRENDEDOR',
        'PEN': 3990,   # S/39.90 en centimos para Culqi
        'USD': 1200,   # $12.00 en centimos
    },
    '2': {
        'nombre': 'EMPRESARIO',
        'PEN': 7990,   # S/79.90 en centimos
        'USD': 2400,   # $24.00 en centimos
    },
}


# Email backend
# Desarrollo: muestra emails en consola
# Producción: Gmail SMTP (usa App Password de Google)
if DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    EMAIL_BACKEND       = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
    EMAIL_HOST          = config('EMAIL_HOST', default='smtp.gmail.com')
    EMAIL_PORT          = config('EMAIL_PORT', default=587, cast=int)
    EMAIL_USE_TLS       = config('EMAIL_USE_TLS', default=True, cast=bool)
    EMAIL_HOST_USER     = config('EMAIL_HOST_USER', default='pizzia.peru@gmail.com')
    EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
    DEFAULT_FROM_EMAIL  = config('DEFAULT_FROM_EMAIL', default='NegocIA <pizzia.peru@gmail.com>')
    SERVER_EMAIL        = DEFAULT_FROM_EMAIL

if 'DEFAULT_FROM_EMAIL' not in dir():
    DEFAULT_FROM_EMAIL = 'dev@localhost'
