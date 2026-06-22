from django.urls import path
from .views import PlanListView

urlpatterns = [
    path('planes/', PlanListView.as_view(), name='plan-list'),
]
