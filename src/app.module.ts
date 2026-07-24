import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './infrastructure/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { WalletPassesModule } from './modules/wallet-passes/wallet-passes.module';
import { LoyaltyEngineModule } from './modules/loyalty-engine/loyalty-engine.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    AuthModule,
    MerchantsModule,
    EmployeesModule,
    WalletPassesModule,
    LoyaltyEngineModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
