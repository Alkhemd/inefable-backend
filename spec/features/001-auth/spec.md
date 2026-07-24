# 001 · Autenticación y Gestión de Usuarios

**Estado:** implementado ✅

## Qué hace

Este módulo establece la capa fundamental de seguridad del backend. Permite al servidor validar de manera segura la identidad de los usuarios (Dueños de comercios o Administradores) que realizan peticiones a la API. Todo esto mediante la intercepción y validación de tokens JWT emitidos por Supabase. 

*Nota: El registro y login (ingreso de email/password) lo hace el frontend directamente contra Supabase. El backend simplemente recibe el Token y valida "quién eres y qué permisos tienes".*

## Por qué

Es el pilar de toda la plataforma. No podemos crear comercios, sucursales ni emitir tarjetas de Google Wallet si no sabemos quién está enviando la petición y si tiene los permisos adecuados. Si este módulo falla, cualquier persona podría inyectar datos fraudulentos en el sistema.

## Criterios de aceptación

_Condiciones verificables que deben cumplirse para dar la feature por terminada._

- [x] Un `AuthGuard` global intercepta peticiones protegidas y valida el JWT usando Supabase.
- [x] Peticiones sin token o con token expirado son bloqueadas inmediatamente devolviendo un `401 Unauthorized`.
- [x] Se extrae la información del usuario (UUID, email, roles) del token y se inyecta en el objeto Request para que los controladores puedan usarla.
- [x] Decoradores personalizados (ej. `@CurrentUser()`) funcionan correctamente en los controladores.

## Fuera de alcance

_Lo que esta feature NO incluye, para evitar que crezca._

- **Autenticación por PIN de Cajeros:** Eso le pertenece exclusivamente al módulo `003-employees` para mantener la lógica antifraude separada.
- **Creación de Perfiles de Comercio:** Aquí solo validamos que el usuario existe en Supabase; los datos de su negocio van en `002-merchants`.
- **Rutas de Registro de Supabase (Signup):** El Frontend gestiona el alta de usuarios con el SDK de Supabase cliente; el backend solo consumirá el token resultante.
