from django.urls import path

from . import views

urlpatterns = [
    path('generate-otp/', views.generate, name='generate_otp'),
    path('create-key/', views.create_key, name='create_key'),
    path('delete-key/', views.delete_key, name='delete_key'),
    path('get-key-name/', views.get_key_name, name='get_key_name'),
]