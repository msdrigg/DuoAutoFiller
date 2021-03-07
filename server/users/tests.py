from django.test import TestCase
from .models import User
from .forms import DefaultUserCreationForm


# TODO:
    # Test views themselves (json response, status code)
    # Develop and test password reset
class UserTestCase(TestCase):
    def setUp(self):
        User.objects.create(first_name="Martin", last_name="Schmitty",
                            username="SD", password="HarroldJunior38",
                            email="msd@swblaw.com")
        User.objects.create(first_name="Harrold", last_name="Driggers",
                            username="happyDay", password="poopop3adf",
                            email="msdrigg@clemson.edu")
    
    def test_check_username_available(self):
        self.assertFalse(User.objects.filter(username="").exists())
        self.assertFalse(User.objects.filter(username="hello").exists())
    
    def test_check_username_unavailable(self):
        self.assertTrue(User.objects.filter(username="happyDay").exists())
        self.assertTrue(User.objects.filter(username="SD").exists())
    
    def test_create_delete_user(self):
        form1 = DefaultUserCreationForm({
            "email": "user@clem.edu", 
            "password1": "HelloWorld1",
            "password2": "HelloWorld1",
            "username": "butthole",
            "first_name": "Scott",
            "last_name": "driggers"
        })
        if form1.is_valid():
            form1.save()
        self.assertTrue(User.objects.filter(username="butthole").exists())
        
        User.objects.filter(username="butthole").delete()
        self.assertFalse(User.objects.filter(username="butthole").exists())

    
    def checkUserToken(self):
        token1 = Users.objects.get(username="SD").token_set().first()
        token2 = Users.objects.get(username="happyDay").token_set().first()
        self.assertFalse(token1 is None)
        self.assertFalse(token2 is None)
        self.assertFalse(token1 == token2)
        
        
    def test_UserCreationForm_valid(self):
        form1 = DefaultUserCreationForm({
            "email": "user@clem.edu", 
            "password1": "HelloWorld1",
            "password2": "HelloWorld1",
            "username": "butthole",
            "first_name": "Scott",
            "last_name": "driggers"
        })
        form2 = DefaultUserCreationForm({
            "email": "user@clem.edu", 
            "password1": "butthol33",
            "password2": "butthol33",
            "username": "butthole",
            "first_name": "Scott",
            "last_name": "driggers"
        })
        self.assertTrue(form1.is_valid())
        self.assertTrue(form2.is_valid())

    def test_UserCreationForm_invalid(self):
        form1 = DefaultUserCreationForm({
            "email": "user@clem.edu", 
            "password1": "HellWorld1",
            "password2": "HelloWorld2",
            "username": "butthole",
            "first_name": "Scott",
            "last_name": "driggers"
        })
        form2 = DefaultUserCreationForm({
            "email": "user@clem.edu", 
            "password1": "butthol33",
            "password2": "butthol33",
            "username": "butthole",
            "last_name": "driggers"
        })
        form3 = DefaultUserCreationForm({
            "email": "user@clem.edu", 
            "password1": "HelloWorld1",
            "password2": "HelloWorld1",
            "username": "butthole",
            "last_name": "driggers"
        })
        form4 = DefaultUserCreationForm({
            "email": "user@clem.edu", 
            "password1": "abcde",
            "password2": "abcde",
            "username": "butthole",
            "first_name": "Scott",
            "last_name": "driggers"
        })
        self.assertFalse(form1.is_valid())
        self.assertFalse(form2.is_valid())
        self.assertFalse(form3.is_valid())
        self.assertFalse(form4.is_valid())
