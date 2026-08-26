import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
}

function setTime(date: Date, hour: number, minute = 0): Date {
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function startOfDay(date: Date): Date {
  return setTime(date, 0, 0);
}

function endOfDay(date: Date): Date {
  return setTime(date, 23, 59);
}

function seSolapa(inicio: Date, fin: Date, existentes: Array<{ inicio: Date; fin: Date }>): boolean {
  return existentes.some((t) => inicio < t.fin && fin > t.inicio);
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pickRandom<T>(arr: T[], seed: number): T {
  return arr[Math.floor(pseudoRandom(seed) * arr.length)];
}

function weightedRandom<T>(arr: T[], weights: number[], seed: number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = pseudoRandom(seed) * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

async function main() {
  console.log('🌱 Iniciando seed de demo realista...');

  // 1. Formas de pago
  const formasPagoData = [
    { nombre: 'Efectivo', requiereComprobante: false },
    { nombre: 'Tarjeta de Crédito', requiereComprobante: true },
    { nombre: 'Tarjeta de Débito', requiereComprobante: true },
    { nombre: 'Transferencia', requiereComprobante: true },
    { nombre: 'Mercado Pago', requiereComprobante: true },
  ];

  for (const fp of formasPagoData) {
    const existing = await prisma.formaPago.findFirst({
      where: { nombre: fp.nombre },
    });
    if (!existing) {
      await prisma.formaPago.create({ data: fp });
    }
  }
  const formasPago = await prisma.formaPago.findMany();
  const formaEfectivo = formasPago.find((f) => f.nombre === 'Efectivo')!;
  const formaCredito = formasPago.find((f) => f.nombre === 'Tarjeta de Crédito')!;
  const formaDebito = formasPago.find((f) => f.nombre === 'Tarjeta de Débito')!;
  const formaTransferencia = formasPago.find((f) => f.nombre === 'Transferencia')!;
  const formaMercadoPago = formasPago.find((f) => f.nombre === 'Mercado Pago')!;
  console.log('✅ Formas de pago creadas');

  // 2. Persona del peluquero
  const personaAdmin = await prisma.persona.upsert({
    where: { mail: 'admin@peluqueria.com' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido: 'Peluquero',
      mail: 'admin@peluqueria.com',
      telefono: '+54 11 0000-0000',
    },
  });

  const hashPass = await bcrypt.hash('admin123', 10);
  await prisma.usuarioWeb.upsert({
    where: { usuario: 'admin' },
    update: {},
    create: {
      usuario: 'admin',
      email: 'admin@peluqueria.com',
      hashPass,
      rol: 'ADMIN',
      idPersona: personaAdmin.idPersona,
    },
  });
  console.log('✅ Usuario admin creado');

  // 3. Clientes de demo
  const clientesData = [
    { nombre: 'Juan', apellido: 'Pérez', mail: 'juan.perez@mail.com', telefono: '+54 11 1111-1111', instagram: '@juanperez' },
    { nombre: 'María', apellido: 'García', mail: 'maria.garcia@mail.com', telefono: '+54 11 2222-2222', instagram: '@mariagar' },
    { nombre: 'Carlos', apellido: 'López', mail: 'carlos.lopez@mail.com', telefono: '+54 11 3333-3333' },
    { nombre: 'Ana', apellido: 'Martínez', mail: 'ana.martinez@mail.com', telefono: '+54 11 4444-4444', instagram: '@anamartinez' },
    { nombre: 'Lucía', apellido: 'Rodríguez', mail: 'lucia.rodriguez@mail.com', telefono: '+54 11 5555-5555' },
    { nombre: 'Pedro', apellido: 'Sánchez', mail: 'pedro.sanchez@mail.com', telefono: '+54 11 6666-6666' },
    { nombre: 'Sofía', apellido: 'Fernández', mail: 'sofia.fernandez@mail.com', telefono: '+54 11 7777-7777', instagram: '@sofiaf' },
    { nombre: 'Martín', apellido: 'González', mail: 'martin.gonzalez@mail.com', telefono: '+54 11 8888-8888' },
    { nombre: 'Valentina', apellido: 'Díaz', mail: 'valentina.diaz@mail.com', telefono: '+54 11 9999-9999' },
    { nombre: 'Mateo', apellido: 'Ruiz', mail: 'mateo.ruiz@mail.com', telefono: '+54 11 1010-1010' },
    { nombre: 'Camila', apellido: 'Silva', mail: 'camila.silva@mail.com', telefono: '+54 11 1212-1212' },
    { nombre: 'Joaquín', apellido: 'Torres', mail: 'joaquin.torres@mail.com', telefono: '+54 11 1313-1313' },
    { nombre: 'Isabella', apellido: 'Romero', mail: 'isabella.romero@mail.com', telefono: '+54 11 1414-1414' },
    { nombre: 'Tomás', apellido: 'Flores', mail: 'tomas.flores@mail.com', telefono: '+54 11 1515-1515' },
    { nombre: 'Morena', apellido: 'Castro', mail: 'morena.castro@mail.com', telefono: '+54 11 1616-1616' },
  ];

  const clientes: { idPersona: number; nombre: string; apellido: string }[] = [];
  for (const c of clientesData) {
    const cliente = await prisma.persona.upsert({
      where: { mail: c.mail },
      update: {},
      create: c,
    });
    clientes.push({ idPersona: cliente.idPersona, nombre: cliente.nombre, apellido: cliente.apellido });
  }
  console.log('✅ Clientes de demo creados');

  // 4. Categorías de servicios y de productos (entidades independientes)
  const categoriasServicioData = ['Corte', 'Color', 'Tratamiento', 'Peinado'];
  const categoriasServicio: { idCategoria: number; nombre: string }[] = [];
  for (const nombre of categoriasServicioData) {
    let categoria = await prisma.categoriaServicio.findFirst({ where: { nombre } });
    if (!categoria) {
      categoria = await prisma.categoriaServicio.create({ data: { nombre } });
    }
    categoriasServicio.push({ idCategoria: categoria.idCategoria, nombre: categoria.nombre });
  }

  const categoriasProductoData = ['Cuidado de barba', 'Cuidado capilar', 'Styling'];
  const categoriasProducto: { idCategoria: number; nombre: string }[] = [];
  for (const nombre of categoriasProductoData) {
    let categoria = await prisma.categoria.findFirst({ where: { nombre } });
    if (!categoria) {
      categoria = await prisma.categoria.create({ data: { nombre } });
    }
    categoriasProducto.push({ idCategoria: categoria.idCategoria, nombre: categoria.nombre });
  }
  console.log('✅ Categorías de demo creadas');

  // 5. Servicios de demo
  const serviciosData = [
    { nombre: 'Corte de pelo', precio: 25.0, duracionMinutos: 30, categoriaNombre: 'Corte' },
    { nombre: 'Corte + barba', precio: 35.0, duracionMinutos: 45, categoriaNombre: 'Corte' },
    { nombre: 'Coloración completa', precio: 80.0, duracionMinutos: 120, categoriaNombre: 'Color' },
    { nombre: 'Mechas', precio: 120.0, duracionMinutos: 150, categoriaNombre: 'Color' },
    { nombre: 'Retoque de raíces', precio: 60.0, duracionMinutos: 90, categoriaNombre: 'Color' },
    { nombre: 'Tratamiento hidratante', precio: 50.0, duracionMinutos: 60, categoriaNombre: 'Tratamiento' },
    { nombre: 'Alisado', precio: 150.0, duracionMinutos: 180, categoriaNombre: 'Tratamiento' },
    { nombre: 'Peinado', precio: 40.0, duracionMinutos: 45, categoriaNombre: 'Peinado' },
    { nombre: 'Baño de crema', precio: 45.0, duracionMinutos: 45, categoriaNombre: 'Tratamiento' },
    { nombre: 'Corte infantil', precio: 20.0, duracionMinutos: 30, categoriaNombre: 'Corte' },
  ];

  const servicios: { idServicio: number; precio: number; duracionMinutos: number; nombre: string }[] = [];
  for (const s of serviciosData) {
    let servicio = await prisma.servicio.findFirst({
      where: { nombre: s.nombre },
    });
    if (!servicio) {
      const idCategoria = categoriasServicio.find((c) => c.nombre === s.categoriaNombre)!.idCategoria;
      servicio = await prisma.servicio.create({
        data: { nombre: s.nombre, precio: s.precio, duracionMinutos: s.duracionMinutos, idCategoria },
      });
    }
    servicios.push({
      idServicio: servicio.idServicio,
      precio: Number(servicio.precio),
      duracionMinutos: servicio.duracionMinutos,
      nombre: servicio.nombre,
    });
  }
  console.log('✅ Servicios de demo creados');

  // 6. Productos y cursos
  const productosData = [
    { nombre: 'Cera moldeadora', descripcion: 'Fijación fuerte, terminación mate', precio: 4500.0, categoria: 'Styling' },
    { nombre: 'Pomada clásica', descripcion: 'Brillo intenso, fijación media', precio: 4200.0, categoria: 'Styling' },
    { nombre: 'Aceite para barba', descripcion: 'Hidrata y suaviza, aroma amaderado', precio: 3800.0, categoria: 'Cuidado de barba' },
    { nombre: 'Bálsamo para barba', descripcion: 'Modela y nutre la barba', precio: 4000.0, categoria: 'Cuidado de barba' },
    { nombre: 'Shampoo anticaída', descripcion: 'Fortalece raíz y cuero cabelludo', precio: 5200.0, categoria: 'Cuidado capilar' },
    { nombre: 'Kit de afeitado clásico', descripcion: 'Navaja, brocha y jabón de afeitar', precio: 9500.0, categoria: 'Cuidado de barba' },
  ];
  for (const p of productosData) {
    const existe = await prisma.producto.findFirst({ where: { nombre: p.nombre } });
    if (!existe) {
      const idCategoria = categoriasProducto.find((c) => c.nombre === p.categoria)!.idCategoria;
      await prisma.producto.create({
        data: {
          nombre: p.nombre,
          descripcion: p.descripcion,
          precio: p.precio,
          idCategoria,
        },
      });
    }
  }

  const cursosData = [
    { nombre: 'Barbería profesional', descripcion: 'Formación integral en técnicas de corte y afeitado', precio: 60000.0, duracion: '8 semanas' },
    { nombre: 'Diseño de barba', descripcion: 'Técnicas de perfilado y diseño con navaja', precio: 35000.0, duracion: '4 semanas' },
    { nombre: 'Coloración masculina', descripcion: 'Coloración y mechas para cabello corto', precio: 45000.0, duracion: '6 semanas' },
  ];
  for (const c of cursosData) {
    const existe = await prisma.curso.findFirst({ where: { nombre: c.nombre } });
    if (!existe) {
      await prisma.curso.create({ data: c });
    }
  }
  console.log('✅ Productos y cursos de demo creados');

  // 7. Limpiar datos previos de demo
  await prisma.pago.deleteMany({ where: { turno: { idPersona: { in: clientes.map((c) => c.idPersona) } } } });
  await prisma.movimientoCaja.deleteMany({ where: { idUsuario: 'admin' } });
  await prisma.turnoDetalle.deleteMany({ where: { turno: { idPersona: { in: clientes.map((c) => c.idPersona) } } } });
  await prisma.turno.deleteMany({ where: { idPersona: { in: clientes.map((c) => c.idPersona) } } });
  await prisma.cierreCaja.deleteMany({ where: { idUsuarioCierra: 'admin' } });

  // 8. Generar turnos realistas de los últimos 30 días + hoy + próximos días
  const hoy = new Date();
  const slots: string[] = [];
  for (let h = 9; h < 18; h += 0.5) {
    const hh = Math.floor(h);
    const mm = h === Math.floor(h) ? '00' : '30';
    slots.push(`${hh.toString().padStart(2, '0')}:${mm}`);
  }

  const turnosFuturos: Array<{ diaOffset: number; hora: number; minuto: number; clienteIdx: number; serviciosIds: number[]; estado: string }> = [];
  const diasPasados = 30;
  let totalTurnos = 0;

  for (let dia = -diasPasados; dia <= 3; dia++) {
    const fechaBase = addDays(hoy, dia);
    const diaSemana = fechaBase.getDay();
    // Domingos cerrados, sábados más movimiento
    if (diaSemana === 0) continue;

    const esFinDeSemana = diaSemana === 6;
    const cantidadTurnos = esFinDeSemana
      ? Math.floor(pseudoRandom(dia + 1000) * 4) + 4
      : Math.floor(pseudoRandom(dia + 1000) * 4) + 3;

    const turnosDelDia: Array<{ inicio: Date; fin: Date }> = [];
    for (let i = 0; i < cantidadTurnos; i++) {
      const clienteIdx = Math.floor(pseudoRandom(dia * 1000 + i * 13) * clientes.length);
      const cantidadServicios = weightedRandom([1, 2], [75, 25], dia * 500 + i * 3);
      const serviciosIds: number[] = [];
      const serviciosBase = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (let j = 0; j < cantidadServicios; j++) {
        serviciosIds.push(pickRandom(serviciosBase, dia * 200 + i * 5 + j * 11));
      }
      const duracionTotal = serviciosIds.reduce((sum, id) => sum + servicios[id].duracionMinutos, 0);

      let slotIndex = Math.floor(pseudoRandom(dia * 100 + i * 7) * slots.length);
      let intentos = 0;
      let encontrado = false;
      const fecha = addDays(hoy, dia);
      const cierre = setTime(fecha, 18, 0);

      while (intentos < slots.length && !encontrado) {
        const [horaStr, minutoStr] = slots[slotIndex].split(':');
        const hora = parseInt(horaStr, 10);
        const minuto = parseInt(minutoStr, 10);
        const inicio = setTime(fecha, hora, minuto);
        const fin = addMinutes(inicio, duracionTotal);

        if (fin <= cierre && !seSolapa(inicio, fin, turnosDelDia)) {
          let estado: string;
          if (dia < 0) {
            // Pasados: mayoría completados, algunos cancelados/no-show
            estado = weightedRandom(
              ['COMPLETADO', 'CANCELADO', 'NO_SHOW'],
              [80, 12, 8],
              dia * 300 + i * 2,
            );
          } else if (dia === 0) {
            // Hoy: completados por la mañana, pendientes/confirmados por la tarde
            estado = hora < 12 ? 'COMPLETADO' : weightedRandom(['CONFIRMADO', 'PENDIENTE', 'COMPLETADO'], [40, 35, 25], i * 9);
          } else {
            // Futuros
            estado = weightedRandom(['PENDIENTE', 'CONFIRMADO'], [55, 45], dia * 400 + i * 4);
          }

          turnosDelDia.push({ inicio, fin });
          turnosFuturos.push({ diaOffset: dia, hora, minuto, clienteIdx, serviciosIds, estado });
          totalTurnos++;
          encontrado = true;
        }

        slotIndex = (slotIndex + 1) % slots.length;
        intentos++;
      }
    }
  }

  // 9. Crear turnos, detalles, pagos y movimientos
  const createdTurnos: Array<{ idTurno: number; fecha: Date; total: number; estado: string; formaPagoId?: number }> = [];

  for (let idx = 0; idx < turnosFuturos.length; idx++) {
    const t = turnosFuturos[idx];
    const fecha = addDays(hoy, t.diaOffset);
    const inicio = setTime(fecha, t.hora, t.minuto);
    const duracionTotal = t.serviciosIds.reduce((sum, id) => sum + servicios[id].duracionMinutos, 0);
    const fin = addHours(inicio, duracionTotal / 60);
    const total = Number(
      t.serviciosIds
        .reduce((sum, id) => sum + servicios[id].precio, 0)
        .toFixed(2),
    );

    const turno = await prisma.turno.create({
      data: {
        idPersona: clientes[t.clienteIdx].idPersona,
        fechaHoraInicio: inicio,
        fechaHoraFin: fin,
        estado: t.estado,
        observacion: t.estado === 'COMPLETADO' ? 'Atendido' : t.estado === 'CANCELADO' ? 'Cancelado por cliente' : t.estado === 'NO_SHOW' ? 'No se presentó' : 'Reserva',
      },
    });

    for (const id of t.serviciosIds) {
      await prisma.turnoDetalle.create({
        data: {
          idTurno: turno.idTurno,
          idServicio: servicios[id].idServicio,
          precioReal: servicios[id].precio,
          cantidad: 1,
        },
      });
    }

    let formaPagoId: number | undefined;
    if (t.estado === 'COMPLETADO') {
      const formaPago = pickRandom(formasPago, idx * 17);
      formaPagoId = formaPago.idFormaPago;

      await prisma.pago.create({
        data: {
          idTurno: turno.idTurno,
          idFormaPago: formaPagoId,
          monto: total,
          fechaHora: inicio,
        },
      });

      await prisma.movimientoCaja.create({
        data: {
          idUsuario: 'admin',
          idTurno: turno.idTurno,
          idFormaPago: formaPagoId,
          tipo: 'INGRESO',
          monto: total,
          concepto: `Pago - ${t.serviciosIds.map((id) => servicios[id].nombre).join(', ')}`,
          fechaHora: inicio,
        },
      });
    }

    createdTurnos.push({ idTurno: turno.idTurno, fecha, total, estado: t.estado, formaPagoId });
  }
  console.log(`✅ ${totalTurnos} turnos de demo creados`);

  // 10. Egresos realistas (días que tuvieron turnos)
  const conceptosEgresos = [
    { concepto: 'Café y desayuno', min: 8, max: 25 },
    { concepto: 'Productos de limpieza', min: 15, max: 40 },
    { concepto: 'Tintura profesional', min: 80, max: 200 },
    { concepto: 'Shampoo y acondicionador', min: 30, max: 90 },
    { concepto: 'Papel y útiles de oficina', min: 10, max: 35 },
    { concepto: 'Galletitas y snacks', min: 5, max: 20 },
    { concepto: 'Alquiler local (proporcional)', min: 100, max: 150 },
    { concepto: 'Servicios públicos', min: 50, max: 120 },
    { concepto: 'Publicidad redes', min: 20, max: 60 },
  ];

  const diasConIngresos = new Set(createdTurnos.filter((t) => t.estado === 'COMPLETADO').map((t) => t.fecha.toISOString().split('T')[0]));

  for (const diaStr of diasConIngresos) {
    const fecha = new Date(diaStr);
    const seed = fecha.getDate() + fecha.getMonth() * 31;
    const cantidadEgresos = Math.floor(pseudoRandom(seed * 3) * 2) + 1;
    for (let i = 0; i < cantidadEgresos; i++) {
      const egreso = pickRandom(conceptosEgresos, seed * 7 + i * 11);
      const monto = Number((egreso.min + pseudoRandom(seed * 13 + i * 5) * (egreso.max - egreso.min)).toFixed(2));
      await prisma.movimientoCaja.create({
        data: {
          idUsuario: 'admin',
          idFormaPago: formaEfectivo.idFormaPago,
          tipo: 'EGRESO',
          monto,
          concepto: egreso.concepto,
          fechaHora: setTime(fecha, 10 + Math.floor(pseudoRandom(seed * 2 + i) * 8), 0),
        },
      });
    }
  }
  console.log('✅ Egresos de demo creados');

  // 11. Cierres de caja para los últimos 7 días con movimientos
  const diasCierre = [-7, -6, -5, -4, -3, -2, -1, 0];
  for (const dias of diasCierre) {
    const fechaCierre = startOfDay(addDays(hoy, dias));

    const movimientosDelDia = await prisma.movimientoCaja.findMany({
      where: {
        fechaHora: {
          gte: fechaCierre,
          lte: endOfDay(fechaCierre),
        },
      },
    });

    if (movimientosDelDia.length === 0) continue;

    const totales = { efectivo: 0, tarjeta: 0, transferencia: 0, otros: 0 };
    for (const m of movimientosDelDia) {
      const monto = Number(m.monto);
      if (m.idFormaPago === formaEfectivo.idFormaPago) totales.efectivo += monto;
      else if (m.idFormaPago === formaCredito.idFormaPago || m.idFormaPago === formaDebito.idFormaPago) totales.tarjeta += monto;
      else if (m.idFormaPago === formaTransferencia.idFormaPago) totales.transferencia += monto;
      else totales.otros += monto;
    }

    const esperado = movimientosDelDia
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    await prisma.cierreCaja.create({
      data: {
        fecha: fechaCierre,
        horaInicio: setTime(fechaCierre, 9, 0),
        horaFin: setTime(fechaCierre, 18, 0),
        totalEfectivo: totales.efectivo,
        totalTarjeta: totales.tarjeta,
        totalTransferencia: totales.transferencia,
        totalOtros: totales.otros,
        totalEsperado: esperado,
        totalReal: esperado,
        diferencia: 0,
        idUsuarioCierra: 'admin',
      },
    });
  }
  console.log('✅ Cierres de caja de demo creados');

  console.log('🌱 Seed de demo realista completado exitosamente');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
