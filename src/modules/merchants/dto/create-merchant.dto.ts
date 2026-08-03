import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsIn,
  IsUrl,
  IsNumber,
} from 'class-validator';

export const ANTI_FRAUD_MODES = [
  'none',
  'ip_only',
  'gps_only',
  'both',
] as const;

export class CreateMerchantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['restaurant', 'retail', 'service', 'other'], {
    message: 'La industria debe ser restaurant, retail, service u other',
  })
  industry: string;

  @IsEmail()
  @IsNotEmpty()
  contact_email: string;

  @IsString()
  @IsOptional()
  contact_phone?: string;

  @IsUrl()
  @IsOptional()
  logo_url?: string;

  @IsString()
  @IsOptional()
  authorized_ip?: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsNumber()
  @IsOptional()
  radius_meters?: number;

  @IsIn(ANTI_FRAUD_MODES, {
    message: `anti_fraud_mode debe ser uno de: ${ANTI_FRAUD_MODES.join(', ')}`,
  })
  @IsOptional()
  anti_fraud_mode?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}
