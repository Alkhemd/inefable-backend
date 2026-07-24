# Modelo de Datos - Inefable Wallet (Supabase Edition)

**Documento**: Database Schema & Design  
**Versión**: 2.1 (Refactorizado para Supabase + Consumidores)  
**Fecha**: 17 de julio de 2026  
**Estado**: Listo para implementación  

---

## 1. Visión General

### 1.1 Motor: PostgreSQL 15+ (vía Supabase)

**Razones**: Ruteo de conexiones masivas nativo con Supavisor (Puerto 6543), Row Level Security (RLS) nativo, Auth nativa.

### 1.2 Principios

- **Autenticación Delegada**: Las contraseñas, sesiones y verificaciones de correo las maneja automáticamente el esquema `auth` de Supabase.
- **Normalización**: 3NF mínimo
- **Integridad**: Constraints, FKs, CHECKs
- **Rendimiento**: Índices estratégicos
- **Escalabilidad**: Multi-tenancy listo usando `business_id` en todas las consultas

### 1.3 Convenciones

```
Tablas: snake_case, plural (businesses, passes)
Columnas: snake_case (created_at, is_published)
PK: id UUID
FK: {tabla}_id
Índices: idx_{tabla}_{columnas}
```

---

## 2. Tablas Principales (Esquema `public`)

*Nota: La tabla global de usuarios vive en el esquema seguro de Supabase (`auth.users`), no la creamos manualmente.*

### 2.1 businesses (Negocios / Dueños)

```sql
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(50) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    logo_url TEXT,
    status VARCHAR(50) DEFAULT 'trial',
    trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT businesses_owner_unique UNIQUE (owner_user_id),
    CONSTRAINT businesses_industry CHECK (
        industry IN ('restaurant', 'retail', 'service', 'other')
    )
);

CREATE INDEX idx_businesses_owner_id ON businesses(owner_user_id);
CREATE INDEX idx_businesses_status ON businesses(status);
```

### 2.2 employees (Cajeros) - *[NUEVA]*

```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL, -- PIN de 4 dígitos encriptado (bcrypt)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_employees_business_id ON employees(business_id);
```
*Propósito: Autentica a los cajeros en la PWA del Scanner usando un PIN de 4 dígitos.*

### 2.3 customers (Consumidores Finales) - *[NUEVA]*

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone_number VARCHAR(50),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Opcional: Por si en el futuro se les hace una app
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customers_business_id ON customers(business_id);
CREATE INDEX idx_customers_email ON customers(email);
```
*Propósito: Guarda los datos de marketing (CRM) de las personas que descargan el pase de Google Wallet para un negocio en específico. Si el Dueño de la Cafetería quiere mandar promociones, saca los correos de aquí. (Nota: Juan, como Super Admin creador de Inefable, tiene acceso global a las estadísticas de esta tabla para métricas de la empresa).*

### 2.4 loyalty_programs

```sql
CREATE TABLE loyalty_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'stamp_card',
    name VARCHAR(255) NOT NULL,
    stamp_goal INTEGER NOT NULL DEFAULT 10,
    reward_description TEXT,
    terms_and_conditions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT stamp_goal_range CHECK (stamp_goal BETWEEN 1 AND 100)
);

CREATE INDEX idx_loyalty_programs_business_id ON loyalty_programs(business_id);
```

### 2.5 passes

```sql
CREATE TABLE passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    program_id UUID REFERENCES loyalty_programs(id) ON DELETE SET NULL,
    pass_type VARCHAR(50) NOT NULL DEFAULT 'stampCard',
    background_color VARCHAR(7) DEFAULT '#2563EB',
    foreground_color VARCHAR(7) DEFAULT '#FFFFFF',
    description VARCHAR(255),
    qr_code_url TEXT,
    apple_pass_id VARCHAR(255),
    google_pass_id VARCHAR(255),
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_passes_business_id ON passes(business_id);
CREATE INDEX idx_passes_published ON passes(is_published);
```

### 2.6 pass_installations

```sql
CREATE TABLE pass_installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pass_id UUID NOT NULL REFERENCES passes(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL, -- Referencia directa al consumidor de Inefable
    device_id VARCHAR(255) NOT NULL,
    platform VARCHAR(10) NOT NULL,
    device_token VARCHAR(500),
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_removed BOOLEAN DEFAULT FALSE,
    removed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT platform_check CHECK (platform IN ('ios', 'android'))
);

CREATE INDEX idx_installations_pass_id ON pass_installations(pass_id);
CREATE INDEX idx_installations_device_id ON pass_installations(device_id);
CREATE UNIQUE INDEX idx_installations_unique 
    ON pass_installations(pass_id, device_id, platform);
```

### 2.7 stamp_transactions

```sql
CREATE TABLE stamp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id UUID NOT NULL REFERENCES pass_installations(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL, -- Quién dio el sello
    stamp_count INTEGER NOT NULL,
    stamp_goal INTEGER NOT NULL,
    is_valid BOOLEAN DEFAULT TRUE,
    fraud_check_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT stamp_count_positive CHECK (stamp_count >= 0)
);

CREATE INDEX idx_stamps_installation_id ON stamp_transactions(installation_id);
CREATE INDEX idx_stamps_created_at ON stamp_transactions(created_at);
```

### 2.8 redemptions

```sql
CREATE TABLE redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id UUID NOT NULL REFERENCES pass_installations(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL, -- Quién procesó el canje
    stamp_count_at_redemption INTEGER NOT NULL,
    is_valid BOOLEAN DEFAULT TRUE,
    rejection_reason VARCHAR(100),
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_redemptions_installation_id ON redemptions(installation_id);
CREATE INDEX idx_redemptions_redeemed_at ON redemptions(redeemed_at);
```

### 2.9 audit_logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID, -- Puede ser auth.users(id) o employees(id)
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
```

---

## 3. Próximos Pasos (Supabase Workflow)

1. Pegar estos scripts SQL en el **SQL Editor** del dashboard de Supabase para generar el esquema inicial.
2. Activar **Row Level Security (RLS)** en el panel de Supabase para asegurar que cada dueño (tenant) solo vea los datos de su `business_id`.
3. Ejecutar `supabase gen types typescript --project-id "tu-project-id" > types/supabase.ts` en nuestro proyecto de NestJS para autogenerar los modelos en TypeScript.
