from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        # Retornar datos adicionales junto a los tokens
        perfil = getattr(self.user, 'perfil', None)
        rol = perfil.rol if perfil else 'GERENTE' # Fallback o para admin 

        # Si es superusuario sin perfil lo consideraremos GERENTE en el frontend
        if self.user.is_superuser and not perfil:
            rol = 'GERENTE'

        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'rol': rol,
        }

        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
