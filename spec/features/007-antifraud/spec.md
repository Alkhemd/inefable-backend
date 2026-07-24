# 007 · Módulo Antifraude (Híbrido: IP + GPS)

**Estado:** propuesta

## Qué hace

Este módulo de seguridad protege el sistema de lealtad asegurando que los sellos solo se otorguen si el cajero está físicamente en el negocio.
Para lograrlo, introduce un sistema híbrido que permite al dueño configurar el nivel de restricción requerido:
1. **Bloqueo por IP (WiFi)**: Verifica que el celular del cajero esté conectado a la misma red de internet del local.
2. **Bloqueo por GPS (Geocerca)**: Verifica que la latitud y longitud del celular del cajero esté dentro de un radio permitido (ej. 50 metros) del local.
3. Modos combinados o apagados según la necesidad del negocio.

## Por qué

El fraude interno es el mayor riesgo financiero de los programas de lealtad. Si un empleado otorga sellos desde su casa o fuera de su turno de trabajo, el negocio pierde dinero. Proveer diferentes modalidades (WiFi, GPS o ambas) otorga máxima flexibilidad para distintos tipos de comercios (locales fijos, food trucks móviles, etc.).

## Criterios de aceptación

- [x] Modificar la tabla `businesses` para añadir columnas: `authorized_ip`, `lat`, `lng`, `radius_meters`, `anti_fraud_mode`.
- [x] Crear endpoints en el módulo de dueños para configurar estas variables de seguridad.
- [x] Modificar el endpoint de escaneo para recibir opcionalmente `lat` y `lng` del cajero, además de leer automáticamente su `@Ip()`.
- [x] Implementar el cálculo de distancia geográfica (Fórmula de Haversine) en el backend.
- [x] Procesar la validación según el modo activo (`ip_only`, `gps_only`, `both`, `none`).
- [x] Responder con `403 Forbidden` si la validación estricta del local falla.

## Fuera de alcance
- Bloqueo por horarios del turno del cajero (time-fencing). Se mantendrá puramente basado en geolocalización e IP para esta versión.
