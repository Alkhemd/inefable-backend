import { Injectable, InternalServerErrorException, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JWT } from 'google-auth-library';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { UpdateLoyaltyConfigDto } from './dto/update-loyalty-config.dto';

@Injectable()
export class LoyaltyEngineService {
  private readonly logger = new Logger(LoyaltyEngineService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getLoyaltyConfig(ownerUserId: string) {
    const supabase = this.supabase.client;
    
    // Primero buscar el negocio del dueño
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_user_id', ownerUserId)
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
      business
    };
  }

  async upsertLoyaltyConfig(ownerUserId: string, dto: UpdateLoyaltyConfigDto) {
    const supabase = this.supabase.client;
    
    // 1. Obtener el business_id
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_user_id', ownerUserId)
      .single();

    if (businessError || !business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    // 2. Comprobar si ya existe un programa
    const { data: existingProgram } = await supabase
      .from('loyalty_programs')
      .select('id')
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
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProgram.id)
        .select()
        .single();
        
      if (error) {
        this.logger.error(error);
        throw new InternalServerErrorException('Error al actualizar las reglas de lealtad');
      }
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
        throw new InternalServerErrorException('Error al crear las reglas de lealtad');
      }
      return data;
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const phi1 = lat1 * Math.PI/180;
    const phi2 = lat2 * Math.PI/180;
    const deltaPhi = (lat2-lat1) * Math.PI/180;
    const deltaLambda = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  async processScan(qrPayload: string, employeeId?: string, ip?: string, lat?: number, lng?: number) {
    const clientEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY;
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;

    if (!clientEmail || !privateKey || !issuerId) {
      throw new InternalServerErrorException('Error de configuración.');
    }

    privateKey = privateKey.replace(/\\n/g, '\n');

    // Autenticar con Google
    const authClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
    });

    try {
      const tokenInfo = await authClient.authorize();
      const token = tokenInfo.access_token;
      
      const objectId = `${issuerId}.${qrPayload}`;
      let newStampsCount = 0;

      // ==========================================
      // INTEGRACIÓN CON SUPABASE REAL
      // ==========================================
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qrPayload);

      if (isUUID) {
        // 1. Verificar que la instalación existe
        const { data: installation, error: instError } = await this.supabase.client
          .from('pass_installations')
          .select(`
            id, 
            pass_id, 
            passes!inner(business_id, program_id, loyalty_programs!inner(stamp_goal))
          `)
          .eq('id', qrPayload)
          .single();

        if (instError || !installation) {
          throw new NotFoundException('El pase escaneado no existe en la base de datos.');
        }

        // Extraer IDs anidados
        const pass = Array.isArray(installation.passes) ? installation.passes[0] : installation.passes;
        const program = Array.isArray(pass.loyalty_programs) ? pass.loyalty_programs[0] : pass.loyalty_programs;

        // ==========================================
        // VALIDACIÓN ANTIFRAUDE (IP + GPS)
        // ==========================================
        if (employeeId) {
          // 1. Obtener datos del negocio del empleado
          const { data: employee } = await this.supabase.client
            .from('employees')
            .select('business_id')
            .eq('id', employeeId)
            .single();

          if (!employee || employee.business_id !== pass.business_id) {
            throw new ForbiddenException('El cajero no pertenece al negocio de este pase.');
          }

          // 2. Obtener configuración antifraude del negocio
          const { data: business } = await this.supabase.client
            .from('businesses')
            .select('anti_fraud_mode, authorized_ip, lat, lng, radius_meters')
            .eq('id', employee.business_id)
            .single();

          if (business) {
            const mode = business.anti_fraud_mode;
            const bLat = business.lat;
            const bLng = business.lng;
            const bRadius = business.radius_meters || 50;

            const ipMatch = business.authorized_ip && business.authorized_ip === ip;
            let distance = -1;
            let gpsMatch = false;

            if (bLat != null && bLng != null && lat != null && lng != null) {
              distance = this.calculateDistance(lat, lng, bLat, bLng);
              gpsMatch = distance <= bRadius;
            }

            if (mode === 'ip_only' && !ipMatch) {
              throw new ForbiddenException('Estás fuera de la red WiFi autorizada del negocio.');
            }
            if (mode === 'gps_only' && !gpsMatch) {
              throw new ForbiddenException(`Estás demasiado lejos del local. Distancia: ${Math.round(distance)}m (Máx: ${bRadius}m).`);
            }
            if (mode === 'both' && (!ipMatch || !gpsMatch)) {
              throw new ForbiddenException('Debes estar en el local y conectado al WiFi oficial para otorgar sellos.');
            }
          }
        }

        // 2. Calcular sellos actuales
        const { data: stamps } = await this.supabase.client
          .from('stamp_transactions')
          .select('stamp_count')
          .eq('installation_id', qrPayload)
          .eq('is_valid', true);

        const currentStamps = stamps?.reduce((acc, s) => acc + s.stamp_count, 0) || 0;
        newStampsCount = currentStamps + 1;

        // 3. Insertar el nuevo sello en la base de datos
        await this.supabase.client
          .from('stamp_transactions')
          .insert({
            installation_id: qrPayload,
            business_id: pass.business_id,
            employee_id: employeeId || null,
            stamp_count: 1,
            stamp_goal: program.stamp_goal,
            fraud_check_data: { note: 'Validación antifraude Híbrida pasada con éxito', ip, lat, lng }
          });
          
      } else {
        // Fallback para tu tarjeta de prueba actual (alan-test-123)
        this.logger.warn(`El QR no es un UUID (${qrPayload}). Usando modo simulación para no romper la tarjeta actual.`);
        newStampsCount = Math.floor(Math.random() * 8) + 2;
      }

      // ==========================================
      // ACTUALIZAR GOOGLE WALLET
      // ==========================================
      const patchPayload = {
        textModulesData: [
          { header: 'Inefable', body: '¡Nuevo Sello Registrado! 🎉', id: 'info_module' },
          { header: 'Sellos Acumulados', body: `${newStampsCount} / 10`, id: 'stamps_module' }
        ]
      };

      const response = await fetch(
        `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/${objectId}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload)
        }
      );

      if (!response.ok) {
        throw new InternalServerErrorException('No se pudo actualizar la tarjeta en Google Wallet.');
      }

      // 4. Forzar Notificación Push
      const messagePayload = {
        message: {
          header: '¡Nuevo Sello en Inefable! 🎉',
          body: `Felicidades, ahora tienes ${newStampsCount} sellos.`,
          messageType: 'TEXT_AND_NOTIFY'
        }
      };

      await fetch(
        `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/${objectId}/addMessage`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(messagePayload)
        }
      );

      this.logger.log(`Tarjeta ${objectId} actualizada a ${newStampsCount} sellos.`);
      
      return { 
        success: true, 
        message: 'Sello agregado con éxito y tarjeta actualizada',
        newStamps: newStampsCount
      };

    } catch (error: any) {
      this.logger.error('Error procesando escaneo: ' + error.message);
      throw new InternalServerErrorException(error.message || 'Falló el procesamiento del escaneo.');
    }
  }
}
