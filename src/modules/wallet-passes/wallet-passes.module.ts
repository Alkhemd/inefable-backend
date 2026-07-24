import { Module } from '@nestjs/common';
import { WalletPassesService } from './wallet-passes.service';
import { WalletPassesController } from './wallet-passes.controller';

@Module({
  providers: [WalletPassesService],
  controllers: [WalletPassesController]
})
export class WalletPassesModule {}
