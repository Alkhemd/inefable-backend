# 003 · Gestión de Cajeros (Employees)

**Estado:** implementado ✅

## Qué hace

Este módulo permite a un Dueño (Merchant) crear y administrar las cuentas de sus empleados (Cajeros). Cada cajero recibe un nombre y un **PIN secreto de 4 dígitos**. Este PIN será la única "llave" que el cajero necesitará para iniciar sesión en la aplicación (PWA) de escáner y poder otorgar sellos a los clientes, sin necesidad de correos electrónicos ni contraseñas complejas.

## Por qué

La seguridad antifraude es el pilar de Inefable Wallet. Si un cajero usa su propio celular para dar sellos ilimitados a sus amigos, el negocio pierde dinero. Al crear perfiles separados por cajero con un PIN rastreable, el Dueño siempre sabrá *quién* dio cada sello. Además, sienta las bases para bloquear el acceso si el cajero no está conectado al Wi-Fi del local.

## Criterios de aceptación

_Condiciones verificables que deben cumplirse para dar la feature por terminada._

- [x] El Dueño puede crear un Cajero, proporcionando su Nombre y un PIN de 4 dígitos.
- [x] El PIN del cajero nunca se guarda en texto plano; debe encriptarse unidireccionalmente (ej. con bcrypt) en la base de datos por seguridad.
- [x] El Dueño puede listar todos sus cajeros y desactivarlos (inhabilitación booleana `is_active`) si un empleado renuncia o es despedido.
- [x] **Seguridad Estricta:** Un Dueño solo puede crear, ver o editar cajeros que pertenezcan EXCLUSIVAMENTE a su propio negocio (`business_id`).

## Fuera de alcance

_Lo que esta feature NO incluye, para evitar que crezca._

- **Autenticación del Cajero (Login):** Este módulo solo permite *crear* al cajero por parte del dueño. El acto de que el cajero ponga su PIN en la PWA y reciba un token se hará en un módulo posterior (Scanner Auth).
- **Emisión de Sellos:** Este módulo no incluye la lógica de escanear códigos QR ni dar puntos.
- **Validación de red Wi-Fi/IP en tiempo real:** Dejaremos la base lista, pero el bloqueo activo por IP se ejecutará durante el momento de dar el sello (módulo `005-loyalty-engine`).
