"""
Genera docs/manual-panel.pdf (manual del día a día para el dueño).

    python3 docs/fuentes/manual-panel.py

Requiere reportlab (pip install reportlab). Para actualizar el manual, editá
el contenido de este archivo y volvé a correrlo.
"""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

SALIDA = Path(__file__).resolve().parents[1] / "manual-panel.pdf"

BORDO = colors.HexColor("#7A2E2E")
DORADO = colors.HexColor("#A9762F")
CREMA = colors.HexColor("#F6F1EA")
BORDE = colors.HexColor("#DDD2C4")
GRIS = colors.HexColor("#555555")

titulo = ParagraphStyle("titulo", fontName="Helvetica-Bold", fontSize=22, leading=26, textColor=BORDO, spaceAfter=4)
bajada = ParagraphStyle("bajada", fontName="Helvetica", fontSize=10.5, leading=14, textColor=GRIS, spaceAfter=10)
h2 = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=DORADO, spaceBefore=10, spaceAfter=5)
texto = ParagraphStyle("texto", fontName="Helvetica", fontSize=9.5, leading=13, spaceAfter=5)
celda = ParagraphStyle("celda", fontName="Helvetica", fontSize=8.8, leading=11.5)
celda_b = ParagraphStyle("celda_b", parent=celda, fontName="Helvetica-Bold")
celda_cab = ParagraphStyle("celda_cab", parent=celda, fontName="Helvetica-Bold", textColor=colors.white)
numero = ParagraphStyle("numero", parent=celda, fontName="Helvetica-Bold", textColor=colors.white)

ANCHO = A4[0] - 36 * mm
# Helvetica no tiene la flecha: va con la fuente Symbol (como en la versión anterior).
F = '<font name="Symbol">→</font>'


def p(t, estilo=texto):
    return Paragraph(t, estilo)


def tabla(cabecera, filas, anchos, primera_negrita=True):
    datos = [[p(c, celda_cab) for c in cabecera]]
    for fila in filas:
        datos.append([p(c, celda_b if (i == 0 and primera_negrita) else celda) for i, c in enumerate(fila)])
    t = Table(datos, colWidths=[ANCHO * a for a in anchos], repeatRows=1)
    estilo = [
        ("BACKGROUND", (0, 0), (-1, 0), BORDO),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(datos)):
        if i % 2 == 0:
            estilo.append(("BACKGROUND", (0, i), (-1, i), CREMA))
    t.setStyle(TableStyle(estilo))
    return t


