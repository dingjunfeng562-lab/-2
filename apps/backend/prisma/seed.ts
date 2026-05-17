import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashed = await bcrypt.hash('baishuwan082508', 10);

  await prisma.user.upsert({
    where: { username: 'baishuwan' },
    update: {
      password: hashed,
      role: Role.ADMIN,
    },
    create: {
      username: 'baishuwan',
      password: hashed,
      role: Role.ADMIN,
    },
  });

  await prisma.user.deleteMany({
    where: {
      username: 'admin',
      role: Role.ADMIN,
    },
  });

  console.log('[OK] 默认管理员已强制同步为: baishuwan / baishuwan082508');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
