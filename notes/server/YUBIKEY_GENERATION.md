# YubikeyOTPGenerator

Decreption Steps:
1) Begin with modhex Key Input
2) Remove 12 digit long public key from beginning of key
3) Convert encrypted key from modhex to hexidecimal
4) Decrept this hex string with hex key using AES-128
5) Split up parts of key to get different parts 
    6 byte id, 2 byte usage cnt, 3 byte timestamp, 1 byte session ctr, 2 byte random number, 2 byte checksum

Generation Steps
1) Get Modhex public key, Hex aes key, Hex private ID
2) Generate timestamp (3 byte hex from unix time)
3) Initialize session counter at 00 (1 byte, incrementing)
4) Get usage counter (2 bytes, Starts at zero, increments every time session counter increments, or devic powers up. Currently at 0700)
5) Generate random number 2 bytes long
6) Append them as (private ID, usage counter, timestamp, session counter, random number, checksum (calculated))
7) AES Encrypt into byes
8) Convert bytes into hex into modhex
9) Append modhex public key to beginning