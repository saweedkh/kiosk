import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Prefer process env (Docker Compose). Only load a non-empty .env file as fallback.
# Never load an empty kiosk_backend/.env ahead of the monorepo root .env.
# override=False so Compose-injected POSTGRES_* always win over file values.
_env_candidates = (
    BASE_DIR.parent / '.env',  # monorepo root when running on host
    BASE_DIR / '.env',         # /app/.env in container (compose bind-mount)
)
for _env_path in _env_candidates:
    if _env_path.is_file() and _env_path.stat().st_size > 0:
        load_dotenv(_env_path, override=False)
        break

def _env(key: str, default: str = '') -> str:
    """Read env var and strip Windows CR leftovers from .env / env_file."""
    val = os.getenv(key, default)
    if val is None:
        return default
    return str(val).replace('\r', '').strip()


SECRET_KEY = _env('SECRET_KEY', 'django-insecure-change-in-production')
DEBUG = _env('DEBUG', 'False') == 'True'
_allowed = _env('ALLOWED_HOSTS', '')
ALLOWED_HOSTS = _allowed.split(',') if _allowed else ['127.0.0.1', 'localhost']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'apps.products.apps.ProductsConfig',
    'apps.orders',
    'apps.payment',
    'apps.logs',
    'apps.admin_panel',
    'apps.core',
    'apps.accounts.apps.AccountsConfig',
    'apps.bale_bot.apps.BaleBotConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.logs.middleware.request_logging.RequestLoggingMiddleware',
]

ROOT_URLCONF = 'config.urls'

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

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': _env('POSTGRES_DB', 'kiosk'),
        'USER': _env('POSTGRES_USER', 'kiosk'),
        'PASSWORD': _env('POSTGRES_PASSWORD', 'kiosk'),
        'HOST': _env('POSTGRES_HOST', 'db'),
        'PORT': _env('POSTGRES_PORT', '5432'),
        'CONN_MAX_AGE': int(_env('POSTGRES_CONN_MAX_AGE', '60') or '60'),
        # dumpdata uses queryset.iterator(); Postgres server-side cursors then
        # raise "cursor does not exist" mid-export. Fine for this small DB.
        'DISABLE_SERVER_SIDE_CURSORS': True,
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fa'
TIME_ZONE = 'Asia/Tehran'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STATICFILES_DIRS = []

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'apps.core.api.renderers.CustomJSONRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'apps.core.api.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'EXCEPTION_HANDLER': 'apps.core.api.exceptions.api_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# CORS - برای لوکال همه چیز مجاز است
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    'http://localhost',
    'http://localhost:8000',
    'http://127.0.0.1',
    'http://127.0.0.1:8000',
    'http://kiosk.local',
    'http://kiosk.local:8000',
]

SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 86400
SESSION_SAVE_EVERY_REQUEST = True

# Django Admin Settings

# اطمینان از وجود پوشه logs
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {name} {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': str(LOGS_DIR / 'kiosk.log'),
            'formatter': 'verbose',
            'encoding': 'utf-8',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.server': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'kiosk': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Payment Gateway Configuration
# gateway_name: mock | pos | bridge
# bridge = Windows PosBridge + official pna.pcpos.dll (see pos_bridge/ and docs/POS_BRIDGE.md)
_PAYMENT_GATEWAY_NAME = _env('PAYMENT_GATEWAY_NAME', 'mock').lower()
_POS_USE_BRIDGE = _env('POS_USE_BRIDGE', 'False').lower() in ('1', 'true', 'yes', 'on')
# Bridge flag wins over leftover mock/pos (common when .env was edited but container not recreated,
# or Windows CRLF left mock active). Explicit PAYMENT_GATEWAY_NAME=bridge also kept.
if _POS_USE_BRIDGE or _PAYMENT_GATEWAY_NAME in ('bridge', 'pos_bridge', 'dll_bridge'):
    _PAYMENT_GATEWAY_NAME = 'bridge'

POS_BRIDGE_HOST = _env('POS_BRIDGE_HOST', 'host.docker.internal') or 'host.docker.internal'
POS_BRIDGE_PORT = int(_env('POS_BRIDGE_PORT', '9000') or 9000)
POS_BRIDGE_TOKEN = _env('POS_BRIDGE_TOKEN', '')
POS_BRIDGE_TIMEOUT = float(_env('POS_BRIDGE_TIMEOUT', '130') or 130)

PAYMENT_GATEWAY_CONFIG = {
    'gateway_name': _PAYMENT_GATEWAY_NAME,
    'merchant_id': _env('PAYMENT_GATEWAY_MERCHANT_ID', ''),
    'terminal_id': _env('PAYMENT_GATEWAY_TERMINAL_ID', ''),
    'tcp_host': _env('POS_TCP_HOST', '192.168.1.102'),
    'tcp_port': int(_env('POS_TCP_PORT', '1362') or 1362),
    'timeout': int(_env('POS_TIMEOUT', '30') or 30),
    'mock_payment_delay': float(_env('MOCK_PAYMENT_DELAY', '3') or 3),
    'mock_payment_success': _env('MOCK_PAYMENT_SUCCESS', 'True').lower() in ('1', 'true', 'yes', 'on'),
    'pos_message_format': _env('POS_MESSAGE_FORMAT', 'dll_exact'),
    'pos_use_simple_format': _env('POS_USE_SIMPLE_FORMAT', 'False').lower() in ('1', 'true', 'yes', 'on'),
    'pos_banner': _env('POS_BANNER', 'R2023tejaratEParsian'),
    'bridge_host': POS_BRIDGE_HOST,
    'bridge_port': POS_BRIDGE_PORT,
    'bridge_token': POS_BRIDGE_TOKEN,
    'bridge_timeout': POS_BRIDGE_TIMEOUT,
}

# Printer Configuration
PRINTER_ENABLED = _env('PRINTER_ENABLED', 'False').lower() in ('1', 'true', 'yes', 'on')
PRINTER_IP = _env('PRINTER_IP', '192.168.1.100')
PRINTER_PORT = int(_env('PRINTER_PORT', '9100') or 9100)

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# API Documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'Kiosk Backend API',
    'VERSION': '1.0.0',
    'SCHEMA_PATH_PREFIX': '/api/kiosk/',
}

# Bale Bot
def _env_bool(name: str, default: bool = True) -> bool:
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == '':
        return default
    return str(raw).strip().lower() in ('1', 'true', 'yes', 'on')


BALE_BOT_TOKEN = os.getenv('BALE_BOT_TOKEN', '')
BALE_API_BASE = os.getenv('BALE_API_BASE', 'https://tapi.bale.ai')
BALE_POLL_TIMEOUT = int(os.getenv('BALE_POLL_TIMEOUT', '30'))
# Master kill-switch: if False, bale_poll exits immediately and never long-polls.
BALE_BOT_ENABLED = _env_bool('BALE_BOT_ENABLED', True)

