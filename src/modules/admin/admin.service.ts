import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { AuditLogService } from '../../infrastructure/supabase/audit-log.service';
import { UpdateMerchantDto } from '../merchants/dto/update-merchant.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  // Ids de negocios no eliminados (soft-delete), usados como filtro base en el resto de queries globales.
  private async getActiveBusinessIds(): Promise<string[]> {
    const { data } = await this.supabase.client
      .from('businesses')
      .select('id')
      .is('deleted_at', null);

    return data?.map((b) => b.id) || [];
  }

  async getBusinesses(status?: string) {
    let query = this.supabase.client
      .from('businesses')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async updateBusinessStatus(
    businessId: string,
    status: string,
    adminId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const { data: oldBusiness } = await this.supabase.client
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (!oldBusiness) {
      throw new NotFoundException('Negocio no encontrado.');
    }

    const { data, error } = await this.supabase.client
      .from('businesses')
      .update({ status })
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    await this.auditLog.log({
      actorId: adminId,
      action: 'business_status_updated',
      entityType: 'businesses',
      entityId: businessId,
      oldValue: oldBusiness,
      newValue: data,
      ip,
      userAgent,
    });

    return data;
  }

  async updateBusiness(
    businessId: string,
    dto: UpdateMerchantDto,
    adminId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const { data: oldBusiness } = await this.supabase.client
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (!oldBusiness) {
      throw new NotFoundException('Negocio no encontrado.');
    }

    const { data, error } = await this.supabase.client
      .from('businesses')
      .update(dto)
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    await this.auditLog.log({
      actorId: adminId,
      action: 'business_updated_by_admin',
      entityType: 'businesses',
      entityId: businessId,
      oldValue: oldBusiness,
      newValue: data,
      ip,
      userAgent,
    });

    return data;
  }

  async deleteBusiness(
    businessId: string,
    adminId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const { data: oldBusiness } = await this.supabase.client
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (!oldBusiness) {
      throw new NotFoundException('Negocio no encontrado.');
    }

    const { data, error } = await this.supabase.client
      .from('businesses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    await this.auditLog.log({
      actorId: adminId,
      action: 'business_deleted',
      entityType: 'businesses',
      entityId: businessId,
      oldValue: oldBusiness,
      newValue: data,
      ip,
      userAgent,
    });

    return data;
  }

  async getGlobalMetrics() {
    const businessIds = await this.getActiveBusinessIds();

    const { data: passes } = await this.supabase.client
      .from('passes')
      .select('id')
      .in('business_id', businessIds);

    const passIds = passes?.map((p) => p.id) || [];

    const { count: activePassesCount } = await this.supabase.client
      .from('pass_installations')
      .select('*', { count: 'exact', head: true })
      .eq('is_removed', false)
      .in('pass_id', passIds);

    const { data: stampsData } = await this.supabase.client
      .from('stamp_transactions')
      .select('stamp_count')
      .in('business_id', businessIds)
      .eq('is_valid', true);

    const totalStamps =
      stampsData?.reduce((acc, s) => acc + s.stamp_count, 0) || 0;

    const { count: totalRedemptions } = await this.supabase.client
      .from('redemptions')
      .select('*', { count: 'exact', head: true })
      .in('business_id', businessIds)
      .eq('is_valid', true);

    const { count: totalCustomers } = await this.supabase.client
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .in('business_id', businessIds);

    return {
      totalBusinesses: businessIds.length,
      activePasses: activePassesCount || 0,
      totalStamps,
      totalRedemptions: totalRedemptions || 0,
      totalCustomers: totalCustomers || 0,
    };
  }

  async getCustomers(businessId?: string) {
    let query = this.supabase.client
      .from('customers')
      .select(
        'id, first_name, last_name, email, phone_number, created_at, business_id, businesses(name)',
      )
      .order('created_at', { ascending: false });

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return (data || []).map((c: any) => {
      const business = Array.isArray(c.businesses)
        ? c.businesses[0]
        : c.businesses;

      return {
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone_number: c.phone_number,
        created_at: c.created_at,
        business_id: c.business_id,
        business_name: business?.name ?? null,
      };
    });
  }
}
