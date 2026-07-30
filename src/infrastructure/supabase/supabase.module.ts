import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { AuditLogService } from './audit-log.service';

@Global()
@Module({
  providers: [SupabaseService, AuditLogService],
  exports: [SupabaseService, AuditLogService],
})
export class SupabaseModule {}
