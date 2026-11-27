# Fase 0 — Auditoría

Fuentes revisadas:

1. **Prompt maestro** (prioridad 1): decisiones estratégicas y visuales aprobadas.
2. **Informe consolidado** `MakiYa_Trabajo_Final_v_final.docx` (prioridad 2): 12 capítulos, 35 tablas y 7 figuras. Se leyó completo.
3. **Logo seleccionado** (prioridad 3): imagen de 1936 × 1549 px con dos manos que se encuentran.
4. **Paleta de referencia** (imagen adjunta).
5. **Mockup aprobado** (prioridad 4): **no se recibió ningún mockup.** La distribución de pantallas sale del recorrido del informe (Tabla 15 y Figura 4) y del sistema visual definido aquí.
6. **Repositorio** (prioridad 5): la carpeta estaba **vacía**. Se usa el stack indicado: React, TypeScript, Vite, Tailwind y Vitest; Supabase/PostgreSQL queda preparado como adaptador.

---

## 1. Resumen estratégico

MakiYa es una **plataforma de gestión con intermediación** para necesidades cotidianas del hogar. No es un directorio. Su valor está en reducir la **asimetría de información** que existe en un *bien de confianza*: quien entra al hogar, lo que se cobra y si el trabajo quedó bien (Darby y Karni; Dulleck y Kerschbamer, citados en el informe).

| Pregunta del cliente | Mecanismo | Momento |
|---|---|---|
| ¿En quién confío para abrirle la puerta? | **Maki Probado** (4 capas de verificación + prueba de oficio ≥ 14/20) y **Visita Segura** (ficha y código de 4 dígitos) | Antes |
| ¿Me cobran lo justo y nada más? | **Presupuesto Verificado** (precio cerrado del tarifario o revisión de un evaluador) + **cero adicionales sin aprobación escrita** | Durante |
| ¿Quedó bien? | **Pago tras Conformidad** (prueba de cierre con evidencia) + **garantía de 30 días** sobre la mano de obra | Después |

Los tres mecanismos forman el **sistema Cero Sorpresas**. Según el QFD del informe, concentran el 73,3 % de la prioridad técnica. Alrededor se ubican funciones de soporte: orientación asistida, recomendación de 1 a 3 Makis, Perfil del Hogar y Mi Maki.

**Problemas jerarquizados (Tabla 5 del informe):** B «no sé en quién confiar» y D «no quiero que me engañen» son centrales. A «no sé qué le pasa a mi hogar» es un medio. C «no tengo tiempo» es un beneficio y no la razón de compra. Por eso la IA **habilita** la experiencia, pero no es la propuesta de valor.

**North Star:** servicios completados con conformidad del cliente y sin retrabajo durante los 30 días siguientes.

**Modelo económico:** comisión incluida en el precio. El informe adopta 25 % en el primer servicio con un cliente y 20 % en las repeticiones con Mi Maki. El prompt pide que **no sea definitiva** y que se pueda configurar entre 20 % y 25 %. El pago al Maki se registra después de la conformidad y la liquidación se hace por lotes.

---

## 2. Matriz de requisitos

Leyenda de origen: **P** = prompt, **I** = informe (con capítulo o tabla). Prioridad: **M** = obligatorio en el MVP, **D** = deseable, **F** = futuro (solo en la arquitectura).

