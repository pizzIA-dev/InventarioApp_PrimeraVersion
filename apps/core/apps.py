from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'

    def ready(self):
        # Conecta los signals de core (ej: on_empresa_created)
        import apps.core.signals  # noqa: F401
