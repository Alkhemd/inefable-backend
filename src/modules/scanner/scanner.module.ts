import { Module } from '@nestjs/common';
import { ScannerController } from './scanner.controller';
import { ScannerService } from './scanner.service';

import { WalletPassesModule } from '../wallet-passes/wallet-passes.module';

@Module({
  imports: [WalletPassesModule],
  controllers: [ScannerController],
  providers: [ScannerService]
})
export class ScannerModule {}
