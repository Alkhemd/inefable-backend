import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { JWT } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class WalletPassesService {
  private readonly logger = new Logger(WalletPassesService.name);

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
