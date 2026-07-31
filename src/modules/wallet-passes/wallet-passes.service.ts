import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JWT } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { AuditLogService } from '../../infrastructure/supabase/audit-log.service';
import { UpdatePassConfigDto } from './dto/update-pass-config.dto';

// Bucket público de Supabase Storage donde se guardan las imágenes de banner ("hero image")
// de las tarjetas. Debe crearse una sola vez en el dashboard de Supabase (Storage > New bucket),
// marcado como público, ya que Google Wallet necesita poder descargar la imagen sin autenticación.
const HERO_IMAGE_BUCKET = 'wallet-assets';
const ALLOWED_HERO_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg'];

@Injectable()
export class WalletPassesService {
  private readonly logger = new Logger(WalletPassesService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async getPassConfig(ownerUserId: string) {
    const supabase = this.supabase.client;

    // Primero buscar el negocio del dueño
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, logo_url')
      .eq('owner_user_id', ownerUserId)
      .is('deleted_at', null)
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
      business,
    };
  }

  async upsertPassConfig(
    ownerUserId: string,
    dto: UpdatePassConfigDto,
    ip?: string,
    userAgent?: string,
  ) {
    const supabase = this.supabase.client;

    // 1. Obtener el business_id
    const { data: business, error: businessError } = await this.supabase.client
      .from('businesses')
      .select('id')
      .eq('owner_user_id', ownerUserId)
      .is('deleted_at', null)
      .single();

    if (businessError || !business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    // 2. Comprobar si ya existe un pase
    const { data: existingPass } = await supabase
      .from('passes')
      .select('*')
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
          hero_image_url: dto.hero_image_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPass.id)
        .select()
        .single();

      if (error)
        throw new InternalServerErrorException(
          'Error al actualizar el diseño del pase',
        );

      await this.auditLog.log({
        actorId: ownerUserId,
        action: 'pass_config_updated',
        entityType: 'passes',
        entityId: data.id,
        oldValue: existingPass,
        newValue: data,
        ip,
        userAgent,
      });

      return data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('passes')
        .insert({
          business_id: business.id,
          background_color: dto.background_color || '#2563EB',
          foreground_color: dto.foreground_color || '#FFFFFF',
          description: dto.description || 'Tarjeta de Lealtad',
          hero_image_url: dto.hero_image_url,
        })
        .select()
        .single();

      if (error)
        throw new InternalServerErrorException(
          'Error al crear el diseño del pase',
        );

      await this.auditLog.log({
        actorId: ownerUserId,
        action: 'pass_config_created',
        entityType: 'passes',
        entityId: data.id,
        newValue: data,
        ip,
        userAgent,
      });

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
      throw new InternalServerErrorException(
        'Error interno de configuración de tarjetas.',
      );
    }

    // Obtener los detalles del negocio y pase desde la base de datos a través de la instalación
    const supabase = this.supabase.client;
    const { data: installation } = await supabase
      .from('pass_installations')
      .select('customer_id')
      .eq('id', installationId)
      .single();

