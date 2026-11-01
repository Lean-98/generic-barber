/**
 * Genera docs/diccionario-datos.md a partir de prisma/schema.prisma (vía el
 * DMMF del cliente de Prisma) y de las restricciones CHECK de las migraciones.
 *
 * Uso: npm run docs:diccionario   (correr `prisma generate` antes si cambió el schema)
 */
import { Prisma } from '@prisma/client';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const RAIZ_REPO = join(__dirname, '..', '..', '..');
const MIGRACIONES = join(__dirname, '..', 'prisma', 'migrations');
const SALIDA = join(RAIZ_REPO, 'docs', 'diccionario-datos.md');

/** Qué guarda cada tabla, en una línea. Si se agrega un modelo, sumarlo acá. */
const DESCRIPCIONES: Record<string, string> = {
  Servicio: 'Servicios que ofrece el negocio (corte, barba, etc.), con precio, duración y costo de insumos.',
  ServicioHistorial: 'Historial de cambios de precio, duración y vigencia de cada servicio.',
  Turno: 'Reservas. Cada turno es de un cliente, tiene horario, estado y uno o más servicios (ver turno_detalles).',
  TurnoDetalle: 'Servicios incluidos en un turno, con el precio cobrado y el descuento aplicado (fidelización o personal).',
  Persona: 'Clientes (y también las personas detrás de los usuarios del panel).',
  UsuarioWeb: 'Usuarios que entran al panel de administración. Incluye datos de recuperación de contraseña y 2FA.',
  DispositivoConfiable: 'Dispositivos en los que un usuario eligió "recordar este dispositivo" al verificar el 2FA.',
  FormaPago: 'Formas de pago (efectivo, transferencia, tarjeta…).',
  Pago: 'Pagos de turnos. Un turno puede tener varios pagos parciales.',
  MovimientoCaja: 'Ingresos y egresos de caja: pagos de turnos, ventas de productos y egresos manuales.',
  CierreCaja: 'Cierres de caja diarios: totales esperados por forma de pago contra lo contado.',
  GoogleCalendarConfig: 'Vinculación con Google Calendar (token cifrado).',
  ConfiguracionNegocio: 'Configuración del negocio y de la web (marca, horarios, textos, fidelización). Una sola fila. Es pública: la lee la landing.',
  Categoria: 'Categorías de productos.',
  CategoriaServicio: 'Categorías de servicios.',
  Producto: 'Productos de la tienda, con stock opcional.',
  Curso: 'Cursos de barbería que se publican en la web.',
  CostosNegocio: 'Costos internos para el reporte de rentabilidad (gastos fijos y costo por hora). Una sola fila. No es pública.',
};

type Campo = Prisma.DMMF.Field;

function tipoDe(campo: Campo): string {
  const tipo = campo.kind === 'object' ? `→ ${campo.type}` : campo.type;
  return campo.isList ? `${tipo}[]` : tipo;
}

function defaultDe(campo: Campo): string {
  const d = campo.default as any;
  if (d === undefined) return '';
  if (d && typeof d === 'object' && 'name' in d) return `${d.name}()`;
  if (Array.isArray(d)) return `[${d.join(', ')}]`;
  return String(d);
}

function restriccionesCheck(): Map<string, string[]> {
  const porTabla = new Map<string, string[]>();
  const carpetas = readdirSync(MIGRACIONES, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const regex = /ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)"\s+CHECK\s*\(([\s\S]*?)\);/g;
  for (const carpeta of carpetas) {
    const sql = readFileSync(join(MIGRACIONES, carpeta, 'migration.sql'), 'utf8');
    for (const [, tabla, nombre, condicion] of sql.matchAll(regex)) {
      const lista = porTabla.get(tabla) ?? [];
      lista.push(`\`${nombre}\`: \`${condicion.replace(/\s+/g, ' ').trim()}\``);
      porTabla.set(tabla, lista);
    }
  }
  return porTabla;
}

function generar(): string {
  const modelos = Prisma.dmmf.datamodel.models;
  const checks = restriccionesCheck();
  const tablaDe = new Map(modelos.map((m) => [m.name, m.dbName ?? m.name]));

  const out: string[] = [];
  out.push('# Diccionario de datos');
  out.push('');
  out.push('> Archivo generado por `apps/backend/scripts/generar-diccionario-datos.ts` a partir de `schema.prisma` y de las migraciones. No editar a mano: correr `npm run docs:diccionario` en `apps/backend`.');
  out.push('');
  out.push('Motor: PostgreSQL. Cada sección es una tabla; "Campo" es el nombre en el código (Prisma) y "Columna" el nombre real en la base.');
  out.push('');
  out.push('## Tablas');
  out.push('');
  for (const m of modelos) {
    out.push(`- [\`${tablaDe.get(m.name)}\`](#${tablaDe.get(m.name)}) — ${DESCRIPCIONES[m.name] ?? ''}`);
  }

  for (const m of modelos) {
    const tabla = tablaDe.get(m.name)!;
    out.push('');
    out.push('---');
    out.push('');
    out.push(`## ${tabla}`);
    out.push('');
    out.push(`Modelo Prisma: \`${m.name}\`. ${DESCRIPCIONES[m.name] ?? ''}`);
    out.push('');
    out.push('| Campo | Columna | Tipo | Obligatorio | Default | Notas |');
    out.push('|---|---|---|---|---|---|');

    const fkPorCampo = new Map<string, string>();
    for (const rel of m.fields.filter((f) => f.kind === 'object' && f.relationFromFields?.length)) {
      rel.relationFromFields!.forEach((desde, i) => {
        fkPorCampo.set(desde, `FK → ${tablaDe.get(rel.type)}.${rel.relationToFields?.[i] ?? 'id'}`);
      });
    }

    for (const f of m.fields) {
      if (f.kind === 'object') continue; // las relaciones se listan abajo
      const notas: string[] = [];
      if (f.isId) notas.push('PK');
      if (f.isUnique) notas.push('UNIQUE');
      if (f.isUpdatedAt) notas.push('se actualiza sola');
      if (fkPorCampo.has(f.name)) notas.push(fkPorCampo.get(f.name)!);
      if (f.documentation) notas.push(f.documentation.replace(/\\n|\n/g, ' ').replace(/\|/g, '\\|'));
      out.push(`| ${f.name} | ${f.dbName ?? f.name} | ${tipoDe(f)} | ${f.isRequired ? 'Sí' : 'No'} | ${defaultDe(f)} | ${notas.join(', ')} |`);
    }

    const relaciones = m.fields.filter((f) => f.kind === 'object');
    if (relaciones.length > 0) {
      out.push('');
      out.push('**Relaciones:** ' + relaciones
        .map((r) => `\`${r.name}\` → ${tablaDe.get(r.type)} (${r.isList ? 'muchos' : r.isRequired ? 'uno' : 'uno, opcional'})`)
        .join(' · '));
    }
    const unicos = m.uniqueFields.filter((u) => u.length > 1);
    if (unicos.length > 0) {
      out.push('');
      out.push('**Únicos compuestos:** ' + unicos.map((u) => `(${u.join(', ')})`).join(' · '));
    }
    const checksTabla = checks.get(tabla);
    if (checksTabla) {
      out.push('');
      out.push('**Restricciones CHECK:**');
      out.push('');
      for (const c of checksTabla) out.push(`- ${c}`);
    }
  }
  out.push('');
  return out.join('\n');
}

writeFileSync(SALIDA, generar());
console.log(`Diccionario generado en ${SALIDA}`);
