from django.db import models
from django.contrib.auth.models import AbstractUser
from DuoOTPGenerator.settings import PASSWORD_RESET_FROM_EMAIL
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from rest_framework.authtoken.models import Token


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_auth_token(sender, instance=None, created=False, **kwargs):
    if created:
        Token.objects.create(user=instance)


class User(AbstractUser):
    USERNAME_FIELD = 'email'
    
    first_name = models.CharField(max_length=30, null=False, blank=False)
    last_name = models.CharField(max_length=40, null=False, blank=False)
    email = models.EmailField(unique=True, null=False, blank=False)
    last_update = models.DateTimeField(auto_now_add=True)
    
    def auth_token(self):
        return self.token_set.first()
    
    def yubikey(self):
        return self.token_set.first()
    
    def full_name(self):
        return self.first_name + " " + self.last_name

    def keychain_updated(self):
        self.last_update = timezone.now()
        self.save()
