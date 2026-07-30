import { Module } from '@nestjs/common';
import { LoyaltyEngineService } from './loyalty-engine.service';
import { LoyaltyEngineController } from './loyalty-engine.controller';

@Module({
  providers: [LoyaltyEngineService],
  controllers: [LoyaltyEngineController],
})
export class LoyaltyEngineModule {}
