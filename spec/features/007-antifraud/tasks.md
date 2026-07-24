# Tareas: 007 - Módulo Antifraude (Híbrido)

- [x] Modificar base de datos Supabase
  - [x] Añadir columna `authorized_ip`
  - [x] Añadir columna `lat` y `lng`
  - [x] Añadir columna `radius_meters`
  - [x] Añadir columna `anti_fraud_mode`
  - [x] Refrescar tipos de TypeScript
- [x] Módulo Merchants (Configuración de Seguridad)
  - [x] Crear endpoint `POST /merchants/security/ip`
  - [x] Crear endpoint `POST /merchants/security/gps`
  - [x] Crear endpoint `POST /merchants/security/mode`
- [x] Módulo Loyalty Engine (Bloqueo)
  - [x] Actualizar `ScanPassDto` con coordenadas
  - [x] Capturar `@Ip()` en el controller
  - [x] Implementar validación condicional y cálculo de distancia en el Service
- [x] Pruebas locales y simulación de IPs/Coordenadas (Mediante `npm run build` y validación de tipos)
