import { IsString, IsNotEmpty } from 'class-validator';

export class GeneratePassDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;
}
