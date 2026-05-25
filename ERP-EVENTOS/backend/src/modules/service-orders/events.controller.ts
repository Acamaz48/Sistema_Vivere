import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly osService: ServiceOrdersService) {}

  // 📋 LISTAGEM DE EVENTOS: Visível para Produção, Galpão e Admin
  @Get()
  @Roles(UserRole.PRODUCAO, UserRole.GALPAO, UserRole.ADMIN)
  findAll() {
    return this.osService.findAllEvents();
  }

  // ✏️ ALTERAÇÃO DE STATUS: Restrito a Produção e Admin
  @Patch(':id/status')
  @Roles(UserRole.PRODUCAO, UserRole.ADMIN)
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.osService.updateEventStatus(id, status);
  }
}
