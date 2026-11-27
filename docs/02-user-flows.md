# Fase 2 — User flows

## Cliente

### Flujo principal (vía 1, precio cerrado)
1. **Landing** → «Pedir ayuda» → registro (nombre, correo, teléfono, distrito y consentimiento de datos) o ingreso.
2. **Asistente** (3 pasos, meta ≤ 3 minutos):
   1. «Cuéntanos qué necesitas» en texto libre, con hasta 3 fotos de la zona de trabajo y aceptación del consentimiento de fotos.
   2. **Orientación:** el asistente muestra lo que entendió (categoría, servicios, cantidades y resumen), hace como máximo 2 preguntas y el cliente confirma o corrige.
   3. **Cuándo y dónde:** fecha (≥ 24 h), franja (mañana, mediodía o tarde) y distrito.
3. **Propuesta:** qué es, qué incluye, qué no incluye, cuánto cuesta, garantía y prueba de cierre. Debajo, de 1 a 3 Makis con sus razones.
4. **Aprobación escrita:** casilla «Apruebo el alcance y el precio de S/ X; sé que no se cobrará nada adicional sin mi aprobación» → elige un Maki → se envía la oferta.
5. **Seguimiento:** línea de tiempo (enviada → Maki aceptó → visita → evidencia → conformidad → pagado).
6. **Visita Segura:** ficha del Maki (foto, verificación, prueba de oficio y trabajos) y **código de 4 dígitos** que se dicta al Maki.
7. **Adicionales:** si el Maki propone uno, el cliente ve un aviso y aprueba o rechaza.
8. **Evidencia:** fotos y checklist de la prueba de cierre.
9. **Conformidad:** firma (nombre) y evaluaciones de calidad, seguridad, precio justo y facilidad.
10. **Pago simulado** registrado con su detalle → comprobante de demo → garantía de 30 días activa.
11. **Historial** → «Repetir con mi Maki» o marcarlo como Mi Maki.

### Alternativos y excepciones
| Situación | Comportamiento |
|---|---|
| Descripción ambigua (confianza baja) | El asistente lo dice, hace preguntas y, si aún es baja, «Un especialista revisará tu pedido» → `en_revision` |
| Pedido fuera del MVP (gasfitería, electricidad, limpieza) | «Aún no ofrecemos esto» + registrar interés; no se crea una solicitud contratable |
| Pedido prohibido (gas, tablero, emergencia) | «Por seguridad, esto no lo hacemos» y una recomendación general |
| Autoservicio (apretar un tornillo) | «Esto probablemente lo puedes resolver tú» + pasos; el cliente igual puede continuar |
| Mueble a medida o fuera del tarifario | `en_revision` → el evaluador fija el presupuesto → el cliente lo ve y aprueba o rechaza |
| No hay Makis compatibles | Estado vacío: «Aún no hay Makis disponibles en tu franja» → cambiar la fecha o la franja; el admin ve la alerta |
| El Maki rechaza | Aviso; la propuesta vuelve con las otras opciones |
| El cliente cancela antes de la visita | Confirmación + motivo → `cancelada`, sin cargo (demo) |
| El código no coincide (lado Maki) | El Maki no puede iniciar; mensaje «No abras la puerta si el código no coincide» |
| El cliente rechaza un adicional | El trabajo sigue con el alcance original |
| La evidencia no es satisfactoria | «Reportar un problema» → incidencia → `con_incidencia` → el admin coordina la corrección |
| Falla dentro de 30 días | «Usar garantía» → incidencia de garantía con SLA de 72 h |
| Error de formulario | Validación en línea con mensajes en español |

## Maki

