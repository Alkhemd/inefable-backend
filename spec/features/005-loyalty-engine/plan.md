# Plan Técnico: Motor de Lealtad (005-loyalty-engine)

## Arquitectura (Opción B - Sin Persistencia)
1. **NestJS Module**: `src/modules/loyalty-engine/`.
2. **Endpoint**: `POST /loyalty-engine/scan`.
3. **Flujo de Escaneo**:
   - Valida que el `customerId` esté presente en la petición.
   - Genera un número aleatorio para simular la obtención de sellos (ej. 2 al 9).
   - Utiliza `google-auth-library` para obtener un token de acceso a la API REST de Google Wallet.
   - Realiza un HTTP `PATCH` a `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/{issuerId}.{customerId}`.
   - Modifica el `textModulesData` (`stamps_module` y `info_module`).

## Escudo Antifraude (Estructura)
- El endpoint quedará documentado con comentarios donde se aplicará la validación de IP (Allowlist), geolocalización (lat/lon) y validación horaria del local, listos para integrarse cuando exista la base de datos de comercios.
