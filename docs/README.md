# Memoria del Proyecto (Backend)

> **Propósito:** Este directorio funciona como nuestro "disco duro a largo plazo" (Long-Term Memory). 
> Dado que la memoria de contexto de la IA es limitada, este espacio modular nos permite buscar rápidamente cómo resolvimos un problema o por qué tomamos una decisión sin tener que leer archivos gigantescos.

## Estructura de la Memoria

Hemos dividido esta carpeta en tres áreas clave para mantener el contexto súper rápido y ligero:

1. **`/decisions` (Architecture Decision Records - ADR):**
   Archivos cortos que documentan el "Por qué" de una regla inquebrantable. Ejemplo: por qué usamos Fastify o por qué prohibimos los ORMs.

2. **`/features-memory` (Resumen Post-Mortem):**
   Una vez que el código de un módulo (ej. `001-auth`) está terminado, guardamos aquí un resumen técnico de 1 minuto de lectura. Si la IA olvida cómo se valida un usuario, solo tiene que leer ese pequeño archivo.

3. **`/troubleshooting` (Cementerio de Bugs):**
   Si pasamos horas peleando contra un error extraño de Supabase o NestJS, documentamos la solución aquí para aplicar la cura instantánea si vuelve a ocurrir en el futuro.

4. **`technical-debt.md` (Deuda Técnica Conocida):**
   Cosas que se hicieron funcionar pero no de la forma ideal, a propósito, con el porqué. Cubre backend y frontend (aunque este repo no tenga acceso directo al código del frontend). Se actualiza cada vez que se detecta algo nuevo que se decide aplazar.
