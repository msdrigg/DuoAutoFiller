from django.core.exceptions import PermissionDenied, ObjectDoesNotExist
from django.http import JsonResponse, HttpResponse
from django.shortcuts import get_object_or_404, Http404
from .models import User
from .forms import DefaultUserCreationForm
from DuoOTPGenerator.settings import PASSWORD_RESET_FROM_EMAIL
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.forms import PasswordResetForm
from django.contrib.auth.views import PasswordResetCompleteView


@require_http_methods(["GET"])
def check_username(request):
    if User.objects.filter(username=request.GET.get("username", "")).exists():
        return JsonResponse({"response": "invalid", "reason": "Username taken"})
    else:
        return JsonResponse({"response": "valid"})


@csrf_exempt
@require_http_methods(["POST"])
def create_user(request):
    form = DefaultUserCreationForm(request.POST)
    if form.is_valid():
        form.save()
        return JsonResponse({"response": "success"})
    else:
        return JsonResponse({"response": "failure", "reason": "Invalid form"})


@csrf_exempt
@require_http_methods(["POST"])
def reset_password(request):
    email = request.POST.get("email", None)
    if email is None:
        raise Http404("No email provided")
    form = PasswordResetForm({'email': email})
    if form.is_valid():
        form.save(request=request, use_https=True,
                  from_email=PASSWORD_RESET_FROM_EMAIL)
        return JsonResponse({"response": "success", "message": "If a user \
        exists with that email, a password reset email will be sent"})
    else:
        return JsonResponse({"response": "failure", "reason": "Invalid email"})

class PasswordResetCompleteViewNoLogin(PasswordResetCompleteView):
    template_name = 'admin/registration/password_reset_complete_no_login.html'
