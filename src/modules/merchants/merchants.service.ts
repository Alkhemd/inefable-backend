import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { AuditLogService } from '../../infrastructure/supabase/audit-log.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

export interface MerchantAuditContext {
  action: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class MerchantsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(userId: string, dto: CreateMerchantDto) {
    const { data, error } = await this.supabase.client
      .from('businesses')
      .insert({ owner_user_id: userId, ...dto })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          'El usuario ya tiene un negocio registrado.',
        );
      }
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async getMyBusiness(userId: string) {
    const { data, error } = await this.supabase.client
      .from('businesses')
      .select('*')
      .eq('owner_user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('No tienes ningún negocio registrado.');
      }
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async updateMyBusiness(
    userId: string,
    dto: UpdateMerchantDto,
    auditContext?: MerchantAuditContext,
  ) {
    let oldValue: unknown = null;
    if (auditContext) {
      const { data: old } = await this.supabase.client
        .from('businesses')
        .select('*')
        .eq('owner_user_id', userId)
        .is('deleted_at', null)
        .single();
      oldValue = old ?? null;
    }

    const { data, error } = await this.supabase.client
      .from('businesses')
      .update(dto)
      .eq('owner_user_id', userId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    if (!data) {
      throw new NotFoundException('Negocio no encontrado.');
    }

    if (auditContext) {
      await this.auditLog.log({
        actorId: userId,
        action: auditContext.action,
        entityType: 'businesses',
        entityId: data.id,
        oldValue,
        newValue: data,
        ip: auditContext.ip,
        userAgent: auditContext.userAgent,
      });
    }

    return data;
  }
}
