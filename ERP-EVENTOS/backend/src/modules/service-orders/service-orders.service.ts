import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ServiceOrderStatus,
  UserRole,
  ServiceOrderItemStatus,
} from '@prisma/client';
import {
  CreateServiceOrderDto,
  UpdateServiceOrderDto,
} from './dto/service-order.dto';

@Injectable()
export class ServiceOrdersService {
  constructor(private prisma: PrismaService) {}

  async createServiceOrder(userId: string, data: CreateServiceOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      for (const item of data.items) {
        const material = await tx.material.findUnique({
          where: { id: item.materialId },
        });

        if (!material) {
          throw new NotFoundException(
            `O material com ID ${item.materialId} não existe no catálogo.`,
          );
        }

        if (material.stock < item.quantity) {
          throw new BadRequestException(
            `Estoque insuficiente para [${material.name}]. Solicitado: ${item.quantity}, Disponível: ${material.stock}.`,
          );
        }

        await tx.material.update({
          where: { id: item.materialId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      const eventData: any = {
        name: data.eventName,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: 'PENDING',
      };

      if (data.street) {
        eventData.address = {
          create: {
            latitude: data.latitude,
            longitude: data.longitude,
            street: data.street,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
          },
        };
      }

      const event = await tx.event.create({
        data: eventData,
      });

      return tx.serviceOrder.create({
        data: {
          userId,
          eventId: event.id,
          supplier: data.supplier,
          status: ServiceOrderStatus.DRAFT,
          items: {
            create: data.items.map((item) => ({
              materialId: item.materialId,
              operationalUnitId: item.operationalUnitId,
              quantity: item.quantity,
              status: ServiceOrderItemStatus.ADDED,
            })),
          },
        },
        include: {
          event: { include: { address: true } },
          items: { include: { material: true } },
        },
      });
    });
  }

  async findAll() {
    return this.prisma.serviceOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        event: { include: { address: true } },
        items: {
          where: { status: ServiceOrderItemStatus.ADDED },
          include: { material: true },
        },
        user: { select: { name: true, email: true } },
      },
    });
  }

  async findOne(id: string) {
    const os = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        event: { include: { address: true } },
        items: {
          where: { status: ServiceOrderItemStatus.ADDED },
          include: { material: true },
        },
      },
    });
    if (!os) throw new NotFoundException('Ordem de Serviço não encontrada.');
    return os;
  }

  async updateServiceOrder(
    orderId: string,
    role: UserRole,
    data: UpdateServiceOrderDto,
  ) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: { event: true },
    });

    if (!order) throw new NotFoundException('OS não encontrada.');

    if (
      role === UserRole.PRODUCAO &&
      order.status !== ServiceOrderStatus.DRAFT &&
      order.status !== ServiceOrderStatus.PENDING
    ) {
      throw new BadRequestException(
        'A Produção só pode editar OS em DRAFT ou PENDING (devolvida).',
      );
    }
    if (
      role === UserRole.GALPAO &&
      order.status !== ServiceOrderStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'O Galpão só pode editar ordens com status ACTIVE.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.eventName || data.startDate || data.endDate) {
        await tx.event.update({
          where: { id: order.eventId },
          data: {
            ...(data.eventName && { name: data.eventName }),
            ...(data.startDate && { startDate: new Date(data.startDate) }),
            ...(data.endDate && { endDate: new Date(data.endDate) }),
          },
        });
      }

      if (data.items && data.items.length > 0) {
        await tx.serviceOrderItem.updateMany({
          where: {
            serviceOrderId: orderId,
            status: ServiceOrderItemStatus.ADDED,
          },
          data: { status: ServiceOrderItemStatus.REMOVED },
        });

        await tx.serviceOrderItem.createMany({
          data: data.items.map((item) => ({
            serviceOrderId: orderId,
            materialId: item.materialId,
            operationalUnitId: item.operationalUnitId,
            quantity: item.quantity,
            status: ServiceOrderItemStatus.ADDED,
          })),
        });
      }

      return tx.serviceOrder.update({
        where: { id: orderId },
        data: { ...(data.supplier && { supplier: data.supplier }) },
        include: {
          event: true,
          items: { where: { status: ServiceOrderItemStatus.ADDED } },
        },
      });
    });
  }

  async submitServiceOrder(orderId: string, role: UserRole) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('OS não encontrada.');

    let newStatus: ServiceOrderStatus;

    if (role === UserRole.PRODUCAO) {
      if (
        order.status !== ServiceOrderStatus.DRAFT &&
        order.status !== ServiceOrderStatus.PENDING
      ) {
        throw new BadRequestException(
          'Produção: Só é possível enviar ordens Rascunho ou Pendentes.',
        );
      }
      newStatus = ServiceOrderStatus.ACTIVE;
    } else if (role === UserRole.GALPAO) {
      if (order.status !== ServiceOrderStatus.ACTIVE) {
        throw new BadRequestException(
          'Galpão: Só é possível processar ordens Ativas.',
        );
      }
      newStatus = ServiceOrderStatus.PENDING;
    } else {
      throw new BadRequestException(
        'Cargo sem permissão para transição de status.',
      );
    }

    return this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status: newStatus },
      include: { event: true },
    });
  }

  async finalizeServiceOrder(orderId: string, role: UserRole) {
    if (role !== UserRole.PRODUCAO) {
      throw new BadRequestException(
        'Aprovação final é restrita ao cargo de PRODUÇÃO.',
      );
    }

    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });
    if (order?.status !== ServiceOrderStatus.PENDING) {
      throw new BadRequestException(
        'Apenas ordens validadas pelo galpão (PENDING) podem ser finalizadas.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: order.eventId },
        data: { status: 'ACTIVE' },
      });

      return tx.serviceOrder.update({
        where: { id: orderId },
        data: { status: ServiceOrderStatus.READY },
        include: { event: true },
      });
    });
  }

  async deleteServiceOrder(orderId: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: {
        event: true,
        items: { where: { status: ServiceOrderItemStatus.ADDED } },
      },
    });

    if (!order) throw new NotFoundException('Ordem de Serviço não encontrada.');

    return this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.material.update({
          where: { id: item.materialId },
          data: { stock: { increment: item.quantity } },
        });
      }

      await tx.serviceOrderItem.deleteMany({
        where: { serviceOrderId: orderId },
      });
      await tx.serviceOrder.delete({ where: { id: orderId } });
      await tx.event.delete({ where: { id: order.eventId } });

      if (order.event.addressId) {
        await tx.address.delete({ where: { id: order.event.addressId } });
      }
      return {
        message: 'Ordem de Serviço excluída. Estoque estornado com sucesso.',
      };
    });
  }

  async bindScannedPhysicalItem(
    orderId: string,
    serviceOrderItemId: string,
    physicalItemId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findUnique({
        where: { id: orderId },
      });
      if (!order || order.status !== ServiceOrderStatus.ACTIVE) {
        throw new BadRequestException(
          'Bipagem permitida apenas em ordens com status ACTIVE.',
        );
      }

      const physicalItem = await tx.physicalItem.findUnique({
        where: { id: physicalItemId },
      });
      if (!physicalItem || physicalItem.status !== 'AVAILABLE') {
        throw new BadRequestException(
          'Este item físico não está disponível ou já está em outro evento.',
        );
      }

      return tx.physicalItem.update({
        where: { id: physicalItemId },
        data: {
          status: 'RESERVED',
          serviceOrderItemId: serviceOrderItemId,
        },
      });
    });
  }

  async findAllEvents() {
    return this.prisma.event.findMany({
      orderBy: { startDate: 'asc' },
      include: { address: true },
    });
  }

  async updateEventStatus(eventId: string, status: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado no sistema.');
    }

    if (!status) {
      throw new BadRequestException(
        'O novo status do evento deve ser informado.',
      );
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: { status },
    });
  }
}