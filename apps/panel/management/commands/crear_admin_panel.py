"""
Crea (o promueve) un administrador del Panel de Control en el schema public.

Uso:
    python manage.py crear_admin_panel --username admin_negocia --email tu@correo.com
    (pide la contraseña por consola; o usar --password en entornos no interactivos)

Recomendación: usa un username que NO sea un email. Los Gerentes de los negocios
también tienen usuario en el schema public con username = su email.
"""
import getpass

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django_tenants.utils import get_public_schema_name, schema_context


class Command(BaseCommand):
    help = 'Crea o promueve un administrador del Panel de Control (schema public).'

    def add_arguments(self, parser):
        parser.add_argument('--username', required=True)
        parser.add_argument('--email', default='')
        parser.add_argument('--password', default=None,
                            help='Si se omite, se pide por consola.')
        parser.add_argument('--superuser', action='store_true',
                            help='Además de staff, marcarlo como superusuario de Django.')

    def handle(self, *args, **opts):
        username = opts['username'].strip()
        if '@' in username:
            self.stdout.write(self.style.WARNING(
                'Aviso: el username parece un email. Se recomienda uno distinto '
                '(ej. admin_negocia) para no compartirlo con usuarios de negocios.'))

        with schema_context(get_public_schema_name()):
            User = get_user_model()
            user = User.objects.filter(username=username).first()
            password = opts['password']
            if user is None or password is not None or not user.has_usable_password():
                if password is None:
                    password = getpass.getpass('Contraseña: ')
                    if password != getpass.getpass('Repite la contraseña: '):
                        raise CommandError('Las contraseñas no coinciden.')
                try:
                    validate_password(password, user=user)
                except ValidationError as exc:
                    raise CommandError(' '.join(exc.messages))

            creado = user is None
            if creado:
                user = User(username=username)
            if opts['email']:
                user.email = opts['email']
            user.is_staff = True
            user.is_active = True
            if opts['superuser']:
                user.is_superuser = True
            if password is not None:
                user.set_password(password)
            user.save()

        accion = 'creado' if creado else 'actualizado'
        self.stdout.write(self.style.SUCCESS(f'Administrador del panel {accion}: {username}'))
