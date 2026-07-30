import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { AuditLogService } from '../../infrastructure/supabase/audit-log.service';
import { UpdateLoyaltyConfigDto } from './dto/update-loyalty-config.dto';

@Injectable()
export class LoyaltyEngineService {
  private readonly logger = new Logger(LoyaltyEngineService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async getLoyaltyConfig(ownerUserId: string) {
    const supabase = this.supabase.client;

    // Primero buscar el negocio del dueño
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_user_id', ownerUserId)
      .is('deleted_at', null)
      .single();

    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    // Luego buscar el programa de lealtad asociado a ese negocio
    const { data: program } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('business_id', business.id)
      .single();

    return {
      program: program || null,
      business,
    };
  }

  async upsertLoyaltyConfig(
    ownerUserId: string,
    dto: UpdateLoyaltyConfigDto,
    ip?: string,
    userAgent?: string,
  ) {
    const supabase = this.supabase.client;

    // 1. Obtener el business_id
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_user_id', ownerUserId)
      .is('deleted_at', null)
      .single();

    if (businessError || !business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    // 2. Comprobar si ya existe un programa
    const { data: existingProgram } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('business_id', business.id)
      .single();

    if (existingProgram) {
      // Update
      const { data, error } = await supabase
        .from('loyalty_programs')
        .update({
          stamp_goal: dto.stamp_goal,
          reward_description: dto.reward_description,
          terms_and_conditions: dto.terms_and_conditions,
          is_active: dto.is_active !== undefined ? dto.is_active : true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProgram.id)
        .select()
        .single();

      if (error) {
        this.logger.error(error);
        throw new InternalServerErrorException(
          'Error al actualizar las reglas de lealtad',
        );
      }

      await this.auditLog.log({
        actorId: ownerUserId,
        action: 'loyalty_config_updated',
        entityType: 'loyalty_programs',
        entityId: data.id,
        oldValue: existingProgram,
        newValue: data,
        ip,
        userAgent,
      });

      return data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('loyalty_programs')
        .insert({
          business_id: business.id,
          name: 'Programa de Lealtad',
          type: 'stamps',
          stamp_goal: dto.stamp_goal,
          reward_description: dto.reward_description,
          terms_and_conditions: dto.terms_and_conditions,
          is_active: dto.is_active !== undefined ? dto.is_active : true,
        })
        .select()
        .single();

      if (error) {
        this.logger.error(error);
        throw new InternalServerErrorException(
          'Error al crear las reglas de lealtad',
        );
      }

      await this.auditLog.log({
        actorId: ownerUserId,
        action: 'loyalty_config_created',
        entityType: 'loyalty_programs',
        entityId: data.id,
        newValue: data,
        ip,
        userAgent,
      });

      return data;
    }
  }
}
