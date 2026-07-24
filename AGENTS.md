# Inefable Wallet Backend

Backend API para Inefable Wallet, un sistema de fidelización y monedero digital que conecta negocios (merchants) con clientes a través de pases de Apple Wallet y Google Wallet.

## Stack
- **Lenguaje:** TypeScript estricto
- **Framework / runtime:** NestJS (Node.js)
- **Base de datos:** PostgreSQL (vía Supabase)
- **Tests:** Jest (Estándar de NestJS)

## Comandos
- `npm run start:dev` — arranca el servidor en local con recarga automática
- `npm run test`      — ejecuta los tests unitarios (deben pasar antes de cada commit)
- `npm run lint`      — revisa el estilo del código (antes de cada PR)
- `npm run build`     — compila la aplicación para producción

## Estructura del proyecto
- `src/`  — Código fuente principal, estructurado por Features / Vertical Slices (ej. `auth/`, `passes/`, `transactions/`).
- `test/` — Pruebas end-to-end (e2e).

## Convenciones
- **Estilo de nombres:** `camelCase` para variables y métodos. `PascalCase` para clases, DTOs e Interfaces.
- **Ubicación de los tests:** Al lado del archivo que prueban (ej. `auth.service.ts` -> `auth.service.spec.ts`).
- **Manejo de errores:** Usar las excepciones integradas de NestJS (ej. `NotFoundException`, `BadRequestException`) en lugar de arrojar errores genéricos.
- **Patrón a seguir:** Arquitectura Screaming / Vertical Slices. Toda entrada del usuario DEBE ser validada usando DTOs y `class-validator` antes de procesarse.

## No hagas
- **No uses `any`** en TypeScript bajo ninguna circunstancia sin una justificación técnica comentada.
- **No metas lógica de negocio en los Controladores.** Los controladores solo enrutan; la lógica va en los Servicios (Casos de Uso).
- **No expongas credenciales.** No subir archivos `.env` o llaves secretas de Supabase al repositorio.
- **No instales dependencias** extra sin avisar y justificar su uso.

## Flujo de trabajo
- Antes de una tarea no trivial, propón un plan y espera mi OK.
- Una tarea a la vez; al terminar, dime qué cambiaste para que lo revise.
- Si no estás seguro al 80%, pregunta. No inventes.

## Documentación
- Referencias a la arquitectura general, el esquema de la base de datos y diagramas ER se encuentran centralizados en el repositorio de documentación (`docs/03-architecture`).
- Seguir estrictamente el diseño "Serverless + BaaS", delegando responsabilidades de autenticación y seguridad (RLS) a Supabase siempre que sea posible.
