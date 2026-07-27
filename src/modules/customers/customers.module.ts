import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { WalletPassesModule } from '../wallet-passes/wallet-passes.module';

@Module({
  imports: [WalletPassesModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
