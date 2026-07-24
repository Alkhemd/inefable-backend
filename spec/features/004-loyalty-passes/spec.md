# 004 · Emisión de Tarjetas (Loyalty Passes)

**Estado:** implementado ✅

## Qué hace

Este módulo es el puente directo entre nuestro backend y la API de Google Wallet. Su objetivo principal es generar un enlace seguro y firmado (`https://pay.google.com/gp/v/save/...`) para que un cliente pueda guardar su Tarjeta de Lealtad digital directamente en su celular. La tarjeta mostrará un código QR único (para que el cajero lo escanee) y el contador visual de sus sellos (ej. "3 / 10").

## Por qué

La experiencia sin fricción es vital. No queremos que los clientes tengan que descargar una app de la App Store ni crear contraseñas. Al emitir una tarjeta de Google Wallet (Generic Pass), el cliente la guarda en 2 toques. Para lograr esto, el backend debe firmar criptográficamente un token (JWT) usando las credenciales seguras de la cuenta de servicio de Google Cloud del negocio.

## Criterios de aceptación

_Condiciones verificables que deben cumplirse para dar la feature por terminada._

- [x] El sistema es capaz de generar y firmar un token JWT válido usando `google-auth-library` y una llave privada (`.env`).
- [x] El endpoint devuelve una URL de "Save to Google Wallet" que el frontend puede usar para mostrar el botón de "Añadir a Wallet".
- [x] La tarjeta digital (Google Wallet Object) debe incluir un código de barras/QR (`barcode`) con el ID único del cliente para futuros escaneos.
- [x] La tarjeta digital debe mostrar visualmente módulos de texto dinámicos (ej. "Sellos Acumulados: 3 / 10").
- [x] **Seguridad Crítica:** La llave privada (`GOOGLE_WALLET_PRIVATE_KEY`) y el correo de servicio deben consumirse desde el entorno seguro (variables de entorno) y nunca estar expuestos en respuestas HTTP.

## Fuera de alcance

_Lo que esta feature NO incluye, para evitar que crezca._

- **Lógica de sumar sellos (Escaneo):** Este módulo solo *crea* e *imprime* la tarjeta vacía o inicial. El acto del cajero escaneando el código QR para sumar un punto le pertenece al motor de lealtad (`005-loyalty-engine`).
- **Apple Wallet:** En esta fase 1, el foco exclusivo de los pases será Google Wallet (Android). Apple Wallet se abordará en una versión futura.
