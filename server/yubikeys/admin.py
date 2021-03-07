from django.contrib import admin
from .models import Yubikey

@admin.register(Yubikey)
class YubikeyAdmin(admin.ModelAdmin):
    readonly_fields = ('latest_passcode',)
    list_display = ('key_name', 'public_id')
    search_fields = ('key_name',)
    exclude = ('secret_key', 'private_id')
