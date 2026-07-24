# Plan Técnico: Emisión de Tarjetas (004-loyalty-passes)

Este plan documenta la integración de NestJS con la API de Google Wallet.

## Arquitectura
1. **Librerías**: `google-auth-library` para generar el cliente y `jsonwebtoken` para firmar el JWT.
2. **NestJS Module**: `src/modules/wallet-passes/`.
3. **Validación (DTOs)**: `class-validator` para asegurar que el endpoint reciba el `customerId`.
4. **Seguridad de Secretos**: El servicio lee de `process.env` las variables de Google Cloud, parseando los saltos de línea de la llave privada. Las credenciales nunca se exponen al cliente.

## Flujo de Endpoint
1. `POST /wallet-passes/generate`: Recibe en el Body un `customerId` (ej. UUID o string inventado temporalmente).
2. El `WalletPassesService` construye un Generic Object de Google Wallet, donde `barcode.value = customerId`.
3. El objeto se envuelve en los `claims` y se firma con RSA256.
4. Retorna la URL dinámica `{ url: 'https://pay.google.com/gp/v/save/eyJ...' }`.
