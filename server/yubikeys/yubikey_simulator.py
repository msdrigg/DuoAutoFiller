import six
import random
from datetime import datetime
from Crypto.Cipher import AES
import json
from binascii import unhexlify


MODHEX_DICT = {
    "0": "c",
    "1": "b",
    "2": "d",
    "3": 'e',
    "4": 'f',
    "5": 'g',
    "6": 'h',
    "7": 'i',
    "8": 'j',
    "9": 'k',
    "a": 'l',
    "b": 'n',
    "c": 'r',
    "d": "t",
    "e": "u",
    "f": "v"
}


def int_to_bytes(int_repr, size=None):
    "get little endian bytes in smallest byte repr"
    if size is None:
        byte_length = (int.bit_length(int_repr) + 8 - 1)//8
    else:
        byte_length = size
    return int_repr.to_bytes(length=byte_length, byteorder="little", signed=False)


def hex_to_modhex(hex_repr):
    "yubikey's modhex"
    return ''.join(list(map(lambda char: MODHEX_DICT[char], 
                            list(hex_repr.lower()))))

def modhex_to_hex(modhex_repr):
    "yubikey's modhex"
    modhex_reverse_dict = {v: k for k, v in MODHEX_DICT.items()}
    return ''.join(list(map(lambda char: modhex_reverse_dict[char], 
                            list(modhex_repr.lower()))))


def aes_encrypt(input_bytes, key):
    "given byte inputs for input_bytes, key, return aes encrypted output bytes"
    cipher = AES.new(key, AES.MODE_ECB)
    encrypted_bytes = cipher.encrypt(input_bytes)
    return encrypted_bytes


def generate_checksum(msg):
    """
    Calculate CRC-16 (16-bit ISO 13239 1st complement) checksum.
    (see Yubikey-Manual - Chapter 6: Implementation details)

    :param msg: input byte string for crc calculation
    :type msg: bytes
    :return: crc16 checksum of msg (1st complement)
    :rtype: bytes
    """
    crc = 0xffff
    for b in six.iterbytes(msg):
        crc = crc ^ (b & 0xff)
        for _j in range(0, 8):
            n = crc & 1
            crc = crc >> 1
            if n != 0:
                crc = crc ^ 0x8408
    return int_to_bytes(crc^0xFFFF, size=2)


def get_otp_generated(private_id, usage_ctr, sesh_ctr, aes_key):
    "Returns generated part of otp in modhex given all integer inputs"
    otp_time = int(datetime.now().timestamp()*8) % 0xFFFFFF
    rnd = random.getrandbits(16)
    byte_item_list = [private_id, int_to_bytes(usage_ctr, size=2), int_to_bytes(otp_time, size=3), int_to_bytes(sesh_ctr, size=1), int_to_bytes(rnd, size=2)]
    core_msg = b''.join(byte_item_list)
    full_msg = core_msg + generate_checksum(core_msg)
    return hex_to_modhex(aes_encrypt(full_msg, aes_key).hex())


def decrypt_otp(otp, aes_key):
    "Returns a list of key parts as integers from encrypted key"
    cipher = AES.new(aes_key, AES.MODE_ECB)
    public_key_bytes = unhexlify(modhex_to_hex(otp[:12]))
    base_otp = otp[12:]
    decrypted_bytes = cipher.decrypt(unhexlify(modhex_to_hex(base_otp)))
    private_key_bytes = decrypted_bytes[:6]
    usage_ctr = int.from_bytes(decrypted_bytes[6:8], 'little')
    otp_time = int.from_bytes(decrypted_bytes[8:11], 'little')
    sesh_ctr = int.from_bytes(decrypted_bytes[11:12], 'little')
    rnd = int.from_bytes(decrypted_bytes[12:14], 'little')
    checksum_bytes = decrypted_bytes[14:]
    return {
        "public_id_hex": public_key_bytes.hex(),
        "private_id_hex": private_key_bytes.hex(),
        "otp_time": otp_time,
        "usage_counter": usage_ctr,
        "session_counter": sesh_ctr,
        "random": rnd,
        "checksum_hex": checksum_bytes.hex()
    }
