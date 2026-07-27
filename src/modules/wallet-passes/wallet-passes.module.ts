import { Module } from '@nestjs/common';
import { WalletPassesService } from './wallet-passes.service';
import { WalletPassesController } from './wallet-passes.controller';
import { SupabaseModule } from '../../infrastructure/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [WalletPassesService],
  controllers: [WalletPassesController],
  exports: [WalletPassesService],
})
export class WalletPassesModule {}
