import {
  IsString,
  IsOptional,
  IsHexColor,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdatePassConfigDto {
  @IsHexColor({
    message: 'El color de fondo debe ser un código HEX válido (ej. #FFFFFF)',
  })
  @IsOptional()
  background_color?: string;

  @IsHexColor({
    message: 'El color del texto debe ser un código HEX válido (ej. #000000)',
  })
  @IsOptional()
  foreground_color?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;

  @IsUrl({}, { message: 'hero_image_url debe ser una URL válida' })
  @IsOptional()
  hero_image_url?: string;
}
