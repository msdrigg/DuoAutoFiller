from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes, api_view
from .forms import KeyCreationForm
from django.views.decorators.csrf import csrf_exempt
import json
from django.contrib.auth import get_user_model
User = get_user_model()

@require_http_methods(["GET"])
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def generate(request):
    yubikey = request.user.yubikey_set.first()
    if yubikey is None:
        return JsonResponse({"response": "failure", "reason": "No yubikeys exist for user"})
    passcode = yubikey.get_passcode()
    return JsonResponse({"response": "success", "passcode": passcode})


@csrf_exempt
@require_http_methods(["POST"])
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_key(request):
    form = KeyCreationForm(request.POST)
    if form.is_valid():
        # Users only allowed one key (currently)
        request.user.yubikey_set.all().delete()
        key = form.save(commit=False)
        key.user = request.user
        key.save()
        return JsonResponse({"response": "success"})
    else:
        return JsonResponse({"response": "failure", "reason": "Invalid form"})


@csrf_exempt
@require_http_methods(["DELETE"])
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_key(request):
    key_name = json.loads(request.body).get("key_name", None)
    queryset = request.user.yubikey_set.all()
    if key_name is not None:
        queryset = queryset.filter(key_name=key_name)
        delete_type = "Deleted key: " + key_name
    else:
        delete_type = "Deleted all keys associated with user: " + request.user.username
    queryset.delete()
    return JsonResponse({"response": "success", "details": delete_type})


@require_http_methods(["GET"])
@api_view(["GET"])
@permission_classes((IsAuthenticated,))
def get_key_name(request):
    if not isinstance(request.user, User):
        return JsonResponse({"response": "failure", "reason": "User not authenticated"})
    yubikey = request.user.yubikey_set.first()
    if yubikey is None:
        return JsonResponse({"response": "failure", "reason": "No yubikeys exist for user"})
    return JsonResponse({"response": "success", "key_name": yubikey.key_name})
