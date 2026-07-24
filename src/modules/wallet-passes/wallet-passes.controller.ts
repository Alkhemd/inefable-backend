import { Controller, Post, Body } from '@nestjs/common';
import { WalletPassesService } from './wallet-passes.service';
import { GeneratePassDto } from './dto/generate-pass.dto';

@Controller('wallet-passes')
export class WalletPassesController {
  constructor(private readonly walletPassesService: WalletPassesService) {}

  @Post('generate')
  async generatePass(@Body() dto: GeneratePassDto) {
    return this.walletPassesService.generatePassUrl(dto.customerId);
  }
}
