import { IsIn } from 'class-validator';
import { ANTI_FRAUD_MODES } from './create-merchant.dto';

export class SetSecurityModeDto {
  @IsIn(ANTI_FRAUD_MODES, {
    message: `anti_fraud_mode debe ser uno de: ${ANTI_FRAUD_MODES.join(', ')}`,
  })
  anti_fraud_mode: string;
}