1. **Registro:** datos, especialidades (solo las categorías activas), años de experiencia, distritos, disponibilidad semanal y dos referencias → estado `postulante`.
2. **Evaluación:** ve su checklist de 4 capas (identidad, antecedentes, referencias y prueba de oficio). Hasta que el admin lo habilite, no recibe solicitudes.
3. **Panel de solicitudes:** ofertas con resumen, alcance, fecha, distrito, **precio, comisión y su ingreso neto**. Puede **aceptar** o **rechazar** (con motivo).
4. **Trabajo confirmado:** dirección de referencia, Perfil del Hogar y checklist de cierre.
5. **Iniciar visita:** ingresa el código de 4 dígitos que le dicta el cliente.
6. **Durante:** proponer un adicional o material (descripción, monto y boleta) → espera la aprobación del cliente.
7. **Cierre:** fotos de después + checklist → enviar a conformidad.
8. **Ingresos:** pendientes de liquidar, liquidaciones, comisión por servicio y aviso de comisión menor con Mi Maki.
9. **Reputación e historial:** rating bayesiano, retrabajo y comentarios.
10. **Perfil:** editar zonas y disponibilidad; pausar la recepción de solicitudes.

Excepciones: oferta expirada o tomada por otro (no aplica, porque es una oferta a la vez); conflicto de agenda al aceptar (se bloquea con un mensaje); suspensión (se ve un banner y no hay ofertas); incidencia asignada (debe programar la corrección).

## Administrador

1. **Dashboard:** North Star, alertas (en revisión, sin Makis, incidencias abiertas con SLA, postulantes) y embudo.
2. **Solicitudes:** filtros por estado; detalle con interpretación de la IA, candidatos del motor y razones.
   - **Revisión de presupuesto** (vía 2): agrega líneas del tarifario o líneas a medida y verifica → `propuesta_lista`.
   - **Reclasificar** si la IA se equivocó.
   - **Reasignar / sugerir Maki** cuando el Maki rechaza o no hay candidatos (siempre requiere la aceptación del Maki).
   - Cancelar con motivo.
3. **Makis:** listado, ficha y **evaluación**: marca las 4 capas, registra el puntaje de la prueba de oficio (≥ 14/20) → habilitar o rechazar. Puede suspender o reactivar.
4. **Clientes:** listado, servicios y Perfil del Hogar.
5. **Incidencias:** abiertas con SLA (24 h de respuesta), asignar corrección, resolver (procede o no procede) y marcar retrabajo.
6. **Garantías:** servicios con garantía vigente o vencida.
7. **Liquidaciones:** pagos pendientes por Maki → «Liquidar» (simulado).
8. **Servicios:** editar precio de demo, duración, incluye/no incluye y activar o desactivar. Las categorías futuras no se pueden activar desde aquí sin cambiar su estado de categoría (doble control).
9. **Configuración:** comisiones, pesos del motor, umbral de confianza de la IA y supuestos económicos.
10. **Analítica:** métricas de cliente, Maki y negocio, y rentabilidad por categoría, todas con la etiqueta «Datos de demostración».

## Recorrido obligatorio (Fase 8)

| # | Paso | Dónde se verifica |
|---|---|---|
| 1 | El cliente crea la solicitud | Cliente › Asistente |
| 2 | La solicitud queda registrada | Cliente › Inicio / Repositorio |
| 3 | El administrador la ve | Admin › Solicitudes |
| 4 | El sistema identifica Makis compatibles | Propuesta / Admin › detalle |
| 5 | El Maki recibe la solicitud | Maki › Solicitudes |
| 6 | El Maki acepta | Maki › Solicitudes |
| 7 | El cliente recibe la confirmación | Cliente › detalle (código de visita) |
| 8 | El Maki ejecuta el servicio | Maki › Trabajo (código → en curso) |
| 9 | El Maki adjunta la evidencia | Maki › Trabajo |
| 10 | El cliente confirma la conformidad | Cliente › detalle |
| 11 | Se registra el pago simulado | Cliente › comprobante / Maki › Ingresos |
| 12 | Se actualizan las métricas y el historial | Admin › Analítica / Cliente › Historial |

Automatizado en `src/test/flujo-obligatorio.test.ts`.
