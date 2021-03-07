from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import User


class DefaultUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm):
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'password1', 'password2')
