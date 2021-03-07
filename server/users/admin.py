from django.contrib import admin
from .models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    readonly_fields = ('auth_token', 'full_name', 'yubikey')
    list_display = ('username', 'full_name', 'email')
    search_fields = ('username',)