import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UsersService } from '../users/users.service';
import { Product } from 'src/products/product.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,

    private usersService: UsersService,
    private dataSource: DataSource,
  ) {}

  async findAll(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ['user', 'items', 'items.product'],
    });
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['user', 'items', 'items.product'],
    });
    if (!order) {
      throw new NotFoundException(`Order #${id} not found`);
    }
    return order;
  }

  async findByUser(userId: number): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { userId },
      relations: ['items', 'items.product'],
    });
  }

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.usersService.findOne(createOrderDto.userId);

      const order = queryRunner.manager.create(Order, {
        userId: user.id,
        total: 0,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await queryRunner.manager.save(Order, order);

      const orderItems: OrderItem[] = [];
      const updatedProducts = new Map<number, Product>();

      let total = 0;
      for (const itemDto of createOrderDto.items) {
        const product =
          updatedProducts.get(itemDto.productId) ||
          (await queryRunner.manager.findOne(Product, {
            where: { id: itemDto.productId },
            lock: { mode: 'pessimistic_write' },
          }));

        if (!product)
          throw new NotFoundException(
            `Product #${itemDto.productId} not found`,
          );

        if (!product.isAvailable)
          throw new BadRequestException(
            `Product ${product.name} is not available`,
          );

        if (product.stock < itemDto.quantity)
          throw new BadRequestException(`Not enough stock for ${product.name}`);

        orderItems.push(
          queryRunner.manager.create(OrderItem, {
            orderId: savedOrder.id,
            productId: product.id,
            quantity: itemDto.quantity,
            price: product.price,
          }),
        );

        total += Number(product.price) * itemDto.quantity;
        product.stock -= itemDto.quantity;
        product.isAvailable = product.stock > 0;
        updatedProducts.set(product.id, product);
      }

      await queryRunner.manager.save(OrderItem, orderItems);
      await queryRunner.manager.save(
        Product,
        Array.from(updatedProducts.values()),
      );

      savedOrder.total = total;
      await queryRunner.manager.save(Order, savedOrder);

      await queryRunner.commitTransaction();
      return this.findOne(savedOrder.id);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(id: number, status: OrderStatus): Promise<Order> {
    if (status === OrderStatus.CANCELLED) return this.cancel(id);

    const order = await this.findOne(id);
    if (order.status === OrderStatus.CANCELLED)
      throw new BadRequestException('Cannot update a cancelled order');

    order.status = status;
    return this.ordersRepository.save(order);
  }

  async cancel(id: number): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.findOne(Order, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      const order = await queryRunner.manager.findOne(Order, {
        where: { id },
        relations: ['items', 'items.product'],
      });

      if (!order) throw new NotFoundException(`Order #${id} not found`);

      if (order.status !== OrderStatus.PENDING)
        throw new BadRequestException('Only pending orders can be cancelled');

      for (const item of order.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) continue;

        product.stock += item.quantity;
        product.isAvailable = true;

        await queryRunner.manager.save(Product, product);
      }

      order.status = OrderStatus.CANCELLED;
      const savedOrder = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        { message: 'Failed to cancel order', error: e.message },
        e.stack,
      );

      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException('Failed to cancel order');
    } finally {
      await queryRunner.release();
    }
  }
}