| ID | Requisito | Origen | Prioridad | Módulo |
|---|---|---|---|---|
| R01 | Landing con propuesta Cero Sorpresas y catálogo del MVP | P8A, I5.1 | M | Público |
| R02 | Registro e inicio de sesión por rol (cliente, Maki, admin) | P8 | M | Auth |
| R03 | Catálogo con «incluye / no incluye», precio cerrado de demo y prueba de cierre | P7, P9, I7.4, T21 | M | Catálogo |
| R04 | Solo armado de muebles e instalaciones sencillas son contratables | P7 | M | Catálogo |
| R05 | Categorías futuras visibles como «próximamente», sin poder contratarse | P7 | M | Catálogo |
| R06 | Solicitud en lenguaje común, con texto y fotos, y consentimiento | P8A, I7.5, Ley 29733 | M | Cliente |
| R07 | Interpretación, clasificación, información faltante (máx. 2 preguntas) y resumen | P10, I8.2 | M | IA |
| R08 | El cliente confirma la clasificación | I8.2 | M | IA |
| R09 | Si la confianza es baja o el pedido está fuera del alcance, pasa a revisión humana | P10, I8.2 | M | IA/Admin |
| R10 | Orientación honesta: «esto lo puedes resolver tú» y «esto no lo hacemos» | I3.1, I7.3 | D | IA |
| R11 | Propuesta con qué es, qué incluye, qué no incluye y cuánto cuesta | I7.8 | M | Cliente |
| R12 | Recomendación de 1 a 3 Makis con las razones a la vista; el cliente elige | P11, I8.2, T19 | M | Motor |
| R13 | Filtros: especialidad, habilitación, zona, disponibilidad y sin suspensión | P11, I8.2 | M | Motor |
| R14 | Ordenamiento ponderado (calidad > evaluaciones ≈ experiencia > precio) con afinidad Mi Maki y cupo para Makis nuevos | I8.2, T19 | M | Motor |
| R15 | El Maki acepta o rechaza; no hay asignación automática sin consentimiento | P11 | M | Maki |
| R16 | Aprobación escrita del alcance y el precio antes de agendar | I6.1, T12 | M | Cliente |
| R17 | Visita Segura: ficha del Maki y código de 4 dígitos que el Maki debe ingresar | I8.4 | M | Cliente/Maki |
| R18 | Adicionales solo con aprobación explícita del cliente y registro de materiales | P9, I4.1 E | M | Cliente/Maki |
| R19 | Evidencia de cierre: fotos y checklist de la prueba de cierre por tipo de trabajo | P8B, T21 | M | Maki |
| R20 | Conformidad del cliente con evaluación (seguridad, precio justo, calidad y facilidad) | I5.3, P15 | M | Cliente |
| R21 | Pago **simulado** registrado solo después de la conformidad | P12 | M | Pagos |
| R22 | Garantía de 30 días de mano de obra; incidencias con plazos | I8.5 | M | Cliente/Admin |
| R23 | Historial, Perfil del Hogar, Mi Maki y repetir un servicio | P8A, I7.5 | M | Cliente |
| R24 | Registro del Maki con perfil, especialidades, experiencia, zona y disponibilidad | P8B | M | Maki |
| R25 | Evaluación y habilitación en 4 capas (identidad, antecedentes, referencias y prueba de oficio ≥ 14/20) | I8.4 | M | Admin |
| R26 | Panel de ingresos del Maki: precio, comisión, neto y liquidaciones | P12 | M | Maki |
| R27 | Reputación con evaluaciones ajustadas por número de trabajos | I8.2 | M | Maki |
| R28 | Dashboard admin, gestión de clientes, Makis, solicitudes y asignaciones | P8C | M | Admin |
| R29 | Revisión de presupuestos (evaluador) para trabajos no estandarizados | I6.1 vía 2 | M | Admin |
| R30 | Configuración de servicios, precios y comisiones sin tocar código | P12, P17 | M | Admin |
| R31 | Analítica: North Star y métricas de cliente, Maki y negocio, marcadas como simuladas | P15, I11 | M | Analítica |
| R32 | Los tres entornos comparten datos y reglas | P8 | M | Persistencia |
| R33 | Modo demostración sin servicios externos y con datos identificables | P13 | M | Persistencia |
| R34 | No hay secretos en el frontend; la IA real va detrás de un backend | P13 | M | IA |
| R35 | Permisos por rol en la interfaz, los servicios y la base de datos (RLS) | P13 | M | Auth |
| R36 | Cancelaciones, errores e incidencias en los flujos | P14 F2 | M | Todos |
| R37 | Solo trabajos programados, con al menos 24 h de anticipación; sin gas, tablero eléctrico ni emergencias | I5.4, I8.5 | M | Reglas |
| R38 | Fotos solo de la zona de trabajo y nunca de personas | I8.4 | M | UX |
| R39 | Libro de Reclamaciones virtual | I5.4 | D | Futuro (enlace) |
| R40 | Mobile-first y adaptado a escritorio | P4 | M | UX |

---

## 3. Decisiones detectadas (aprobadas en el informe o el prompt)

1. **Modelo:** plataforma de gestión con intermediación. Makis independientes; MakiYa controla la selección, el precio, el cobro y el cierre (I6.1).
2. **Dos vías de precio:** la vía 1 usa el tarifario cerrado; la vía 2 usa un presupuesto revisado por el evaluador (I7.2).
3. **El cliente decide entre 1 y 3 Makis** con criterios a la vista (T12).
4. **Cero adicionales sin aprobación escrita** (I4.3).
5. **Pago a MakiYa al firmar la conformidad**; MakiYa liquida al Maki (T12).
6. **Garantía** de 30 días sobre la mano de obra y visita de corrección en ≤ 72 h. No cubre materiales del cliente, mal uso ni terceros. Pagar fuera de la plataforma anula la garantía (T22).
7. **La IA propone y no decide.** No diagnostica. «Maki» no es el nombre de la IA (I7.3).
8. **El nombre «Maki»** se reserva para el prestador.
9. **Métricas sin vanidad**: no se miden descargas ni seguidores (I11).
10. **Restricciones de seguridad**: sin gas, sin tablero eléctrico, sin emergencias y solo trabajos programados.
11. **Logo de dos manos** obligatorio e inalterable (P3).