    if (!installation || !installation.customer_id) {
      throw new InternalServerErrorException(
        'Instalación no encontrada para generar pase',
      );
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('business_id')
      .eq('id', installation.customer_id)
      .single();

    if (!customer)
      throw new InternalServerErrorException(
        'Cliente no encontrado para generar pase',
      );

    const { data: business } = await supabase
      .from('businesses')
      .select('name, logo_url')
      .eq('id', customer.business_id)
      .is('deleted_at', null)
      .single();

    if (!business) {
      throw new NotFoundException(
        'Este negocio ya no está activo en la plataforma.',
      );
    }

    const { data: pass } = await supabase
      .from('passes')
      .select('description, background_color, hero_image_url')
      .eq('business_id', customer.business_id)
      .single();

    const { data: loyaltyProgram } = await supabase
      .from('loyalty_programs')
      .select('stamp_goal')
      .eq('business_id', customer.business_id)
      .eq('is_active', true)
      .single();

    const businessName = business.name || 'Tarjeta de Lealtad';
    const passDescription = pass?.description || 'Tarjeta de Lealtad';
    const hexBackgroundColor = pass?.background_color || '#2563EB';
    const stampGoal = loyaltyProgram?.stamp_goal || 10;

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

    const heroImage = pass?.hero_image_url
      ? {
          sourceUri: { uri: pass.hero_image_url },
          contentDescription: {
            defaultValue: { language: 'es-MX', value: businessName },
          },
        }
      : undefined;

    const logo = business.logo_url
      ? {
          sourceUri: { uri: business.logo_url },
          contentDescription: {
            defaultValue: { language: 'es-MX', value: businessName },
          },
        }
      : undefined;

    const newObject = {
      id: objectId,
      classId: classId,
      state: 'ACTIVE',
      hexBackgroundColor: hexBackgroundColor,
      ...(heroImage ? { heroImage } : {}),
      ...(logo ? { logo } : {}),
      textModulesData: [
        {
          header: businessName,
          body: '¡Escanea para ganar sellos!',
          id: 'info_module',
        },
        {
          header: 'Sellos Acumulados',
          body: `0 / ${stampGoal}`,
          id: 'stamps_module',
        },
      ],
      barcode: {
        type: 'QR_CODE',
        value: installationId,
        alternateText: installationId,
      },
      cardTitle: {
        defaultValue: {
          language: 'es-MX',
          value: passDescription,
        },
      },
      header: {
        defaultValue: {
          language: 'es-MX',
          value: businessName,
        },
      },
    };

    const claims = {
      iss: authClient.email,
      aud: 'google',
      origins: [],
      typ: 'savetowallet',
      payload: {
        genericObjects: [newObject],
      },
    };

    try {
      const token = jwt.sign(claims, privateKey, { algorithm: 'RS256' });
      return { url: `https://pay.google.com/gp/v/save/${token}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Error firmando JWT: ' + message);
      throw new InternalServerErrorException('No se pudo generar la tarjeta.');
    }
  }

  async updatePassObject(
    installationId: string,
    currentStamps: number,
    stampGoal: number,
  ) {
    const clientEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY;
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;

    if (!clientEmail || !privateKey || !issuerId) {
      this.logger.warn(
        'Faltan variables de entorno de Google Wallet, no se actualizó el pase',
      );
      return;
    }

    privateKey = privateKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim();

    try {
      const authClient = new JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
      });

      const objectId = `${issuerId}.${installationId}`;
      const url = `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/${objectId}`;

      const payload = {
        textModulesData: [
          {
            header: 'Sellos Acumulados',
            body: `${currentStamps} / ${stampGoal}`,
            id: 'stamps_module',
          },
        ],
      };

      await authClient.request({
        url,
        method: 'PATCH',
        data: payload,
      });

      this.logger.log(
        `Pase de Google Wallet ${objectId} actualizado con ${currentStamps} sellos.`,
      );
    } catch (error) {
      // Cast necesario: gaxios (usado internamente por google-auth-library) extiende Error
      // con un `.response.data.message` que no está en el tipo base de Error.
      const withResponse = error as Error & {
        response?: { data?: { message?: string } };
      };
      const message =
        withResponse.response?.data?.message ||
        (error instanceof Error ? error.message : String(error));
      this.logger.error('Error actualizando pase en Google Wallet: ' + message);
      // No lanzamos error para no interrumpir el flujo del escáner en caso de que Google falle
    }
  }

  async uploadHeroImage(
    ownerUserId: string,
    file: Buffer,
    mimetype: string,
    ip?: string,
    userAgent?: string,
  ) {
    if (!ALLOWED_HERO_IMAGE_MIME_TYPES.includes(mimetype)) {
      throw new BadRequestException(
        'Formato de imagen no soportado. Usa PNG o JPG.',
      );
    }

    const supabase = this.supabase.client;

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_user_id', ownerUserId)
      .is('deleted_at', null)
      .single();

    if (businessError || !business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    const extension = mimetype === 'image/png' ? 'png' : 'jpg';
    const path = `hero-images/${business.id}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(HERO_IMAGE_BUCKET)
      .upload(path, file, { contentType: mimetype, upsert: true });

    if (uploadError) {
      this.logger.error(uploadError.message);
      throw new InternalServerErrorException('No se pudo subir la imagen.');
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(HERO_IMAGE_BUCKET).getPublicUrl(path);

    await this.auditLog.log({
      actorId: ownerUserId,
      action: 'hero_image_uploaded',
      entityType: 'passes',
      entityId: business.id,
      newValue: { url: publicUrl },
      ip,
      userAgent,
    });

    return { url: publicUrl };
  }
}
