import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const servicesData = [
  {
    name: 'Haircut',
    durationMinutes: 30,
    price: 30.00,
  },
  {
    name: 'Beard Trim',
    durationMinutes: 15,
    price: 15.00,
  },
  {
    name: 'Hair + Beard',
    durationMinutes: 45,
    price: 40.00,
  },
  {
    name: 'Facial',
    durationMinutes: 60,
    price: 50.00,
  },
];

async function main() {
  console.log('Seeding StyleCraft Barber services...');
  
  for (const service of servicesData) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });
    
    if (!existing) {
      const created = await prisma.service.create({
        data: service,
      });
      console.log(`Created service: ${created.name} (${created.durationMinutes}m) - $${created.price}`);
    } else {
      console.log(`Service already exists: ${service.name}`);
    }
  }
  
  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
