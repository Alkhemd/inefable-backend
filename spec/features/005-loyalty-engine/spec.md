# 005 · Motor de Lealtad (Loyalty Engine)

**Estado:** propuesta

## Qué hace

Este es el núcleo de Inefable Wallet. Es el módulo encargado de procesar el escaneo del código QR que el cajero hace al teléfono del cliente.
Su trabajo principal es sumar sellos a la cuenta del cliente y comunicarse con la API de Google Wallet (`PATCH`) para que la tarjeta del cliente se actualice mágicamente en su bolsillo, disparando una notificación en su teléfono.

## Por qué

Este módulo garantiza que la experiencia del usuario sea "inefable" (mágica y sin esfuerzo). Además, como los dueños de negocios confían en nosotros, este motor incluye el escudo **Antifraude**: nadie puede sumar sellos desde el sofá de su casa o a las 3:00 AM si el local está cerrado.

## Criterios de aceptación

_Condiciones verificables que deben cumplirse para dar la feature por terminada._

- [ ] **Validación de Cajero:** El endpoint (`POST /loyalty-engine/scan`) debe requerir el JWT del empleado/cajero que está escaneando.
- [ ] **Escudo Antifraude Base:** Debe existir la estructura (guards/interceptors) para validar que el cajero esté físicamente en el local (Geocerca/IP) y dentro del horario comercial, rechazando el escaneo si incumple.
- [ ] **Persistencia:** Al escanear, el sistema debe registrar/actualizar en nuestra base de datos que el cliente obtuvo un sello nuevo.
- [ ] **Sincronización con Google Wallet:** El backend debe hacer una petición `PATCH` a la API de Google Wallet para actualizar el campo `stamps_module` (ej. pasar de "1/10" a "2/10") de forma automática en el celular del cliente.

## Open Questions para el Dueño del Producto

> [!WARNING]
> **El problema del Registro de Clientes**
> Para sumar sellos en *nuestra* base de datos, necesitamos guardar el progreso. Sin embargo, aún no tenemos creada la tabla de Clientes/Tarjetas.
> **¿Qué propones?**
> A) **Incluir la tabla básica de registros:** Creamos de una vez una tabla `loyalty_records` en Supabase donde guardemos `(merchant_id, customer_id, stamps_count)` para poder llevar la cuenta.
> B) **Solo conexión con Google (Sin DB propia por ahora):** Simulamos el escaneo sumando un número aleatorio de sellos y solo nos enfocamos en que Google Wallet se actualice correctamente en el teléfono. (No lo recomiendo para un producto real, pero sirve como prueba).

## Fuera de alcance

- **Redención de Premios:** Este módulo solo se encarga de SUMAR sellos. La lógica de "qué pasa cuando llega a 10 sellos y pide su premio gratis" será un módulo aparte o una fase posterior.
