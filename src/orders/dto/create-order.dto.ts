import {
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  ArrayMinSize,
  IsEnum,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../order.entity';

export class OrderItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsNumber()
  userId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class UpdateOrderStatusDto {
  @IsString()
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
