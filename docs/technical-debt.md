# Deuda Técnica — Inefable Wallet

> Última actualización: 2026-07-31, tras corregir el bug de `start_url` de la PWA.
>
> Este documento junta la deuda técnica conocida de **todo el sistema** (backend y frontend), no solo de este repo. Se actualiza cada vez que se detecta algo nuevo que se decide aplazar a propósito — no es una lista de bugs activos, es una lista de "esto se hizo funcionar, pero no de la forma ideal, y aquí está el porqué".

## Backend (`inefable-Backend`)

### 1. El antifraude de IP/GPS no protege el canje de premio
`ScannerService.addStamp` valida IP/geocerca antes de otorgar un sello. `ScannerService.redeemPrize` **no tiene esa validación** — un cajero podría canjear el premio de un cliente estando fuera del negocio, sin que nada lo detecte ni lo audite como sospechoso. Decisión explícita del usuario: queda pendiente, sin fecha definida. Si se retoma, el patrón a seguir ya existe en `addStamp` (bloque de validación híbrida + `gpsRejectionMessage()`).

### 2. `any` sin tipar en resultados de joins `!inner` de Supabase
En `customers.service.ts` (`getCustomersByBusinessOwner`, variable `inst: any`) y en `admin.service.ts` (`getCustomers`, variable `c: any`). Es una categoría de tipado **distinta** al refactor de auth que sí se completó (que eliminó el `any` de `user`/`cashierPayload` en guards/controladores/decoradores). Tipar bien estos joins requiere definir una interfaz por cada forma de `.select(...)` anidado que regresa Supabase — más trabajo, nunca abordado.

### 3. `database.types.ts` fue parchado a mano
Se agregaron `shift_start`/`shift_end` (tabla `employees`) y `timezone` (tabla `businesses`) escribiendo directamente en el archivo autogenerado, en vez de correr `supabase gen types typescript`. Funciona porque el usuario sí corrió el SQL real en Supabase — pero el archivo ya no es 100% "fuente de verdad regenerada", es una edición manual que coincide con la base de datos por ahora. Regenerarlo de verdad en cuanto se pueda.

### 4. Panel Super Admin usa una variable de entorno, no una tabla
`SUPER_ADMIN_USER_ID` compara contra un solo UUID fijo. Decisión deliberada (un solo Super Admin — el usuario — por ahora, hasta que Juan apruebe el proyecto y se use la cuenta de la empresa). Si algún día hay más de un Super Admin simultáneo, hay que migrar a una tabla `admins` — no es difícil, pero no está construido.

## Frontend (`inefable-frontend`)

> Nota: este backend no tiene acceso directo al repo del frontend. Estos puntos se registran aquí porque surgieron en las sesiones de prueba conjunta y hay que darles seguimiento — pero lo ideal es que también queden documentados en el repo del frontend.

### 5. No hay indicador visual de "en turno ahora" vs "activo como empleado"
En la pantalla de **Cajeros**, el badge **"Activo"** solo refleja `is_active` (si el empleado sigue existiendo en el sistema), no si está dentro de su horario configurado en este momento. Un cajero puede verse "Activo" en el dashboard y aun así estar bloqueado para loguearse por estar fuera de su turno — confuso para el dueño sin un segundo indicador tipo "🟢 En turno ahora" / "⚪ Fuera de turno", calculado comparando la hora actual contra `shift_start`/`shift_end` en la zona horaria del negocio (mismo cálculo que ya hace el backend en `EmployeesService.loginEmployee`). Detectado en la prueba real del 2026-07-30.

### 6. No existe UI para configurar el antifraude (IP/GPS)
El backend ya soporta `anti_fraud_mode`, `authorized_ip`, `lat`, `lng`, `radius_meters` (`POST /merchants/security/ip`, `/security/gps`, `/security/mode`), pero no hay ninguna pantalla en el dashboard que los expuesto. Durante la prueba real del 2026-07-30 tuvimos que setear `anti_fraud_mode` directo en la tabla `businesses` de Supabase porque no había otra forma de hacerlo.

### 7. Los botones "Copiar link escáner" / "Abrir Escáner" siguen en el dashboard del dueño
Eran un atajo temporal (documentado desde antes de esta ronda de trabajo) para poder probar el escáner desde una laptop, mientras no existía la PWA real. Ahora que la PWA **sí funciona y ya se probó en un dispositivo físico real** (2026-07-30: login con horario, escaneo con cámara real, antifraude, canje — todo verificado), estos botones ya no tienen razón de estar en el panel del dueño y deberían quitarse — el dueño no debería tener una forma de "actuar como cajero" desde su propio dashboard.

### 8. El picker de horario del cajero se ve poco intuitivo
En **Cajeros**, el input de `shift_start`/`shift_end` es el `<input type="time">` nativo del navegador — en Chrome/Windows se ve como columnas separadas de hora/minuto/a.m.-p.m. con scroll, poco claro para tecleo directo. El backend no tiene ninguna opinión sobre esto — solo espera un string `"HH:mm"` (`@IsMilitaryTime()`), sin importar qué componente lo capture. Es puro reemplazo de componente visual en el frontend.

### 9. Falta paso de confirmación antes de canjear el premio
`ScannerService.redeemPrize` no se puede revertir (no hay endpoint de "descanjear"). Hoy "Canjear ahora" es un solo toque sin confirmación — un toque accidental le resetea la tarjeta a un cliente sin que reciba su recompensa. Se sugirió agregar un diálogo de confirmación ("¿Ya le diste su premio al cliente?") antes de mandar la petición. Además, se encontró un **bug real** en este mismo flujo: la app se queda en pantalla blanca (crash de React) al presionar "Canjear ahora" — probablemente el componente no lee los campos correctos de la respuesta (`remainingStamps`/`requiredStamps`). Pendiente de corrección y de agregar un Error Boundary alrededor del flujo del escáner como red de seguridad general.

## Ya resuelto (dejado aquí como referencia histórica, no es deuda activa)

- ~~JWT del cajero de duración fija (12h)~~ — reemplazado por expiración dinámica basada en `shift_end` + bloqueo de login fuera de horario (2026-07-29/30, verificado en producción).
- ~~Cobertura de tests casi nula~~ — 11 suites, 80 tests para todos los services con lógica real (2026-07-29).
- ~~Mensaje confuso en rechazo antifraude GPS ("-1m")~~ — corregido para distinguir "sin permiso de ubicación" de "fuera de rango" (2026-07-30).
- ~~Bug de redirección al salir del escáner (mandaba al login del dueño)~~ — corregido en `QRScanner.tsx` (2026-07-30, verificado con prueba real).
- ~~Bug de cámara en negro tras "Escanear Siguiente"~~ — corregido (el contenedor de la cámara ya no se desmonta) (2026-07-30, verificado con prueba real y en dispositivo físico).
- ~~El ícono instalado de la PWA abría en el login del dueño en vez de la sesión del cajero~~ — corregido: token del cajero movido a `localStorage` y la ruta raíz ahora redirige a `/scanner/app` si detecta una sesión de cajero válida (2026-07-31, confirmado por el usuario tras probarlo en el dispositivo real).
