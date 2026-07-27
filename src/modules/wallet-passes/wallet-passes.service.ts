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

  async generatePassUrl(customerId: string) {
    const clientEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY;
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    const classId = process.env.GOOGLE_WALLET_CLASS_ID;

    if (!clientEmail || !privateKey || !issuerId || !classId) {
      this.logger.error('Faltan variables de entorno de Google Wallet');
      throw new InternalServerErrorException('Error interno de configuración de tarjetas.');
    }

    // Formatear llave privada para leer los saltos de línea correctamente desde .env
    privateKey = privateKey.replace(/\\n/g, '\n');

    const authClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
    });

    const objectId = `${issuerId}.${customerId}`;

    const newObject = {
      id: objectId,
      classId: classId,
      state: 'ACTIVE',
      heroImage: {
        sourceUri: {
          uri: 'https://images.unsplash.com/photo-1557683311-eac922347aa1?q=80&w=1000&auto=format&fit=crop',
          description: 'Fondo abstracto premium Inefable'
        }
      },
      textModulesData: [
        {
          header: 'Inefable',
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
        value: customerId,
        alternateText: customerId
      },
      cardTitle: {
        defaultValue: {
          language: 'es-MX',
          value: 'Tarjeta de Lealtad'
        }
      },
      header: {
        defaultValue: {
          language: 'es-MX',
          value: 'Inefable Wallet'
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
