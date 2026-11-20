from django.apps import AppConfig


class PanelConfig(AppConfig):
    """Panel de Control: back-office de los dueños del SaaS (solo schema public)."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.panel'
    verbose_name = 'Panel de Control'
