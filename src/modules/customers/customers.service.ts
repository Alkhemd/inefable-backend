import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { JoinProgramDto } from './dto/join-program.dto';
import { WalletPassesService } from '../wallet-passes/wallet-passes.service';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly walletPassesService: WalletPassesService,
  ) {}

  async getCustomersByBusinessOwner(ownerUserId: string) {
    const supabase = this.supabase.client;

    // 1. Obtener el negocio del usuario
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_user_id', ownerUserId)
      .single();

    if (businessError || !business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    // 2. Obtener instalaciones de pases de este negocio
    // Hacemos el JOIN con customers y con los sellos.
    const { data: installations, error } = await supabase
      .from('pass_installations')
      .select(`
        installed_at,
        customers!inner(id, first_name, last_name, email, phone_number),
        passes!inner(business_id),
        stamp_transactions(stamp_count, is_valid)
      `)
      .eq('passes.business_id', business.id);

    if (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Error al obtener clientes');
    }

    // 3. Mapear la respuesta para el frontend
    const formattedCustomers = installations.map((inst: any) => {
      const customer = Array.isArray(inst.customers) ? inst.customers[0] : inst.customers;
      
      // Sumar todos los sellos válidos
      const totalStamps = (inst.stamp_transactions || [])
        .filter((stamp: any) => stamp.is_valid !== false)
        .reduce((sum: number, stamp: any) => sum + stamp.stamp_count, 0);

      return {
        id: customer.id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone_number: customer.phone_number,
        installed_at: inst.installed_at,
        total_stamps: totalStamps,
      };
    });

    return formattedCustomers;
  }

  async joinLoyaltyProgram(dto: JoinProgramDto) {
    const supabase = this.supabase.client;

    // 1. Verificar que el negocio exista y tenga un pase configurado
    const { data: pass, error: passError } = await supabase
      .from('passes')
      .select('id, business_id')
      .eq('business_id', dto.businessId)
      .single();

    if (passError || !pass) {
      throw new NotFoundException(
        'Negocio no encontrado o sin tarjeta configurada aún.',
      );
    }

    // 2. Buscar o crear al cliente
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', dto.businessId)
      .eq('email', dto.email)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          business_id: dto.businessId,
          first_name: dto.firstName,
          last_name: dto.lastName,
          email: dto.email,
          phone_number: dto.phoneNumber ?? null,
        })
        .select('id')
        .single();

      if (customerError || !newCustomer) {
        this.logger.error(customerError);
        throw new InternalServerErrorException('Error al registrar al cliente.');
      }
      customerId = newCustomer.id;
    }

    // 3. Verificar si ya tiene una instalación activa
    const { data: existingInstallation } = await supabase
      .from('pass_installations')
      .select('id')
      .eq('pass_id', pass.id)
      .eq('customer_id', customerId)
      .single();

    let installationId: string;

    if (existingInstallation) {
      // Ya tiene tarjeta, solo regresamos la URL para que la vuelva a guardar
      installationId = existingInstallation.id;
    } else {
      // 4. Crear la instalación nueva
      const { data: newInstallation, error: installationError } = await supabase
        .from('pass_installations')
        .insert({
          pass_id: pass.id,
          customer_id: customerId,
          device_id: `web-${customerId}`, // Identificador único para registros vía web
          platform: 'google_wallet',
        })
        .select('id')
        .single();

      if (installationError || !newInstallation) {
        this.logger.error(installationError);
        throw new InternalServerErrorException(`Error al crear la instalación del pase: ${installationError?.message || 'Desconocido'}`);
      }
      installationId = newInstallation.id;
    }

    // 5. Generar el JWT de Google Wallet usando el installationId como código QR único
    const { url } = await this.walletPassesService.generatePassUrl(installationId);

    return {
      walletUrl: url,
      customerId,
      installationId,
    };
  }
}
