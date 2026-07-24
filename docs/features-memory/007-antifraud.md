# Memoria Técnica: 007 - Módulo Antifraude Híbrido

## Propósito
Este módulo blinda el programa de lealtad previniendo que los empleados otorguen sellos de forma fraudulenta desde ubicaciones no autorizadas. Implementa un esquema de validación dual (IP + GPS).

## Cambios en la Base de Datos (Supabase)
Se añadieron cinco columnas a la tabla `businesses` para permitir la configuración de la geocerca y red local:
- `authorized_ip` (INET): Guarda la IP pública del router del negocio.
- `lat` / `lng` (DOUBLE PRECISION): Coordenadas exactas del local comercial.
- `radius_meters` (INTEGER): Rango de tolerancia en metros (Default: 50).
- `anti_fraud_mode` (VARCHAR): Enum string para definir qué validación corre (`ip_only`, `gps_only`, `both`, `none`).

## Implementación Técnica

### 1. Configuración (Merchants Module)
Se extendió el `UpdateMerchantDto` para permitir la inyección de los parámetros de seguridad.
Se expusieron tres sub-rutas en `MerchantsController`:
- `POST /merchants/security/ip`: Extrae automáticamente el `@Ip()` del decorador de NestJS.
- `POST /merchants/security/gps`: Recibe lat, lng y el radio de cobertura.
- `POST /merchants/security/mode`: Activa el candado de seguridad seleccionado por el dueño.

### 2. Validación (Loyalty Engine Module)
El proceso central de escaneo en `LoyaltyEngineService` fue interceptado antes de hacer el insert del sello.
**Flujo de decisión:**
1. Al recibir un escaneo, extrae el `business_id` al que pertenece el cajero (`employeeId`).
2. Compara que este `business_id` empate con el `business_id` dueño de la tarjeta (previene que un cajero de un negocio escanee la tarjeta de otro negocio).
3. Consulta el `anti_fraud_mode` y los parámetros de seguridad del local.
4. Calcula la distancia física real mediante la **Fórmula Matemática de Haversine** considerando la curvatura de la tierra (R = 6371km).
5. Interrumpe el flujo arrojando `ForbiddenException` (403) si la condición obligada no se cumple.
6. Si es exitoso, guarda las coordenadas en la columna `fraud_check_data` (JSONB) dentro de `stamp_transactions` como rastro de auditoría.

## Deuda Técnica
- Si el backend se sube a un entorno serverless detrás de balanceadores (ej. Render/AWS ALB), se debe asegurar habilitar `app.set('trust proxy', true)` en NestJS para que `@Ip()` no tome la IP del balanceador de carga interno, sino la del `x-forwarded-for`.
