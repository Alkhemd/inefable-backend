import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';

import { WalletPassesService } from '../wallet-passes/wallet-passes.service';

@Injectable()
export class ScannerService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly walletPassesService: WalletPassesService
  ) {}

  async addStamp(cashierPayload: any, customerId: string) {
    const supabase = this.supabase.client;
    
    const businessId = cashierPayload.businessId;
    const employeeId = cashierPayload.sub;

    // 1. Verificar que el pass_installation existe, está activo, y pertenece a este negocio
    const { data: installation, error: installationError } = await supabase
      .from('pass_installations')
      .select('id, passes!inner(business_id)')
      .eq('id', customerId) // customerId here is actually the installation ID from the QR code
      .eq('is_removed', false)
      .eq('passes.business_id', businessId)
      .single();

    if (installationError || !installation) {
      throw new NotFoundException('El cliente no tiene una tarjeta instalada para este negocio o el código es inválido.');
    }

    // 2. Obtener el programa de lealtad activo para saber la meta
    const { data: loyaltyProgram, error: loyaltyError } = await supabase
      .from('loyalty_programs')
      .select('stamp_goal')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single();
      
    if (loyaltyError || !loyaltyProgram) {
      throw new NotFoundException('Este negocio no tiene un programa de lealtad activo.');
    }

    const required = loyaltyProgram.stamp_goal;

    // Para saber cuántos sellos lleva, los contamos:
    const { count: allStampsCount } = await supabase
      .from('stamp_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('installation_id', installation.id);

    const { count: redemptionsCount } = await supabase
      .from('redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('installation_id', installation.id);
      
    const stampsCount = allStampsCount || 0;
    const redsCount = redemptionsCount || 0;

    // Sellos actuales (activos) antes de insertar
    const currentActiveStamps = stampsCount - (redsCount * required);

    // 3. Registrar el sello
    const { data: stamp, error: stampError } = await supabase
      .from('stamp_transactions')
      .insert({
        installation_id: installation.id,
        business_id: businessId,
        employee_id: employeeId,
        stamp_count: 1, // Siempre insertamos 1 sello por cada escaneo
        stamp_goal: required
      })
      .select('id, created_at')
      .single();

    if (stampError) {
      throw new InternalServerErrorException('No se pudo registrar el sello.');
    }

    const newActiveStamps = currentActiveStamps + 1;

    // Actualizar el pase en Google Wallet
    await this.walletPassesService.updatePassObject(installation.id, newActiveStamps, required);

    // ¿Premio desbloqueado con este último sello?
    const prizeUnlocked = newActiveStamps >= required;

    return {
      message: 'Sello otorgado exitosamente',
      stamp,
      currentActiveStamps: newActiveStamps,
      requiredStamps: required,
      prizeUnlocked
    };
  }
}

