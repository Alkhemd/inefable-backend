import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly supabase: SupabaseService) {}

  private async getBusinessId(userId: string): Promise<string> {
    const { data: business } = await this.supabase.client
      .from('businesses')
      .select('id')
      .eq('owner_user_id', userId)
      .is('deleted_at', null)
      .single();

    if (!business) {
      throw new NotFoundException(
        'No se encontró un negocio asociado a este usuario.',
      );
    }
    return business.id;
  }

  // 1. Obtener KPIs principales
  async getKPIs(userId: string) {
    const businessId = await this.getBusinessId(userId);

    try {
      // Obtenemos los pases de este negocio primero
      const { data: passes } = await this.supabase.client
        .from('passes')
        .select('id')
        .eq('business_id', businessId);

      const passIds = passes?.map((p) => p.id) || [];

      // Pases activos
      const { count: activePassesCount } = await this.supabase.client
        .from('pass_installations')
        .select('*', { count: 'exact', head: true })
        .eq('is_removed', false)
        .in('pass_id', passIds);

      // Sellos totales
      const { data: stampsData } = await this.supabase.client
        .from('stamp_transactions')
        .select('stamp_count')
        .eq('business_id', businessId)
        .eq('is_valid', true);

      const totalStamps =
        stampsData?.reduce((acc, s) => acc + s.stamp_count, 0) || 0;

      // Canjes totales
      const { count: totalRedemptions } = await this.supabase.client
        .from('redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('is_valid', true);

      return {
        activePasses: activePassesCount || 0,
        totalStamps,
        totalRedemptions: totalRedemptions || 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        'Error al obtener KPIs: ' + message,
      );
    }
  }

  // 2. Ranking de empleados
  async getEmployeeRanking(userId: string) {
    const businessId = await this.getBusinessId(userId);

    const { data: employees } = await this.supabase.client
      .from('employees')
      .select('id, name')
      .eq('business_id', businessId);

    if (!employees) return [];

    const { data: stamps } = await this.supabase.client
      .from('stamp_transactions')
      .select('employee_id, stamp_count')
      .eq('business_id', businessId)
      .eq('is_valid', true);

    const rankingMap = new Map<string, { name: string; totalStamps: number }>();

    // Inicializar mapa
    employees.forEach((emp) => {
      rankingMap.set(emp.id, { name: emp.name, totalStamps: 0 });
    });

    // Sumar sellos
    if (stamps) {
      stamps.forEach((stamp) => {
        if (stamp.employee_id && rankingMap.has(stamp.employee_id)) {
          const current = rankingMap.get(stamp.employee_id)!;
          current.totalStamps += stamp.stamp_count;
        }
      });
    }

    // Convertir a array y ordenar
    const ranking = Array.from(rankingMap.values()).sort(
      (a, b) => b.totalStamps - a.totalStamps,
    );

    return ranking;
  }

  // 3. Actividad reciente
  async getRecentActivity(userId: string) {
    const businessId = await this.getBusinessId(userId);

    const { data: recentStamps, error } = await this.supabase.client
      .from('stamp_transactions')
      .select(
        `
        id,
        stamp_count,
        created_at,
        employees ( name )
      `,
      )
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new InternalServerErrorException(
        'Error al obtener actividad reciente: ' + error.message,
      );
    }

    return recentStamps;
  }
}
