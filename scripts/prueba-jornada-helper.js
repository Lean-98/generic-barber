/*
 * Ayudante de scripts/prueba-jornada.sh. Corre DENTRO del contenedor del
 * backend (cwd /app), así usa JWT_SECRET y la conexión de Google Calendar
 * sin sacarlos del contenedor:
 *
 *   docker compose ... exec -T backend node - token 123 124 < scripts/prueba-jornada-helper.js
 *   docker compose ... exec -T backend node - borrar-eventos <id> <id> < scripts/prueba-jornada-helper.js
 *
 * token:          imprime el token del link "Cancelar turno" de cada turno
 *                 (el mismo que va en el mail al cliente).
 * borrar-eventos: borra esos eventos de Google Calendar e imprime
 *                 "<borrados> <fallidos>", o "no-conectado".
 */
require('reflect-metadata');

const [comando, ...args] = process.argv.slice(2);

async function token() {
  const { generarTokenCancelacion } = require('./dist/modules/turnos/cancelacion-token.util');
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no está definido en el contenedor');
  for (const id of args) console.log(generarTokenCancelacion(Number(id), process.env.JWT_SECRET));
}

async function borrarEventos() {
  const { NestFactory } = require('@nestjs/core');
  const { Module } = require('@nestjs/common');
  const { ConfigModule } = require('@nestjs/config');
  const { PrismaModule } = require('./dist/modules/prisma/prisma.module');
  const { GoogleCalendarService } = require('./dist/modules/google-calendar/google-calendar.service');

  // Módulo mínimo: solo lo que necesita GoogleCalendarService, sin levantar
  // la API ni los crons.
  class PruebaJornadaModule {}
  Module({
    imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
    providers: [GoogleCalendarService],
  })(PruebaJornadaModule);

  const app = await NestFactory.createApplicationContext(PruebaJornadaModule, { logger: ['error'] });
  try {
    const calendar = app.get(GoogleCalendarService);
    if (!calendar.isConfigured() || !(await calendar.isConnected())) {
      console.log('no-conectado');
      return;
    }
    let borrados = 0;
    let fallidos = 0;
    for (const id of args) {
      try {
        await calendar.deleteEvent(id);
        borrados++;
      } catch (err) {
        const codigo = err?.code ?? err?.response?.status;
        // 404/410: el evento ya no existe (lo borraron a mano), cuenta como borrado.
        if (codigo === 404 || codigo === 410) borrados++;
        else {
          fallidos++;
          console.error(`No se pudo borrar el evento ${id}: ${err?.message ?? err}`);
        }
      }
    }
    console.log(`${borrados} ${fallidos}`);
  } finally {
    await app.close();
  }
}

const comandos = { token, 'borrar-eventos': borrarEventos };

if (!comandos[comando]) {
  console.error(`Comando desconocido: ${comando ?? '(ninguno)'}. Usar: token | borrar-eventos`);
  process.exit(1);
}

comandos[comando]().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