## 4. Hipótesis (no se convierten en hechos)

| ID | Hipótesis | Cómo la trata el prototipo |
|---|---|---|
| H1 | Los clientes contratan cuando reciben un Maki y un precio claros (≥ 40 %) | Métrica de conversión (solicitud → reserva) con datos demo |
| H2 | El cliente se siente seguro con ficha, código y fotocheck (≥ 4/5) | Pregunta «me sentí seguro» en la conformidad |
| H3 | Presupuesto verificado → aprobación ≥ 70 % y «precio justo» ≥ 4 | Tasa de aprobación de presupuestos y pregunta de precio justo |
| H4 | Los Makis aceptan tarifario y comisión (≥ 75 % activos) | Retención de Makis; comisión configurable |
| H5 | Margen de contribución > S/ 0 por servicio | Margen calculado con supuestos configurables |
| F4, F5, F9 | Dolores del proceso actual, pérdida de la red y valor de la comprensión | Hipótesis de diseño; no se presentan como datos |
| Segmento | Jóvenes de 23 a 32 años que se mudan o equipan su hogar | El registro no restringe por edad ni perfil |
| Precios | Tarifario | **Valores de demostración** editables, sin precios reales |
| Costos | Garantía 5 %, medios de pago 2 %, adquisición S/ 8, evaluador S/ 8 | Supuestos del informe (T28), editables y etiquetados |

Todas las métricas del prototipo muestran la etiqueta **«Datos de demostración — no son resultados experimentales»**.

## 5. Contradicciones y resolución

| # | Contradicción | Resolución adoptada |
|---|---|---|
| C1 | **Catálogo inicial.** El informe (T17) incluye gasfitería menor, electricidad menor y un piloto de Reset. El prompt limita el MVP a armado de muebles e instalaciones sencillas. | Manda el prompt. Gasfitería, electricidad, Reset y los demás quedan en el modelo de datos con `status: "futuro"`, visibles como «Próximamente» y **no contratables**. La IA detecta estas solicitudes y ofrece registrar el interés. |
| C2 | **Segmento.** El informe usa S1 (20–35 años: estudiantes foráneos y jóvenes en alquiler). El prompt usa 23–32 años y «personas que se mudan o equipan su hogar». | Se usa el del prompt para el mensaje y la proto-persona. El producto no filtra por edad. |
| C3 | **Colores.** La ficha técnica del informe (T22) indica marrón, terracota y crema. El primer logo recibido era rosa + turquesa. | **Resuelto con el Brand Kit (iteración 2):** isotipo coral #F0785A + turquesa #20A995, paleta petróleo, turquesa, menta, blanco, coral y grafito, y tipografía Manrope + Inter. Ver `docs/05-precios-y-catalogo.md` §4. |
| C4 | **Comisión.** El informe adopta 25 % / 20 % escalonada. El prompt dice «no establezcas una comisión definitiva». | Se configura desde el admin. Por defecto: 25 % en el primer servicio y 20 % con Mi Maki, con la etiqueta «valor de referencia del informe, no definitivo». Si se sale del rango de 20–25 % se muestra una advertencia, sin bloquear. |
| C5 | **Naturaleza del MVP.** El informe dice que el MVP opera manualmente por WhatsApp y que la IA se reemplaza por personas (Wizard of Oz). El prompt pide una plataforma funcional con arquitectura preparada para IA. | El prototipo representa el **producto objetivo / V1** en modo demostración. La «IA» es un **clasificador por reglas** etiquetado como simulado, detrás de un adaptador `AIProvider`. La revisión humana (admin) reproduce el Wizard of Oz. |
| C6 | **Vía 2 (diagnóstico con tarifa descontable).** Pensada para gasfitería y electricidad, que quedan fuera del MVP del prompt. | En armado e instalación se implementa como **presupuesto a medida**: el pedido que no encaja en el tarifario pasa al evaluador (admin), que fija líneas y precio contra el tarifario antes de mostrarlo al cliente. La tarifa de diagnóstico queda configurable (S/ 0 por defecto en las categorías del MVP). |
| C7 | **«MakiYa Daily» y las líneas «Arreglos / Reset».** | «Daily» es el concepto paraguas de la marca. «Arreglos» es la línea activa y «Reset» es futura. |
| C8 | **Precios.** El prompt pedía no inventar precios reales; en la iteración 2 el equipo pidió precios alineados al mercado. | Tarifario alineado a una **referencia de mercado en Lima con fuentes** (27-11-2026), con un tope de +10 % aplicado en Admin. Ver `docs/05-precios-y-catalogo.md`. |
| C9 | **Selección del Maki y consentimiento.** El informe dice que el cliente elige; el prompt dice que el Maki acepta o rechaza. | Se combinan: el cliente elige → el Maki recibe la oferta → acepta o rechaza. Si rechaza, el cliente elige otra opción o el admin reasigna. |
| C10 | **Mockup aprobado** citado en el prompt, pero no adjunto. | Se documenta y se diseña según el recorrido del informe. |

