import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  // Criar o Tenant Padrão se não existir
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'clinica-padrao' },
    update: {},
    create: {
      name: 'Clínica Padrão',
      slug: 'clinica-padrao',
    },
  });

  console.log(`Tenant criado/verificado: ${tenant.name}`);

  // Criptografar a senha
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Criar o Usuário Master Padrão
  const user = await prisma.user.upsert({
    where: { email: 'arthur-86@hotmail.com' },
    update: {
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'arthur-86@hotmail.com',
      password: hashedPassword,
      name: 'Arthur (Master)',
      role: 'SUPER_ADMIN',
      tenantId: tenant.id,
    },
  });

  console.log(`Usuário Master criado: ${user.email}`);
  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
