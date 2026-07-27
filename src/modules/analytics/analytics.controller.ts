import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(SupabaseAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('kpis')
  async getKPIs(@CurrentUser() user: any) {
    return this.analyticsService.getKPIs(user.id);
  }

  @Get('employees')
  async getEmployeeRanking(@CurrentUser() user: any) {
    return this.analyticsService.getEmployeeRanking(user.id);
  }

  @Get('recent')
  async getRecentActivity(@CurrentUser() user: any) {
    return this.analyticsService.getRecentActivity(user.id);
  }

}
