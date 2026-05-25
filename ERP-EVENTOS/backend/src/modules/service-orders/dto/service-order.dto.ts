// src/modules/service-orders/dto/service-order.dto.ts

import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsUUID,
  ArrayMinSize,
  IsEnum,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceOrderStatus } from '@prisma/client';

export class OrderItemDto {
  @IsUUID('4', { message: 'O ID do material deve ser um UUID válido.' })
  materialId!: string;

  @IsUUID('4', {
    message: 'O ID da unidade operacional deve ser um UUID válido.',
  })
  operationalUnitId!: string;

  @IsInt({ message: 'A quantidade deve ser um número inteiro.' })
  @Min(1, { message: 'A quantidade mínima permitida é 1.' })
  quantity!: number;
}

export class CreateServiceOrderDto {
  // ==========================================
  // 📅 DADOS DO EVENTO (Unificados)
  // ==========================================
  @IsString({ message: 'O nome do evento é obrigatório.' })
  eventName!: string;

  @IsDateString({}, { message: 'Data de início inválida.' })
  startDate!: string;

  @IsDateString({}, { message: 'Data de fim inválida.' })
  endDate!: string;

  // ==========================================
  // 📍 DADOS DE LOCALIZAÇÃO (Address)
  // ==========================================
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() zipCode?: string;

  // ==========================================
  // 🛠️ DADOS DA ORDEM DE SERVIÇO
  // ==========================================
  @IsString({ message: 'O fornecedor deve ser um texto.' })
  @IsOptional()
  supplier?: string;

  @IsArray({ message: 'Os itens devem ser enviados em formato de lista.' })
  @ArrayMinSize(1, {
    message: 'A ordem de serviço deve conter pelo menos um item.',
  })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}

export class UpdateServiceOrderDto {
  // Todos os campos são opcionais no PATCH/PUT
  @IsOptional() @IsString() eventName?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() supplier?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];
}