def pasos(lista):
    datos = [[p(str(i), numero), p(t, celda)] for i, t in enumerate(lista, 1)]
    t = Table(datos, colWidths=[8 * mm, ANCHO - 8 * mm])
    estilo = [
        ("BACKGROUND", (0, 0), (0, -1), BORDO),
        ("BACKGROUND", (1, 0), (1, -1), CREMA),
        ("LINEBELOW", (0, 0), (-1, -1), 2, colors.white),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    t.setStyle(TableStyle(estilo))
    return t


def seccion(titulo_seccion, *contenido):
    """El título queda pegado al primer bloque (no queda solo al pie de una página)."""
    return [KeepTogether([p(titulo_seccion, h2), contenido[0]]), *contenido[1:]]


def pie(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GRIS)
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Manual del panel · página {doc.page}")
    canvas.restoreState()


historia = [
    p("Manual del panel", titulo),
    p("Cómo usar el día a día: turnos, caja, cierre, descuentos, cupones, cumpleaños, stock y reportes.", bajada),
]

historia += seccion(
    "1. Entrar al panel",
    pasos([
        "Ingresá con tu usuario y contraseña.",
        "Te llega un <b>código de 6 dígitos</b> por mail. Escribilo para terminar de entrar.",
        "Si tildás <b>Recordar este dispositivo por 30 días</b>, en esa compu o celular no te lo vuelve a pedir durante ese tiempo.",
        "Si te olvidaste la contraseña, usá <b>¿Olvidaste tu contraseña?</b> en el login: te llega un link por mail que vence en 30 minutos.",
    ]),
)

historia += seccion(
    "2. El menú",
    tabla(["Sección", "Para qué sirve"], [
        ["Dashboard", "Resumen del día: próximos turnos, últimos clientes, <b>cumpleaños de la semana</b> (con botón para saludar por WhatsApp) y avisos (por ejemplo, productos con poco stock)."],
        ["Turnos", "Agenda en vista <b>Lista</b> o <b>Calendario</b>, semana por semana. Alta de turnos y cambios de estado."],
        ["Clientes", "Alta, edición y búsqueda (por nombre, apellido, mail o teléfono). Historial de turnos de cada uno. Botón <b>Cumplen este mes</b>."],
        ["Caja", "Cobrar turnos, vender productos, registrar egresos y hacer el cierre del día."],
        ["Cupones", "Códigos de descuento para compartir por WhatsApp, y los cupones de cumpleaños."],
        ["Servicios / Productos / Cursos", "Lo que ofrecés: precios, duración, fotos, stock y lo que se muestra en la web."],
        ["Reportes", "Ingresos, turnos, servicios y clientes del período, rentabilidad, clientes para recontactar y beneficio de cumpleaños."],
        ["Marca", "Todo lo de la web: logo, colores, textos, horarios de atención, descuentos, beneficio de cumpleaños, reserva online y recordatorios."],
        ["Google Calendar", "Vincular tu calendario para que los turnos aparezcan ahí solos."],
    ], [0.27, 0.73]),
)

historia += seccion(
    "3. Turnos y sus estados",
    p("Los turnos avanzan solos según el reloj, así no tenés que tocar la pantalla entre cliente y cliente."),
    tabla(["Estado", "Qué significa", "Cómo llega a ese estado"], [
        ["Confirmado", "Turno reservado y vigente.", "Al reservarlo, desde la web o desde el panel."],
        ["En proceso", "El cliente está siendo atendido.", "Solo, cuando llega la hora de inicio (o con el botón <b>Iniciar</b>)."],
        ["Completado", f"Atención terminada. Se cobra en <b>Caja {F} Registrar Pago</b>.", "Solo, cuando termina el horario del turno (o con <b>Finalizar</b>)."],
        ["Cancelado", "No se hace. El horario queda libre en la web.", "Botón <b>Cancelar</b>, o el cliente desde el link del mail (aparece \"por el cliente\")."],
        ["No vino", "El cliente no se presentó. No cuenta como visita para la fidelización.", "Botón <b>No vino</b>: aparece cuando ya pasó la hora del turno, y también en los completados que nunca se cobraron."],
        ["Pendiente", "Solo turnos viejos, de antes de que los turnos nacieran confirmados.", "Se resuelve con <b>Confirmar</b>."],
    ], [0.17, 0.38, 0.45]),
    Spacer(1, 4),
    p("<b>Nuevo turno:</b> elegí el cliente (o crealo ahí mismo), los servicios y la fecha y hora. El sistema no deja reservar fuera del horario de atención ni encima de otro turno."),
    p(f"<b>Mails automáticos al cliente:</b> confirmación al reservar y recordatorio antes del turno. El recordatorio se puede apagar y sus horas se configuran en <b>Marca {F} Notificaciones</b>. Los dos traen un botón <b>Cancelar turno</b>: si el cliente lo usa, el horario se libera y te llega un mail con sus datos y un botón de WhatsApp."),
    p("<b>Aviso de turno nuevo:</b> cada vez que un cliente reserva desde la web, te llega un mail con sus datos, los servicios, cómo va a pagar, el cupón (si usó uno) y botones para ver la agenda y escribirle por WhatsApp."),
)

historia += seccion(
    "4. Caja",
    tabla(["Pestaña", "Qué hacés ahí"], [
        ["Movimientos", "Todo lo que entró y salió en el día elegido."],
        ["Registrar Pago", "Cobrar un turno completado: elegís el turno, la forma de pago y el monto. Acepta pagos parciales. Si el turno tiene descuento, ves el monto ya descontado y el motivo (fidelización, personal o cupón)."],
        ["Vender Producto", "Vender un producto en el local: elegís producto, cantidad y forma de pago. Descuenta el stock solo."],
        ["Registrar Egreso", "Plata que sale: compra de insumos, retiros, pagos varios."],
        ["Cierre de Caja", "Cerrar el día (ver abajo)."],
    ], [0.24, 0.76]),
)

historia += seccion(
    "5. Cierre de caja",
    pasos([
        f"Entrá a <b>Caja {F} Cierre de Caja</b> con la fecha del día y tocá <b>Iniciar Cierre</b>.",
        "El sistema calcula el <b>Total Esperado</b>, separado en efectivo, tarjeta, transferencia y otros.",
        "Contá la plata y cargá el <b>Total Real Contado</b>.",
        "Tocá <b>Confirmar Cierre</b>. Queda guardada la diferencia (si faltó o sobró) y el cierre pasa al historial.",
    ]),
)

historia += seccion(
    "6. Descuentos y fidelización",
    pasos([
        f"En <b>Marca {F} Descuentos</b> activá el <b>Programa de fidelización</b> y elegí cada cuántas visitas se da el descuento, el % de descuento y desde qué fecha se cuentan las visitas.",
        "En <b>Servicios</b>, marcá <b>Cuenta para el programa de fidelización</b> en los servicios que suman visitas (por ejemplo, el corte). Si no marcás ninguno, nadie suma visitas.",
        "Listo: cuando un turno se completa, el sistema cuenta las visitas del cliente y aplica el descuento solo en la que corresponde.",
        "<b>Descuento de personal:</b> se activa en el mismo lugar. Para que aplique, marcá al cliente como <b>Es empleado</b> en Clientes.",
    ]),
    Spacer(1, 4),
    p("<b>El cliente ve su progreso:</b> en los mails (\"Visita 3 de 5 del club\" o \"¡Este turno tiene 50% de descuento!\"), en la página de reservas al poner su email y en la página del Club. Los servicios que suman llevan la marca <b>Suma al club</b>."),
    p("<b>Los descuentos no se acumulan:</b> si en un turno hay más de uno (club, personal o cupón), se aplica el mayor."),
)

historia += seccion(
    "7. Cupones de descuento",
    pasos([
        "Entrá a <b>Cupones</b> y tocá <b>Nuevo cupón</b>.",
        "Cargá el <b>código</b> (por ejemplo HOY20), el <b>% de descuento</b> y, si querés, un <b>texto de la promo</b> para el mensaje.",
        "Elegí cuándo se puede usar: <b>Solo hoy</b>, <b>Este mes</b> o <b>Fechas a elección</b>. Cuenta el día en que el cliente reserva, no el del turno.",
        "Opcional: un <b>cupo</b> (\"los primeros 10\"). Vacío es sin límite.",
        "Guardá y tocá el botón de <b>WhatsApp</b> del cupón (o el de <b>copiar</b>): el mensaje sale listo, con un link que carga el código en la página de reservas.",
    ]),
    Spacer(1, 4),
    tabla(["Estado", "Qué significa"], [
        ["Activo", "Se puede usar ahora."],
        ["Programado", "Todavía no empezó su vigencia."],
        ["Pausado", "Lo pausaste vos con el botón de la cruz. Con el tilde se reactiva."],
        ["Agotado", "Se usó todo el cupo."],
        ["Vencido", "Terminó su vigencia."],
    ], [0.24, 0.76]),
    Spacer(1, 4),
    p("Cada cliente usa un mismo cupón <b>una vez</b> (se reconoce por el email); si cancela el turno, lo recupera. Un cupón se puede <b>borrar</b> solo si nunca se usó; si ya se usó, pausalo."),
)

historia += seccion(
    "8. Beneficio de cumpleaños",
    pasos([
        f"En <b>Marca {F} Beneficio de cumpleaños</b> activá <b>Mandar el cupón de cumpleaños</b>.",
        "Elegí el <b>% de descuento</b>, los <b>días antes del cumple</b> en que sale el mail, los <b>días de validez</b> y cuántos días antes de vencer se manda el <b>recordatorio</b> (0 = no se manda). Con 3 y 7 el cupón vale la semana del cumple; el panel te muestra un ejemplo con tus números.",
        "Listo: todos los días a las 10 el sistema le manda a cada cliente que cumple su <b>cupón personal</b> de regalo, con un botón para reservar con el descuento. Si no lo usa, le llega el recordatorio antes de que venza.",
    ]),
    Spacer(1, 4),
    p("<b>Quién lo recibe:</b> los clientes con email y cumpleaños cargados que aceptaron recibir promociones y que no son empleados. Uno por año, solo con su email y una sola vez."),
    p("<b>Para los que no tienen email:</b> en el Dashboard, <b>Cumpleaños de esta semana</b> tiene un botón <b>Saludar</b> que abre WhatsApp con el mensaje armado (con el código si tiene cupón)."),
    p(f"<b>Promociones:</b> el cliente elige al reservar si quiere recibirlas; lo podés cambiar en su ficha (<b>Recibe promociones</b>) y cada mail trae un link para darse de baja. Los cupones de cumpleaños se ven en <b>Cupones {F} Ver los de cumpleaños</b>."),
)

historia += seccion(
    "9. Reserva online",
    p(f"La web solo ofrece horarios que todavía no pasaron y que respetan la <b>anticipación mínima</b> de <b>Marca {F} Reserva online</b> (en minutos; por ejemplo, con 60, a las 10:00 el primer horario que se ve es el de las 11:00). Desde el panel podés cargar un turno a cualquier hora."),
    p("Al reservar, el cliente puede dejar su <b>cumpleaños</b> (opcional) y usar un <b>cupón</b>. Para reservar tiene que elegir cómo va a pagar: si no hay <b>formas de pago</b> cargadas, nadie puede reservar desde la web."),
)

historia += seccion(
    "10. Productos y stock",
    p("En <b>Productos</b>, cada producto puede tener <b>Stock</b> y un número para <b>Avisar con</b> pocas unidades. Si dejás el stock vacío, ese producto no se controla. Las ventas de <b>Caja " + F + " Vender Producto</b> lo descuentan solas; para reponer, editá el producto y cargá la cantidad nueva. Cuando algo llega al mínimo o se agota, aparece un aviso en el Dashboard, y en la tienda de la web se muestra \"Sin stock\"."),
)

historia += seccion(
    "11. Reportes",
    tabla(["Sección", "Qué muestra"], [
        ["Resumen y gráficos", "Ingresos, egresos, balance, turnos por estado, formas de pago, servicios más pedidos y mejores clientes del período elegido."],
        ["Rentabilidad", "Cuánto dejaron los servicios después de costos, el resultado del período, cuántos turnos por mes necesitás para cubrir los gastos fijos y cuánto se dejó de cobrar por la fidelización y por los cupones. Para que funcione, cargá tus gastos en el botón <b>Costos</b> y el costo de insumos de cada servicio en <b>Servicios</b>. Estos números no se ven en la web."],
        ["Clientes para recontactar", "<b>Dejaron de venir</b> (más de 30 a 180 días, a elección) y <b>Nunca vinieron</b>. Cada uno tiene un botón de WhatsApp con un mensaje ya escrito invitándolo a reservar. No aparecen los que ya tienen un turno reservado."],
        ["Beneficio de cumpleaños", "Cupones de cumpleaños mandados en el período, cuántos se usaron, lo facturado con esos turnos y el descuento otorgado."],
    ], [0.27, 0.73]),
)

historia += seccion(
    "12. Mensajes que te puede mostrar el sistema",
    tabla(["Mensaje", "Qué significa y qué hacer"], [
        ["El negocio está cerrado ese día", f"El día elegido figura como cerrado en <b>Marca {F} Horarios de atención</b>. Elegí otro día o cambiá el horario."],
        ["El horario elegido está fuera de la atención del negocio", "El turno empieza o termina fuera de tu horario (por ejemplo, en el corte del mediodía). Probá otro horario o un servicio más corto."],
        ["Ya existe un turno en ese horario", "Se pisa con otro turno. Elegí otro horario."],
        ["Ese horario se acaba de ocupar, elegí otro horario", "Alguien reservó ese mismo horario segundos antes. Elegí otro."],
        ["No se puede editar / pagar: el turno está …", "La acción no corresponde a ese estado. Por ejemplo, solo se cobran turnos completados y solo se editan los confirmados."],
        ["No hay stock suficiente de …", "Querés vender más unidades de las que hay. Revisá el stock en Productos o vendé menos."],
        ["El teléfono debe tener entre 8 y 15 números…", "Cargá el número con código de área, sin el 0 ni el 15. Ej: 351 1234567."],
        ["La duración mínima / máxima de un servicio…", "La duración tiene que estar entre 5 y 180 minutos."],
        ["El horario del … es inválido: el cierre debe ser posterior a la apertura", "En Horarios de atención, la hora de cierre quedó antes que la de apertura. Corregila."],
        ["Uno o más servicios no existen o no están vigentes", "Se eligió un servicio dado de baja. Actualizá la página y elegí uno vigente."],
        ["El descuento de personal no está activo", f"Activalo en <b>Marca {F} Descuentos</b>, o no lo apliques en ese turno."],
        ["Ya existe un cupón con el código …", "Cada código tiene que ser único. Elegí otro (por ejemplo, agregale el mes: HOY20NOV)."],
        ["Este cupón ya se usó en turnos: pausalo en vez de borrarlo", "Un cupón usado no se puede borrar, para no perder de dónde vino el descuento. Pausalo con la cruz."],
        ["La fecha de fin tiene que ser igual o posterior a la de inicio", "En el cupón, el \"Hasta\" quedó antes que el \"Desde\". Corregilo."],
    ], [0.40, 0.60]),
    Spacer(1, 6),
    p("<b>¿Te devolvió al login sin avisar?</b> Se venció la sesión. Volvé a entrar y seguí donde estabas. Si algo no funciona y no aparece en esta lista, sacale una captura de pantalla al mensaje y mandala a soporte."),
)

doc = SimpleDocTemplate(
    str(SALIDA), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=18 * mm,
    title="Manual del panel", author="SkillRdy",
)
doc.build(historia, onFirstPage=pie, onLaterPages=pie)
print(f"Generado: {SALIDA}")
