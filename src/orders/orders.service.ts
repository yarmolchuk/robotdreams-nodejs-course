import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './enums/order-status.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates an order transactionally with idempotency and oversell protection.
   *
   * Concurrency approach: pessimistic locking (FOR UPDATE).
   * - Simpler than optimistic locking — no retry logic needed.
   * - PostgreSQL handles FOR UPDATE efficiently.
   * - Deadlocks prevented by always locking product rows in ascending ID order.
   */
  async create(
    createOrderDto: CreateOrderDto,
  ): Promise<{ order: Order; created: boolean }> {
    // Quick idempotency check outside transaction (fast path for retries)
    const existingOrder = await this.ordersRepository.findOne({
      where: { idempotencyKey: createOrderDto.idempotencyKey },
      relations: ['items'],
    });
    if (existingOrder) {
      return { order: existingOrder, created: false };
    }

    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Idempotency check inside transaction (race condition safety)
      const existingInTx = await queryRunner.manager.findOne(Order, {
        where: { idempotencyKey: createOrderDto.idempotencyKey },
        relations: ['items'],
      });
      if (existingInTx) {
        await queryRunner.commitTransaction();
        return { order: existingInTx, created: false };
      }

      // Verify user exists
      const user = await queryRunner.manager.findOneBy(User, {
        id: createOrderDto.userId,
      });
      if (!user) {
        throw new NotFoundException(
          `User with id ${createOrderDto.userId} not found`,
        );
      }

      // Lock product rows with pessimistic_write (FOR UPDATE).
      // Sort IDs to prevent deadlocks — always acquire locks in ascending order.
      const productIds = [
        ...new Set(createOrderDto.items.map((item) => item.productId)),
      ].sort((a, b) => a - b);

      const products = await queryRunner.manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id IN (:...ids)', { ids: productIds })
        .orderBy('product.id', 'ASC')
        .getMany();

      // Verify all requested products exist
      if (products.length !== productIds.length) {
        const foundIds = new Set(products.map((p) => p.id));
        const missingIds = productIds.filter((id) => !foundIds.has(id));
        throw new NotFoundException(
          `Products not found: ${missingIds.join(', ')}`,
        );
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      // Verify stock and calculate total price
      let totalPrice = 0;
      const orderItems: Partial<OrderItem>[] = [];

      for (const itemDto of createOrderDto.items) {
        const product = productMap.get(itemDto.productId)!;

        if (product.stock < itemDto.quantity) {
          throw new ConflictException(
            `Insufficient stock for product "${product.name}" (id: ${product.id}). ` +
              `Available: ${product.stock}, Requested: ${itemDto.quantity}`,
          );
        }

        // Deduct stock
        product.stock -= itemDto.quantity;

        // Calculate line total (decimal columns come as strings from pg driver)
        const lineTotal = Number(product.price) * itemDto.quantity;
        totalPrice += lineTotal;

        orderItems.push({
          productId: product.id,
          quantity: itemDto.quantity,
          priceAtPurchase: Number(product.price),
        });
      }

      // Save updated product stock
      await queryRunner.manager.save(Product, products);

      // Create order
      const order = queryRunner.manager.create(Order, {
        userId: createOrderDto.userId,
        status: OrderStatus.PENDING,
        totalPrice: Math.round(totalPrice * 100) / 100,
        idempotencyKey: createOrderDto.idempotencyKey,
      });
      const savedOrder = await queryRunner.manager.save(Order, order);

      // Create order items
      const items = orderItems.map((item) =>
        queryRunner.manager.create(OrderItem, {
          ...item,
          orderId: savedOrder.id,
        }),
      );
      savedOrder.items = await queryRunner.manager.save(OrderItem, items);

      // Commit — all or nothing
      await queryRunner.commitTransaction();

      return { order: savedOrder, created: true };
    } catch (error) {
      // Rollback on any error
      await queryRunner.rollbackTransaction();

      // Re-throw known NestJS exceptions
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Handle unique constraint violation on idempotency_key
      // (race condition: two transactions passed the check, one committed first)
      if (
        error instanceof Error &&
        'code' in error &&
        (error as any).code === '23505' &&
        String((error as any).detail).includes('idempotency_key')
      ) {
        const racedOrder = await this.ordersRepository.findOne({
          where: { idempotencyKey: createOrderDto.idempotencyKey },
          relations: ['items'],
        });
        if (racedOrder) {
          return { order: racedOrder, created: false };
        }
      }

      throw new InternalServerErrorException(
        'Failed to create order. Please try again.',
      );
    } finally {
      // ALWAYS release the QueryRunner back to the connection pool
      await queryRunner.release();
    }
  }

  async findAll(
    status?: OrderStatus,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Order[]> {
    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items');

    if (status) {
      qb.andWhere('order.status = :status', { status });
    }

    if (startDate) {
      qb.andWhere('order.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('order.created_at <= :endDate', { endDate });
    }

    qb.orderBy('order.created_at', 'DESC');

    return qb.getMany();
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['items', 'items.product'],
    });
    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }
    return order;
  }
}
