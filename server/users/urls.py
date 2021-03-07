from django.urls import path
from rest_framework.authtoken import views as token_views

from . import views

urlpatterns = [
    path('get-token/', token_views.obtain_auth_token, name='get_token'),
    path('create-user/', views.create_user, name='create_user'),
    path('reset-password/', views.reset_password, name='reset_password'),
    path('check-username/', views.check_username, name='check_username'),
    path('password_reset_complete/', views.PasswordResetCompleteViewNoLogin.as_view(), name="password_reset_complete"),
]