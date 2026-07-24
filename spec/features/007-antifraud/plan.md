# Plan de Implementación: 007 - Módulo Antifraude (Híbrido)

## 1. Modificación de la Base de Datos
- Alterar la tabla `businesses` añadiendo las siguientes columnas de configuración de seguridad:
  - `authorized_ip INET`
  - `lat DOUBLE PRECISION`
  - `lng DOUBLE PRECISION`
  - `radius_meters INTEGER DEFAULT 50`
  - `anti_fraud_mode VARCHAR(20) DEFAULT 'none'` (Permite: `ip_only`, `gps_only`, `both`, `none`)

## 2. Configuración en Módulo Merchants
En `merchants.controller.ts` y `merchants.service.ts`:
- Añadir endpoint `POST /merchants/security/ip` que capture la `@Ip()` del request para guardarla.
- Añadir endpoint `POST /merchants/security/gps` que reciba `lat`, `lng` y `radius_meters`.
- Añadir endpoint `POST /merchants/security/mode` para cambiar la modalidad activa.

## 3. Lógica de Seguridad en Motor de Lealtad
En `loyalty-engine.controller.ts` y `loyalty-engine.service.ts`:
- En el endpoint `POST /scan`, añadir decorador `@Ip() ip` y actualizar el `ScanPassDto` para que admita `lat` y `lng` (opcionales).
- Crear una función privada `calculateDistance(lat1, lon1, lat2, lon2)` basada en la fórmula de Haversine para obtener metros entre dos coordenadas.
- En la función `processScan`, antes de otorgar el sello:
  - Leer el `anti_fraud_mode` del local.
  - Ejecutar la validación condicional estricta.
  - Si la validación correspondiente falla, arrojar `403 Forbidden`.
