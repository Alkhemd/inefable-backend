import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import type { CashierJwtPayload } from '../../core/guards/cashier-auth.guard';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { Database } from '../../infrastructure/supabase/database.types';
import { AuditLogService } from '../../infrastructure/supabase/audit-log.service';

import { WalletPassesService } from '../wallet-passes/wallet-passes.service';

type SupabaseClientType = SupabaseClient<Database>;

@Injectable()
export class ScannerService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly walletPassesService: WalletPassesService,
    private readonly auditLog: AuditLogService,
  ) {}

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLambda / 2) *
        Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // El negocio del cajero (según su JWT) debe existir y no estar eliminado (soft-delete).
  // Se revalida en cada request, no solo al loguear, porque el JWT del cajero dura 12h.
  private async assertBusinessActive(
    supabase: SupabaseClientType,
    businessId: string,
  ) {
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .is('deleted_at', null)
      .single();

    if (!business) {
      throw new ForbiddenException(
        'Este negocio ya no está activo en la plataforma.',
      );
    }
  }

  // Verifica que el pass_installation exista, esté activo, y pertenezca a este negocio
  private async getInstallationForBusiness(
    supabase: SupabaseClientType,
    installationId: string,
    businessId: string,
  ) {
    const { data: installation, error } = await supabase
      .from('pass_installations')
      .select('id, passes!inner(business_id)')
      .eq('id', installationId)
      .eq('is_removed', false)
      .eq('passes.business_id', businessId)
      .single();

    if (error || !installation) {
      throw new NotFoundException(
        'El cliente no tiene una tarjeta instalada para este negocio o el código es inválido.',
      );
    }

    return installation;
  }

  // Calcula la meta del programa de lealtad y los sellos activos actuales (sellos - canjes*meta)
  private async getActiveStampsState(
    supabase: SupabaseClientType,
    installationId: string,
    businessId: string,
  ) {
    const { data: loyaltyProgram, error: loyaltyError } = await supabase
      .from('loyalty_programs')
      .select('stamp_goal')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single();

    if (loyaltyError || !loyaltyProgram) {
      throw new NotFoundException(
        'Este negocio no tiene un programa de lealtad activo.',
      );
    }

    const required = loyaltyProgram.stamp_goal;

    const { count: allStampsCount } = await supabase
      .from('stamp_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('installation_id', installationId);

    const { count: redemptionsCount } = await supabase
      .from('redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('installation_id', installationId);

    const stampsCount = allStampsCount || 0;
    const redsCount = redemptionsCount || 0;
    const currentActiveStamps = stampsCount - redsCount * required;

    return { required, currentActiveStamps };
  }

  async addStamp(
    cashierPayload: CashierJwtPayload,
    customerId: string,
    ip?: string,
    userAgent?: string,
    lat?: number,
    lng?: number,
  ) {
    const supabase = this.supabase.client;

    const businessId = cashierPayload.businessId;
    const employeeId = cashierPayload.sub;

    await this.assertBusinessActive(supabase, businessId);

    // 1. Verificar que el pass_installation existe, está activo, y pertenece a este negocio
    const installation = await this.getInstallationForBusiness(
      supabase,
      customerId,
      businessId,
    );

    // 1.1 Validación antifraude híbrida (IP + GPS) según la configuración del negocio
    const { data: business } = await supabase
      .from('businesses')
      .select('anti_fraud_mode, authorized_ip, lat, lng, radius_meters')
      .eq('id', businessId)
      .single();

    const fraudCheckData: Record<string, unknown> = { ip, lat, lng };

    if (business) {
      const mode = business.anti_fraud_mode;
      const bLat = business.lat;
      const bLng = business.lng;
      const bRadius = business.radius_meters || 50;

      const ipMatch = Boolean(
        business.authorized_ip && business.authorized_ip === ip,
      );
      const hasCashierCoords = lat != null && lng != null;
      const hasBusinessCoords = bLat != null && bLng != null;
      let distance = -1;
      let gpsMatch = false;

      if (hasBusinessCoords && lat != null && lng != null) {
        distance = this.calculateDistance(lat, lng, bLat, bLng);
        gpsMatch = distance <= bRadius;
      }

      fraudCheckData.mode = mode;
      fraudCheckData.ipMatch = ipMatch;
      fraudCheckData.gpsMatch = gpsMatch;
      fraudCheckData.distanceMeters = Math.round(distance);

      // Distingue "no llegaron coordenadas" (permiso de ubicación denegado en el celular)
      // de "sí llegaron, pero el cajero está fuera del radio permitido" — son errores
      // distintos y el cajero necesita un mensaje distinto para saber qué corregir.
      const gpsRejectionMessage = (): string => {
        if (!hasCashierCoords) {
          return 'No pudimos obtener tu ubicación. Activa el permiso de ubicación en tu celular e intenta de nuevo.';
        }
        if (!hasBusinessCoords) {
          return 'El negocio no tiene configurada su ubicación. Pide al dueño que la configure en Ajustes.';
        }
        return `Estás demasiado lejos del local. Distancia: ${Math.round(distance)}m (Máx: ${bRadius}m).`;
      };

      let rejectionReason: string | null = null;
      if (mode === 'ip_only' && !ipMatch) {
        rejectionReason = 'Fuera de la red WiFi autorizada del negocio.';
      } else if (mode === 'gps_only' && !gpsMatch) {
        rejectionReason = gpsRejectionMessage();
      } else if (mode === 'both' && (!ipMatch || !gpsMatch)) {
        if (!ipMatch && !gpsMatch) {
          rejectionReason =
            'Debes estar en el local y conectado al WiFi oficial para otorgar sellos.';
        } else if (!gpsMatch) {
          rejectionReason = gpsRejectionMessage();
        } else {
          rejectionReason = 'Fuera de la red WiFi autorizada del negocio.';
        }
      }

      if (rejectionReason) {
        await this.auditLog.log({
          actorId: employeeId,
          action: 'stamp_rejected_antifraud',
          entityType: 'stamp_transactions',
          entityId: installation.id,
          newValue: { ...fraudCheckData, rejectionReason },
          ip,
          userAgent,
        });
        throw new ForbiddenException(rejectionReason);
      }
    }

    // 2. Meta del programa de lealtad y sellos activos actuales
    const { required, currentActiveStamps } = await this.getActiveStampsState(
      supabase,
      installation.id,
      businessId,
    );

    // 3. Registrar el sello
    const { data: stamp, error: stampError } = await supabase
      .from('stamp_transactions')
      .insert({
        installation_id: installation.id,
        business_id: businessId,
        employee_id: employeeId,
        stamp_count: 1, // Siempre insertamos 1 sello por cada escaneo
        stamp_goal: required,
        // Cast necesario: fraudCheckData es un objeto arbitrario para la columna JSONB fraud_check_data.
        fraud_check_data: fraudCheckData as any,
      })
      .select('id, created_at')
      .single();

    if (stampError) {
      throw new InternalServerErrorException('No se pudo registrar el sello.');
    }

    const newActiveStamps = currentActiveStamps + 1;

    // Actualizar el pase en Google Wallet
    await this.walletPassesService.updatePassObject(
      installation.id,
      newActiveStamps,
      required,
    );

    await this.auditLog.log({
      actorId: employeeId,
      action: 'stamp_granted',
      entityType: 'stamp_transactions',
      entityId: stamp.id,
      newValue: { installationId: installation.id, businessId, stampCount: 1 },
      ip,
      userAgent,
    });

    // ¿Premio desbloqueado con este último sello?
    const prizeUnlocked = newActiveStamps >= required;

    return {
      message: 'Sello otorgado exitosamente',
      stamp,
      currentActiveStamps: newActiveStamps,
      requiredStamps: required,
      prizeUnlocked,
    };
  }

  async redeemPrize(
    cashierPayload: CashierJwtPayload,
    customerId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const supabase = this.supabase.client;

    const businessId = cashierPayload.businessId;
    const employeeId = cashierPayload.sub;

    await this.assertBusinessActive(supabase, businessId);

    const installation = await this.getInstallationForBusiness(
      supabase,
      customerId,
      businessId,
    );

    const { required, currentActiveStamps } = await this.getActiveStampsState(
      supabase,
      installation.id,
      businessId,
    );

    if (currentActiveStamps < required) {
      throw new ForbiddenException(
        `Aún no se puede canjear: el cliente tiene ${currentActiveStamps} de ${required} sellos.`,
      );
    }

    // Registrar el canje. Esto resetea el conteo de sellos activos en futuras consultas
    // (stampsCount - redsCount*required), ya que redsCount ahora incluye esta fila.
    const { data: redemption, error: redemptionError } = await supabase
      .from('redemptions')
      .insert({
        installation_id: installation.id,
        business_id: businessId,
        employee_id: employeeId,
        stamp_count_at_redemption: currentActiveStamps,
        is_valid: true,
      })
      .select('id, redeemed_at')
      .single();

    if (redemptionError) {
      throw new InternalServerErrorException('No se pudo registrar el canje.');
    }

    // Resetear el pase en Google Wallet a 0 sellos
    await this.walletPassesService.updatePassObject(
      installation.id,
      0,
      required,
    );

    await this.auditLog.log({
      actorId: employeeId,
      action: 'prize_redeemed',
      entityType: 'redemptions',
      entityId: redemption.id,
      newValue: {
        installationId: installation.id,
        businessId,
        stampCountAtRedemption: currentActiveStamps,
      },
      ip,
      userAgent,
    });

    return {
      message: 'Premio canjeado exitosamente',
      redemption,
      remainingStamps: 0,
      requiredStamps: required,
    };
  }
}
