import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // 1. Crear formas de pago básicas
  const formasPago = [
    { nombre: 'Efectivo', requiereComprobante: false },
    { nombre: 'Tarjeta de Crédito', requiereComprobante: true },
    { nombre: 'Tarjeta de Débito', requiereComprobante: true },
    { nombre: 'Transferencia', requiereComprobante: true },
    { nombre: 'Mercado Pago', requiereComprobante: true },
  ];

  for (const fp of formasPago) {
    await prisma.formaPago.upsert({
      where: { nombre: fp.nombre },
      update: {},
      create: fp,
    });
  }
  console.log('✅ Formas de pago creadas');

  // 2. Crear persona del peluquero
  const persona = await prisma.persona.upsert({
    where: { mail: 'admin@peluqueria.com' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido: 'Peluquero',
      mail: 'admin@peluqueria.com',
      telefono: '+54 11 0000-0000',
    },
  });
  console.log('✅ Persona creada:', persona.nombre);

  // 3. Crear usuario web (admin)
  const hashPass = await bcrypt.hash('admin123', 10);
  const usuario = await prisma.usuarioWeb.upsert({
    where: { usuario: 'admin' },
    update: {},
    create: {
      usuario: 'admin',
      email: 'admin@peluqueria.com',
      hashPass,
      rol: 'ADMIN',
      idPersona: persona.idPersona,
    },
  });
  console.log('✅ Usuario creado:', usuario.usuario);

  console.log('🌱 Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
