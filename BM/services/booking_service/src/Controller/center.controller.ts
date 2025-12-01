import { Controller, Get } from '@nestjs/common';
import { CenterService } from '../Service/center.service';
import { Param } from '@nestjs/common';

@Controller('centers')
export class CenterController {
    constructor(
        private readonly centerService: CenterService
    ) {}

    @Get(':id/pricing')
    async getPricing(@Param('id') id: string) {
        return this.centerService.findCenterPricingById(id);
    }
}