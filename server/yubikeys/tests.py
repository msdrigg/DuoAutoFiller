from django.test import TestCase
from users.models import User
from .forms import KeyCreationForm
from .models import Yubikey
from time import sleep



# TODO: Test views
    # Json response and request objects and such
class YubikeyTestCase(TestCase):
    def setUp(self):
        usr1 = User.objects.create(first_name="Martin", last_name="Schmitty",
                            username="SD", password="HarroldJunior38",
                            email="msd@swblaw.com")
        usr2 = User.objects.create(first_name="Harrold", last_name="Driggers",
                            username="happyDays", password="poopop3adf",
                            email="msdrigg@clemson.edu")
        Yubikey.objects.create(key_name="Key 1", 
                                user = usr1,
                                secret_key = "01010101010101010101010101010101",
                                private_id = "001100110011",
                                public_id = "110011001100",
                                usage_counter = 0,
                                session_counter = 0)
        Yubikey.objects.create(key_name="Key 2",
                                user = usr2,
                                secret_key = "01010101010101010101010101abcdef",
                                private_id = "001100abcdef",
                                public_id = "110011abcdef",
                                usage_counter = 3,
                                session_counter = 5)
                                
    def get_key(self):
        user1 = User.objects.get(username="SD")
        user2 = User.objects.get(username="happyDays")
        key1 = user1.yubikey_set.first()
        key2 = user2.yubikey_set.first()
        self.assertTrue(key1 is not None)
        self.assertTrue(key2 is not None)
    
    def test_latest_passcode(self):
        user2 = User.objects.get(username="happyDays")
        key2 = user2.yubikey_set.first()
        
        k2p1 = key2.get_passcode()
        k2p12 = key2.latest_passcode()
        k2p12d = key2.decrypt_passcode(k2p12)
        k2p1d = key2.decrypt_passcode(k2p1)
        del k2p1d["checksum_hex"]
        del k2p12d["checksum_hex"]
        del k2p1d["random"]
        del k2p12d["random"]
        self.assertEqual(k2p1d, k2p12d)
    
    def test_passcode_generate(self):
        # Get users
        user1 = User.objects.get(username="SD")
        user2 = User.objects.get(username="happyDays")
        
        # Get users's keys
        key1 = user1.yubikey_set.first()
        key2 = user2.yubikey_set.first()
        
        # Generate some passcodes to check
        k1p1 = key1.get_passcode()
        k1p2 = key1.get_passcode()
        k2p1 = key2.get_passcode()
        # Wait 5 seconds to check time difference
        sleep(5)
        k2p2 = key2.get_passcode()
        k2p2d = key2.decrypt_passcode(k2p2)
        k2p1d = key2.decrypt_passcode(k2p1)
        k1p1d = key1.decrypt_passcode(k1p1)
        k1p2d = key1.decrypt_passcode(k1p2)
        
        # Check usage and session counters
        self.assertEqual(k1p1d.get("usage_counter"), k1p2d.get("usage_counter"))
        self.assertEqual(k1p2d.get("usage_counter"), key1.usage_counter)
        self.assertEqual(k1p1d.get("session_counter"), k1p2d.get("session_counter") - 1)
        self.assertEqual(k1p1d.get("session_counter"), key1.session_counter - 1)
        
        # Check 
        
        # Check time difference
        time_dif1 = k1p2d.get("otp_time") - k1p1d.get("otp_time")
        self.assertTrue(time_dif1 >= 0 and time_dif1 < 10)
        time_dif2 = k2p2d.get("otp_time") - k2p1d.get("otp_time")
        self.assertTrue(time_dif2 >= 40 and time_dif2 < 50)
        
        # Check public and private id's
        self.assertEqual(key1.public_id, k1p1d.get("public_id_hex"))
        self.assertEqual(key1.public_id, k1p2d.get("public_id_hex"))
        self.assertEqual(key1.private_id, k1p1d.get("private_id_hex"))
        self.assertEqual(key1.private_id, k1p2d.get("private_id_hex"))
        
        
        # Test k1p1 against k1p2, and see how they compare
        key2.session_counter = 2**8 - 2
        key2.save()
        key2.get_passcode()
        key2.get_passcode()
        k2pfinal = key2.get_passcode()
        k2pfinald = key2.decrypt_passcode(k2pfinal)
        k2p1d = key2.decrypt_passcode(k2p1)
        
        # Check cycling of session counter
        self.assertEqual(key2.session_counter, 1)
        self.assertEqual(key2.session_counter, k2pfinald.get("session_counter"))
        self.assertEqual(key2.usage_counter, k2pfinald.get("usage_counter"))
        self.assertEqual(key2.usage_counter, k2p1d.get("usage_counter") + 1)
        
        # Check that only user can decrypt key
        k1p1nd = key2.decrypt_passcode(k1p1)
        self.assertNotEqual(k1p1d, k1p1nd)
    
    def test_get_key_name(self):
        user1 = User.objects.get(username="SD")
        user2 = User.objects.get(username="happyDays")
        key1 = user1.yubikey_set.first()
        key2 = user2.yubikey_set.first()
        self.assertEqual(key1.key_name, "Key 1")
        self.assertEqual(key2.key_name, "Key 2")
    
    def test_create_delete_key(self):
        form1 = KeyCreationForm({
            "secret_key": "01010101010101010101010101abcdef",
            "private_id": "001100abcdef",
            "public_id" : "110011abcdef",
            "key_name" : "Key2"
        })
        user2 = User.objects.get(username="SD")
        self.assertTrue(user2.yubikey_set.exists())
        user2.yubikey_set.all().delete()
        self.assertFalse(user2.yubikey_set.exists())
        if form1.is_valid():
            new_k = form1.save(commit=False)
            new_k.user = user2
            new_k.save()
        self.assertEqual(user2.yubikey_set.first(), new_k)
    
    def test_KeyCreationForm_valid(self):
        form1 = KeyCreationForm({
            "secret_key" : "01010101010101010101010101abcdef",
            "private_id" : "001100abcdef",
            "public_id" : "110011abcdef",
            "key_name" : "Key2"
        })
        form2 = KeyCreationForm({
            "secret_key" : "01010101010101010101010101abcdef",
            "private_id" : "001100abcdef",
            "public_id" : "110011abcdef",
            "session_counter" : 5,
            "key_name" : "afvlkvka"
        })
        form3 = KeyCreationForm({
            "secret_key" : "01010101010101010101010101abcdef",
            "private_id" : "001100abcdef",
            "public_id" : "110011abcdef",
            "usage_counter" : 3,
            "session_counter" : 0,
            "key_name" : "asdflkb"
        })
        self.assertTrue(form1.is_valid())
        self.assertTrue(form2.is_valid())
        self.assertTrue(form3.is_valid())
    
    def test_KeyCreationForm_invalid(self):
        form1 = KeyCreationForm({
            "secret_key" : "01010101010101010101010101abcd",
            "private_id" : "001100abcdef",
            "public_id" : "110011abcdef",
            "key_name" : "Key2"
        })
        form2 = KeyCreationForm({
            "secret_key" : "01010101010101010101010101abcdef",
            "private_id" : "001100abcdef",
            "public_id" : "110011abcdefa3",
            "session_counter" : 5,
            "key_name" : "afvlkvka"
        })
        form3 = KeyCreationForm({
            "secret_key" : "01010101010101010101010101abcdef",
            "private_id" : "001100abc",
            "public_id" : "110011abcdef",
            "usage_counter" : 3,
            "session_counter" : 0,
            "key_name" : "asdflkb"
        })
        form4 = KeyCreationForm({
            "secret_key" : "01010101010101010101010101abcdef",
            "private_id" : "001100abcdef",
        })
        form5 = KeyCreationForm({
            "secret_key" : "0101010101f101010101010101abcdef",
            "private_id" : "001100abcdef",
            "public_id" : "110011akcdef",
            "session_counter" : 5,
            "key_name" : "afvlkvka"
        })
        form6 = KeyCreationForm({
            "secret_key" : "01010101010101gh0101010101abcdef",
            "public_id" : "110011abcdef",
            "usage_counter" : 3,
            "session_counter" : 0,
            "key_name" : "asdflkb"
        })
        self.assertFalse(form1.is_valid())
        self.assertFalse(form2.is_valid())
        self.assertFalse(form3.is_valid())
        self.assertFalse(form4.is_valid())
