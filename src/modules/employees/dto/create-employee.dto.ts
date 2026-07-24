import { IsString, IsNotEmpty, IsNumberString, Length } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumberString({}, { message: 'El PIN debe contener únicamente números' })
  @Length(4, 4, { message: 'El PIN debe ser exactamente de 4 dígitos' })
  pin: string;
}
