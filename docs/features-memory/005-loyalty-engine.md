# Memoria Técnica: 005 - Loyalty Engine (Motor de Lealtad)

## Propósito
Este módulo es el cerebro operativo (y antifraude) de Inefable Wallet. Se encarga de recibir el escaneo del cajero, procesarlo, y comunicarse directamente con la API REST de Google Wallet para actualizar la tarjeta en el teléfono del cliente.

## Decisiones Clave (Architecture Records)
1. **Google Wallet API HTTP:** A diferencia de la emisión (Módulo 004) donde solo firmábamos un JWT localmente, aquí sí tuvimos que hacer peticiones HTTP (`PATCH` y `POST`) a `walletobjects.googleapis.com`.
2. **Forzado de Notificaciones Push:** Descubrimos que un simple `PATCH` a Google Wallet actualiza la tarjeta silenciosamente. Para que el cliente reciba la notificación push (vibración/sonido), tuvimos que integrar el endpoint `/addMessage` con la etiqueta `TEXT_AND_NOTIFY`.
3. **Persistencia Postergada (Simulación):** Acordamos con el Product Owner posponer la integración de la tabla `loyalty_records` en Supabase. Actualmente, el número de sellos inyectado a Google Wallet se genera aleatoriamente (2 al 9) para probar que la API funciona de extremo a extremo de manera aislada.

## Dependencias
- `google-auth-library` para generar el token OAuth 2.0 requerido por la API REST de Google Wallet usando el `GOOGLE_WALLET_PRIVATE_KEY` de la Service Account.
- El endpoint está protegido por el `SupabaseAuthGuard` (requiere ser empleado/cajero).

## Deuda Técnica & Próximos Pasos
- **[URGENTE] Base de Datos:** Cuando se configure Supabase, este módulo DEBE modificarse para:
  1. Extraer los sellos actuales del cliente desde la base de datos.
  2. Sumarle +1.
  3. Guardar el nuevo registro en base de datos.
  4. Enviar *ese* número exacto a Google Wallet en lugar del número aleatorio.
- **[FUTURO] Antifraude Real:** La estructura está preparada en `loyalty-engine.controller.ts`, pero falta programar la lógica que compare la IP/Geocerca de la petición con la tabla de `businesses` (Comercios).
