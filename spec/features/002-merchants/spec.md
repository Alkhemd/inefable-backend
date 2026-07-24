# 002 · Gestión de Comercios (Merchants)

**Estado:** implementado ✅

## Qué hace

Este módulo gestiona la información principal de los Dueños (Merchants) y sus negocios dentro de la plataforma Inefable Wallet. Permite registrar un nuevo negocio, actualizar sus datos (nombre comercial, logo, ubicación) y definir las **Reglas de Lealtad** (por ejemplo: "A los 10 sellos, el cliente recibe 1 café gratis").

## Por qué

Una vez que un Dueño puede iniciar sesión (gracias a `001-auth`), necesita configurar la identidad de su negocio y las reglas de su programa de fidelización antes de poder invitar cajeros o emitir tarjetas digitales. Este perfil es el núcleo sobre el cual gira toda la operativa comercial.

## Criterios de aceptación

_Condiciones verificables que deben cumplirse para dar la feature por terminada._

- [x] Un usuario autenticado puede crear el perfil de su negocio (solo 1 negocio por Dueño en esta primera versión).
- [x] Un usuario autenticado puede actualizar los datos y la "Regla de Lealtad" de su propio negocio.
- [x] Los datos de entrada están estrictamente validados mediante DTOs para evitar inyección de datos sucios.
- [x] **Seguridad Crítica:** Un Dueño solo puede acceder o modificar la información de SU PROPIO negocio (validando que el `user_id` de la petición coincida con el dueño del registro).

## Fuera de alcance

_Lo que esta feature NO incluye, para evitar que crezca._

- **Alta de Cajeros (Employees):** Este módulo solo maneja la información de la tienda. La creación de PINs y cajeros pertenece exclusivamente a `003-employees`.
- **Diseño Visual de la Tarjeta:** La configuración de imágenes de fondo y colores para la tarjeta de Google Wallet pertenece a `004-loyalty-passes`.
- **Gestión Multi-Sucursal:** En esta versión, un Dueño tiene un único local/negocio principal. No se manejarán múltiples sucursales bajo una misma cuenta aún.
