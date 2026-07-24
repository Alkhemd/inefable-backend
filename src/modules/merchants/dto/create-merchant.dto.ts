import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsUrl, IsNumber } from 'class-validator';

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

  @IsString()
  @IsOptional()
  anti_fraud_mode?: string;
}
