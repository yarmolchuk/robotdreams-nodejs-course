import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedData1771863332077 implements MigrationInterface {
  name = 'SeedData1771863332077';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "users" ("name", "email") VALUES
        ('John Doe', 'john@example.com'),
        ('Jane Smith', 'jane@example.com'),
        ('Bob Wilson', 'bob@example.com')
    `);

    await queryRunner.query(`
      INSERT INTO "products" ("name", "description", "price", "stock", "version") VALUES
        ('Laptop', 'High-performance laptop', 999.99, 50, 1),
        ('Mouse', 'Wireless ergonomic mouse', 29.99, 200, 1),
        ('Keyboard', 'Mechanical keyboard', 79.99, 150, 1),
        ('Monitor', '27-inch 4K monitor', 449.99, 30, 1),
        ('Headphones', 'Noise-cancelling headphones', 149.99, 100, 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "order_items"`);
    await queryRunner.query(`DELETE FROM "orders"`);
    await queryRunner.query(`DELETE FROM "products"`);
    await queryRunner.query(`DELETE FROM "users"`);
  }
}
