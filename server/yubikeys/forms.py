from django import forms
from .models import Yubikey
from django.core.validators import RegexValidator


hex_validator = RegexValidator(r"^([A-Fa-f0-9]{2})*$", "This field should contain only numbers 0-9 and letters a-f")


class KeyCreationForm(forms.ModelForm):
    public_id = forms.CharField(max_length=12, min_length=12, validators=[hex_validator])
    private_id = forms.CharField(max_length=12, min_length=12, validators=[hex_validator])
    secret_key = forms.CharField(max_length=32, min_length=32, validators=[hex_validator])
    usage_counter = forms.IntegerField(required=False, min_value=0, max_value=2**15 - 1)
    session_counter = forms.IntegerField(required=False, min_value=0, max_value=2**8 - 1)
    class Meta:
        model = Yubikey
        fields = ('public_id', 'private_id', 'secret_key', 'key_name', 'session_counter', 'usage_counter')
