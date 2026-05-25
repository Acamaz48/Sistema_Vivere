import { Module } from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceOrdersController } from './service-orders.controller';
import { EventsController } from './events.controller'; // NOVO IMPORT

@Module({
  providers: [ServiceOrdersService],
  controllers: [
    ServiceOrdersController,
    EventsController, // ADICIONADO AQUI
  ],
})
export class ServiceOrdersModule {}
