import { IsEmail, IsNotEmpty, IsString, IsUUID, IsOptional, Length } from 'class-validator';

export class JoinProgramDto {
  @IsUUID()
  @IsNotEmpty()
  businessId: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  @Length(7, 20)
  phoneNumber?: string;
}
