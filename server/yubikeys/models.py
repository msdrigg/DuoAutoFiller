from django.db import models
from .yubikey_simulator import get_otp_generated, hex_to_modhex, decrypt_otp
from users.models import User
from binascii import unhexlify
import uuid


class KeyMetaData(models.Model):
    key_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, blank=True)
    key_name = models.CharField(max_length=40)
    key_site = models.URLField(default="", blank=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    def save(*args, **kwargs):
        self.user.keychain_updated()
        super().save(*args, **kwargs)


# Create your models here.
class Yubikey(models.Model):
    related_data = models.OneToOneField(
        KeyMetaData,
        on_delete=models.CASCADE
    )
    # TODO: CONVERT ALL FIELDS TO THEIR RESPECTIVE BINARY LENGTH OBJECTS
    secret = models.CharField(max_length=32, null=False, blank=False)
    public_id = models.CharField(max_length=12, null=False, blank=False)
    private_id = models.CharField(max_length=12, null=False, blank=False)
    session_counter = models.PositiveIntegerField(null=False, default=0)
    usage_counter = models.PositiveIntegerField(null=False, default=0)
    
    def save(*args, **kwargs):
        self.related_data.save()
        super().save(*args, **kwargs)

    
    # TODO: stash these methods in a unencrypted-old.py file for comparison to javascript later
    # Unnecessary in encrypted state
    def increment_counters(self):
        self.session_counter += 1
        if self.session_counter > 0xFF:
            self.usage_counter += 1
            self.session_counter = 0
            self.save(update_fields=['usage_counter', 'session_counter'])
        else:
            self.save(update_fields=['session_counter'])

    def get_passcode(self):
        # Return OTP, update internal values
        self.increment_counters()
        return self.latest_passcode()
    
    def latest_passcode(self):
        # Return OTP, update internal values
        otp_base = get_otp_generated(
            unhexlify(self.private_id),
            self.usage_counter,
            self.session_counter,
            unhexlify(self.secret)
        )
        return hex_to_modhex(self.public_id) + otp_base

    def decrypt_passcode(self, passcode):
        return decrypt_otp(passcode, unhexlify(self.secret))
        