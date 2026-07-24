# Memoria Técnica: 004-loyalty-passes

**Implementado el:** Julio 2026

## Resumen Arquitectónico

- **Objetivo:** Generación de enlaces JWT firmados ("Añadir a Google Wallet") para los clientes.
- **Librerías Clave:** `google-auth-library` para validar scopes de emisor, `jsonwebtoken` para el firmado RSA256.
- **Ruta Principal:** `POST /wallet-passes/generate`

## Cómo funciona el Flujo de la Tarjeta

1. El Frontend envía el `customerId` al backend.
2. El servicio de NestJS recupera las credenciales de Google Cloud (`.env`).
3. Se crea el Payload (GenericObject) donde `barcode.value = customerId` y `id = {issuerId}.{customerId}`.
4. Se firma usando el `GOOGLE_WALLET_PRIVATE_KEY` (cuidando los saltos de línea `\n`).
5. Retornamos `{ url: "https://pay.google.com/gp/v/save/eyJ..." }`. El frontend simplemente redirecciona o abre este link para que el celular procese la tarjeta.
