# AutoAuthenticate
![test indicator](https://github.com/msdrigg/AutoAuthenticate/actions/workflows/node.js.yml/badge.svg)
## Project Goals
This project is a browser extension that can provide auto-authentication keys. 
This product will provide Time-based one time passcodes, RSA SecureID passcodes, Yubikey passcodes and any other algorithms I can think to implement
This product will manage the passcodes in a remote server, and provide them to you as a copiable code.
I will also work to implement an autofill portion of this extension.
OTP codes will be stored in a server, but it will be E2E encrypted, and the server will never see unencrypted keys.
## Project Roadmap
Currently the browser extension is in a prototype format. It needs some cleanup and it needs to be able to handle multiple keys.
The browser extension needs autofill features added in more places.
The server code needs to be rewritten.
I am moving away from django and want to rely on AWS lambda and AWS dynamoDB to store and retrieve keys.
This will allow me to scale faster while not maintaining a server.
