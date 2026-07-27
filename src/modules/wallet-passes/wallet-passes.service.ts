import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { JWT } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { UpdatePassConfigDto } from './dto/update-pass-config.dto';

@Injectable()
export class WalletPassesService {
  private readonly logger = new Logger(WalletPassesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getPassConfig(ownerUserId: string) {
    const supabase = this.supabase.client;
    
    // Primero buscar el negocio del dueño
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, logo_url')
      .eq('owner_user_id', ownerUserId)
      .single();

    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    // Luego buscar el pase asociado a ese negocio
    const { data: pass } = await supabase
      .from('passes')
      .select('*')
      .eq('business_id', business.id)
      .single();

    return {
      pass: pass || null,
      business
    };
  }

  async upsertPassConfig(ownerUserId: string, dto: UpdatePassConfigDto) {
    const supabase = this.supabase.client;
    
    // 1. Obtener el business_id
    const { data: business, error: businessError } = await this.supabase.client
      .from('businesses')
      .select('id')
      .eq('owner_user_id', ownerUserId)
      .single();

    if (businessError || !business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    // 2. Comprobar si ya existe un pase
    const { data: existingPass } = await supabase
      .from('passes')
      .select('id')
      .eq('business_id', business.id)
      .single();

    if (existingPass) {
      // Update
      const { data, error } = await supabase
        .from('passes')
        .update({
          background_color: dto.background_color,
          foreground_color: dto.foreground_color,
          description: dto.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPass.id)
        .select()
        .single();
        
      if (error) throw new InternalServerErrorException('Error al actualizar el diseño del pase');
      return data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('passes')
        .insert({
          business_id: business.id,
          background_color: dto.background_color || '#2563EB',
          foreground_color: dto.foreground_color || '#FFFFFF',
          description: dto.description || 'Tarjeta de Lealtad'
        })
        .select()
        .single();

      if (error) throw new InternalServerErrorException('Error al crear el diseño del pase');
      return data;
    }
  }

  async generatePassUrl(installationId: string) {
    const clientEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY;
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    const classId = process.env.GOOGLE_WALLET_CLASS_ID;

    if (!clientEmail || !privateKey || !issuerId || !classId) {
      this.logger.error('Faltan variables de entorno de Google Wallet');
      throw new InternalServerErrorException('Error interno de configuración de tarjetas.');
    }

    // Obtener los detalles del negocio y pase desde la base de datos a través de la instalación
    const supabase = this.supabase.client;
    const { data: installation } = await supabase
      .from('pass_installations')
      .select('customer_id')
      .eq('id', installationId)
      .single();

    if (!installation) throw new InternalServerErrorException('Instalación no encontrada para generar pase');

    const { data: customer } = await supabase
      .from('customers')
      .select('business_id')
      .eq('id', installation.customer_id)
      .single();

    if (!customer) throw new InternalServerErrorException('Cliente no encontrado para generar pase');

    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', customer.business_id)
      .single();

    const { data: pass } = await supabase
      .from('passes')
      .select('description, background_color')
      .eq('business_id', customer.business_id)
      .single();

    const businessName = business?.name || 'Tarjeta de Lealtad';
    const passDescription = pass?.description || 'Tarjeta de Lealtad';
    const hexBackgroundColor = pass?.background_color || '#2563EB';

    // Formatear llave privada para leer los saltos de línea correctamente desde .env
    // Manejar casos donde vengan con \n literal, comillas extra o saltos reales.
    privateKey = privateKey
      .replace(/\\n/g, '\n')
      .replace(/^"|"$/g, '') // Quitar comillas si las tiene
      .trim();

    const authClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
    });

    const objectId = `${issuerId}.${installationId}`;

    const newObject = {
      id: objectId,
      classId: classId,
      state: 'ACTIVE',
      hexBackgroundColor: hexBackgroundColor,
      textModulesData: [
        {
          header: businessName,
          body: '¡Escanea para ganar sellos!',
          id: 'info_module'
        },
        {
          header: 'Sellos Acumulados',
          body: `0 / 10`,
          id: 'stamps_module'
        }
      ],
      barcode: {
        type: 'QR_CODE',
        value: installationId,
        alternateText: installationId
      },
      cardTitle: {
        defaultValue: {
          language: 'es-MX',
          value: passDescription
        }
      },
      header: {
        defaultValue: {
          language: 'es-MX',
          value: businessName
        }
      }
    };

    const claims = {
      iss: authClient.email,
      aud: 'google',
      origins: [],
      typ: 'savetowallet',
      payload: {
        genericObjects: [newObject]
      }
    };

    try {
      const token = jwt.sign(claims, privateKey, { algorithm: 'RS256' });
      return { url: `https://pay.google.com/gp/v/save/${token}` };
    } catch (error: any) {
      this.logger.error('Error firmando JWT: ' + error.message);
      throw new InternalServerErrorException('No se pudo generar la tarjeta.');
    }
  }
}
