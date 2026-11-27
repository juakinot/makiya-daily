/**
 * Escalera de confianza (informe cap. 1, 7 y 8; prompt §5).
 * El hogar es la puerta de entrada; cada escalón exige más confianza que el anterior porque aumenta
 * la asimetría de información (bien de confianza) o el riesgo dentro del hogar.
 * Los criterios para habilitar cada escalón son PROPUESTAS configurables (Settings.ladder).
 */
export interface LadderStep {
  step: 1 | 2 | 3 | 4 | 5;
  name: string;
  categories: string[];
  why: string;
  requires: string;
}

export const TRUST_LADDER: LadderStep[] = [
  {
    step: 1,
    name: 'Arreglos sencillos',
    categories: ['armado', 'instalacion'],
    why: 'Bajo riesgo, alcance estandarizable y precio cerrado. El cliente comprueba el resultado por sí mismo con la prueba de cierre.',
    requires: 'Disponible hoy.',
  },
  {
    step: 2,
    name: 'Orden y limpieza (MakiYa Reset)',
    categories: ['limpieza', 'reset', 'organizacion'],
    why: 'El Maki pasa más tiempo en el hogar y cerca de objetos personales: requiere la confianza ganada en el escalón 1.',
    requires: 'Volumen de servicios sin retrabajo, seguridad percibida alta y Makis evaluados en la nueva especialidad.',
  },
  {
    step: 3,
    name: 'Gasfitería menor',
    categories: ['gasfiteria'],
    why: 'El cliente ya no puede juzgar el diagnóstico: entra el presupuesto verificado por un evaluador.',
    requires: 'Además: presupuestos aprobados y precio justo validados en escalones anteriores.',
  },
  {
    step: 4,
    name: 'Electricidad menor',
    categories: ['electricidad'],
    why: 'Riesgo de seguridad: alcance acotado aguas abajo del tablero y Makis con certificación.',
    requires: 'Además: Makis certificados y protocolo de seguridad específico.',
  },
  {
    step: 5,
    name: 'Reparación de equipos y nuevas soluciones Daily',
    categories: ['laptops', 'televisores', 'consolas', 'daily'],
    why: 'Bien de confianza puro: diagnóstico técnico, piezas y, en laptops, datos personales del cliente. Máxima asimetría de información.',
    requires: 'Además: protocolo de custodia de equipos y de datos, y una red de técnicos especializados.',
  },
];
