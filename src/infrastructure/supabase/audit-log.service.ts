import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface AuditLogEntry {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    const { error } = await this.supabase.client.from('audit_logs').insert({
      actor_id: entry.actorId ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      // Cast necesario: old_value/new_value son filas arbitrarias de distintas tablas
      // (businesses, employees, passes...), no se pueden tipar contra el Json estricto de Supabase.
      old_value: (entry.oldValue ?? null) as any,
      new_value: (entry.newValue ?? null) as any,
      ip_address: entry.ip ?? null,
      user_agent: entry.userAgent ?? null,
    });

    if (error) {
      // Un fallo de auditoría nunca debe interrumpir el flujo de negocio principal.
      this.logger.error(
        `No se pudo registrar el log de auditoría (${entry.action}): ${error.message}`,
      );
    }
  }
}