## 6. Recursos de marca revisados

- **Isotipo:** dos manos que se encuentran (rosa abajo a la izquierda y turquesa arriba a la derecha). Se vectorizó con *potrace* desde el PNG oficial, sin redibujar: `public/brand/isotipo.svg`. El original está en `docs/logo-referencia-original.png`.
- **Colores finales (Brand Kit, iteración 2):** coral `#F0785A` y turquesa `#20A995`. El primer archivo recibido usaba rosa `#EA1B6B` y `#17AAA0`, que no eran los colores finales.
- **Icono de app:** isotipo centrado sobre un cuadrado blanco con esquinas redondeadas (`public/brand/app-icon.svg`).
- **Logotipo:** «MakiYa» en Manrope 800, verde petróleo (blanco en la versión negativa). Es un componente separado del isotipo.
- **Slogan:** «Una mano para tu día.», también como componente separado.

## 7. Arquitectura propuesta (resumen; detalle en `01-blueprint.md`)

```
Presentación (React + Tailwind)  ← features/{public,client,maki,admin}, components/ui
        │ usa
Store de aplicación (React context) ← expone acciones con el actor actual
        │ invoca
Servicios de dominio (puros, testeables) ← services/*: requestService, makiService, adminService
   │            │              │               │
Dominio      Motor de       Adaptador IA     Analítica
(estados,    asignación     (AIProvider:     (metrics.ts)
reglas,      (matching/)    simulado │ remoto)
pricing)
        │
Persistencia: Repository → LocalStorageRepository (demo) | SupabaseRepository (preparado, schema + RLS)
Auth: AuthProvider → DemoAuth (local) | Supabase Auth (preparado)
```

## 8. Estructura de carpetas

```
.
├── docs/                    Documentación de las fases 0–3 y la entrega
├── public/brand/            isotipo.svg, app-icon.svg
├── supabase/schema.sql      Modelo relacional + políticas RLS por rol
├── src/
│   ├── brand/               Isotipo, Logotipo, Slogan, Lockup
│   ├── config/              catálogo, ajustes por defecto (comisiones, pesos, supuestos)
│   ├── domain/              tipos, máquina de estados, reglas Cero Sorpresas, economía
│   ├── ai/                  AIProvider, proveedor simulado por reglas, proveedor remoto
│   ├── matching/            motor de asignación (filtros + puntaje + razones)
│   ├── analytics/           cálculo de métricas
│   ├── persistence/         Repository, LocalStorage, seed de demo
│   ├── auth/                sesión, permisos por rol
│   ├── services/            casos de uso (crear solicitud, aceptar, evidencia, pagar…)
│   ├── store/               AppProvider (estado + acciones + sincronización entre pestañas)
│   ├── components/          ui/ y layout/
│   ├── features/            public/, client/, maki/, admin/
│   └── test/                pruebas de integración del recorrido obligatorio
└── README.md                Instalación, ejecución, usuarios demo, alcance real vs simulado
```

## 9. Plan de desarrollo

| Fase | Entregable | Criterio de salida |
|---|---|---|
| 1 Blueprint | `docs/01-blueprint.md` | Actores, módulos, estados y entidades definidos |
| 2 Flujos | `docs/02-user-flows.md` | Recorridos normales y alternativos para los 3 roles |
| 3 UX/UI | `docs/03-ux-ui.md`, tokens en Tailwind, componentes base | Identidad intacta y contraste AA en texto |
| 4–6 Entornos | Rutas `/app`, `/maki`, `/admin` | Cada módulo de la sección 8 del prompt navegable y operativo |
| 7 IA y motor | `src/ai`, `src/matching` | Pruebas unitarias en verde |
| 8 Integración | `src/test/flujo-obligatorio.test.ts` | Los 12 pasos del recorrido obligatorio pasan |
| 9 Testing | Vitest + revisión manual en móvil y escritorio | Sin errores de TypeScript ni de build |
| 10 Entrega | `README.md`, `docs/04-entrega.md` | Instalación, usuarios demo, alcance real vs simulado y limitaciones |
