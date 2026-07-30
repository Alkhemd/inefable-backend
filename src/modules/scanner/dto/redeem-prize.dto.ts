import { IsString, IsNotEmpty } from 'class-validator';

export class RedeemPrizeDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;
}
