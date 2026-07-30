import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class AddStampDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;
}
