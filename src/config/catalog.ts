import type { ServiceCategory, ServiceItem } from '@/domain/types';

/**
 * Catálogo de MakiYa.
 * - Solo las categorías con status "activo" son contratables (MVP: armado + instalaciones sencillas).
 * - Las categorías "futuro" existen en la arquitectura (escalera de confianza) pero NO se pueden contratar.
 * - Los precios son VALORES DE DEMOSTRACIÓN editables desde Admin › Servicios. No son precios de mercado.
 */

export const CATEGORIES: ServiceCategory[] = [
  {
    id: 'armado',
    name: 'Armado de muebles',
    line: 'arreglos',
    status: 'activo',
    description: 'Camas, escritorios, roperos prefabricados y muebles de almacenamiento de armado estándar.',
    icon: 'Sofa',
    trustStep: 1,
  },
  {
    id: 'instalacion',
    name: 'Instalaciones sencillas',
    line: 'arreglos',
    status: 'activo',
    description: 'Soportes de TV, repisas, accesorios de baño y otros accesorios de fijación a pared.',
    icon: 'Ruler',
    trustStep: 1,
  },
  // ───── Futuras: visibles como «Próximamente», no contratables ─────
  { id: 'gasfiteria', name: 'Gasfitería', line: 'arreglos', status: 'futuro', description: 'Grifería, fugas visibles e inodoros.', icon: 'Droplets', trustStep: 3 },
  { id: 'electricidad', name: 'Electricidad', line: 'arreglos', status: 'futuro', description: 'Tomacorrientes, interruptores y luminarias, aguas abajo del tablero.', icon: 'Zap', trustStep: 4 },
  { id: 'laptops', name: 'Reparación de laptops', line: 'daily', status: 'futuro', description: 'Diagnóstico y reparación de laptops.', icon: 'Laptop', trustStep: 4 },
  { id: 'televisores', name: 'Reparación de televisores', line: 'daily', status: 'futuro', description: 'Diagnóstico y reparación de televisores.', icon: 'Tv', trustStep: 4 },
  { id: 'consolas', name: 'Reparación de consolas', line: 'daily', status: 'futuro', description: 'Mantenimiento y reparación de consolas.', icon: 'Gamepad2', trustStep: 4 },
  { id: 'limpieza', name: 'Limpieza', line: 'reset', status: 'futuro', description: 'Limpieza por paquete de resultado.', icon: 'Sparkles', trustStep: 2 },
  { id: 'reset', name: 'MakiYa Reset', line: 'reset', status: 'futuro', description: 'Orden y limpieza por resultado con checklist y fotos.', icon: 'RotateCcw', trustStep: 2 },
  { id: 'organizacion', name: 'Organización del hogar', line: 'reset', status: 'futuro', description: 'Organización de espacios.', icon: 'LayoutGrid', trustStep: 2 },
  { id: 'daily', name: 'Otras soluciones Daily', line: 'daily', status: 'futuro', description: 'Nuevas soluciones cotidianas.', icon: 'CalendarHeart', trustStep: 5 },
];

const FURNITURE_TEST = {
  test: 'Nivel, apertura de puertas y cajones, prueba de carga; anclaje antivuelco en muebles altos.',
  criterion: 'Nivelado, sin juego y anclado.',
};
const WALL_TEST = {
  test: 'Nivel y prueba de tracción/carga frente al cliente.',
  criterion: 'Nivelado, firme y sin juego.',
};

export const ITEMS: ServiceItem[] = [
  {
    id: 'armado-cama',
    categoryId: 'armado',
    name: 'Armado de cama',
    unit: 'cama',
    price: 70,
    durationMin: 90,
    includes: ['Armado según manual del fabricante', 'Ajuste final de tornillería', 'Retiro de embalajes al punto de basura del edificio'],
    excludes: ['Muebles a medida o modificaciones', 'Cortes o perforaciones estructurales', 'Traslado entre ambientes o pisos'],
    closingTest: { ...FURNITURE_TEST, checklist: ['Estructura nivelada', 'Sin juego al presionar esquinas', 'Tarima/somier asentado', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['cama', 'camarote', 'litera', 'tarima', 'box', 'somier', 'cabecera'],
  },
  {
    id: 'armado-escritorio',
    categoryId: 'armado',
    name: 'Armado de escritorio',
    unit: 'escritorio',
    price: 60,
    durationMin: 75,
    includes: ['Armado según manual', 'Instalación de cajones y correderas', 'Retiro de embalajes'],
    excludes: ['Escritorios a medida', 'Pasacables o perforaciones adicionales', 'Instalación eléctrica'],
    closingTest: { ...FURNITURE_TEST, checklist: ['Superficie nivelada', 'Cajones abren y cierran sin roce', 'Sin juego lateral', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['escritorio', 'mesa de trabajo', 'mesa de estudio', 'mesa', 'home office'],
  },
  {
    id: 'armado-ropero',
    categoryId: 'armado',
    name: 'Armado de ropero prefabricado',
    unit: 'ropero',
    price: 95,
    durationMin: 150,
    includes: ['Armado según manual', 'Puertas y bisagras reguladas', 'Anclaje antivuelco a pared', 'Retiro de embalajes'],
    excludes: ['Roperos empotrados o a medida', 'Cortes de piezas', 'Muebles de más de 2,4 m de alto'],
    closingTest: { ...FURNITURE_TEST, checklist: ['Puertas alineadas', 'Bisagras reguladas sin roce', 'Anclaje antivuelco instalado', 'Mueble a plomo', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['ropero', 'closet', 'clóset', 'armario', 'guardarropa'],
  },
  {
    id: 'armado-almacenamiento',
    categoryId: 'armado',
    name: 'Armado de mueble de almacenamiento',
    unit: 'mueble',
    price: 55,
    durationMin: 60,
    includes: ['Cómodas, zapateras, estantes, libreros o veladores', 'Armado según manual', 'Anclaje si supera 1 m de alto'],
    excludes: ['Muebles a medida', 'Cortes de piezas'],
    closingTest: { ...FURNITURE_TEST, checklist: ['Mueble nivelado', 'Cajones/puertas sin roce', 'Anclado si supera 1 m', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['cómoda', 'comoda', 'zapatera', 'estante', 'librero', 'velador', 'mesa de noche', 'cajonera', 'organizador', 'mueble de tv', 'rack', 'aparador', 'mueble'],
  },
  {
    id: 'inst-tv',
    categoryId: 'instalacion',
    name: 'Instalación de soporte de TV',
    unit: 'soporte',
    price: 65,
    durationMin: 60,
    includes: ['Instalación de soporte fijo o inclinable (hasta 65")', 'Fijación con tarugos adecuados al muro', 'Montaje del televisor y nivelado'],
    excludes: ['Soportes articulados de más de 65"', 'Ocultar cables dentro del muro', 'Instalación de tomacorrientes', 'Muros de drywall sin refuerzo'],
    closingTest: { test: 'Nivel y prueba de tracción del soporte antes de montar la TV.', criterion: 'Nivelado, firme y sin juego.', checklist: ['Soporte a nivel', 'Prueba de tracción superada', 'TV asegurada al soporte', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['tv', 'televisor', 'tele', 'soporte', 'pantalla', 'smart tv', 'rack de tv'],
  },
  {
    id: 'inst-repisa',
    categoryId: 'instalacion',
    name: 'Instalación de repisa',
    unit: 'repisa',
    price: 35,
    durationMin: 30,
    includes: ['Repisa de hasta 1,2 m', 'Fijación con tarugos adecuados', 'Nivelado'],
    excludes: ['Repisas a medida o cortes', 'Cargas mayores a 25 kg'],
    closingTest: { ...WALL_TEST, checklist: ['Repisa a nivel', 'Prueba de carga superada', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['repisa', 'repisas', 'estante flotante', 'anaquel', 'balda'],
  },
  {
    id: 'inst-bano',
    categoryId: 'instalacion',
    name: 'Instalación de accesorio de baño',
    unit: 'accesorio',
    price: 30,
    durationMin: 30,
    includes: ['Toallero, portapapel, jabonera, espejo o barra', 'Perforación en mayólica con broca adecuada', 'Fijación y nivelado'],
    excludes: ['Grifería, duchas o termas', 'Conexiones de agua', 'Cortes de mayólica'],
    closingTest: { ...WALL_TEST, checklist: ['Accesorio a nivel', 'Firme sin juego', 'Sin mayólicas dañadas', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['toallero', 'portapapel', 'porta papel', 'jabonera', 'espejo', 'barra de baño', 'accesorio de baño', 'baño', 'cortina de baño', 'barral'],
  },
  {
    id: 'inst-accesorio',
    categoryId: 'instalacion',
    name: 'Instalación de accesorio sencillo',
    unit: 'accesorio',
    price: 30,
    durationMin: 30,
    includes: ['Cuadros, percheros, rieles de cortina, ganchos o espejos de pared', 'Fijación y nivelado'],
    excludes: ['Instalaciones eléctricas', 'Cortinas motorizadas', 'Trabajos en altura mayor a 3 m'],
    closingTest: { ...WALL_TEST, checklist: ['Accesorio a nivel', 'Prueba de tracción superada', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['cuadro', 'perchero', 'cortina', 'riel', 'barral de cortina', 'gancho', 'espejo de pared', 'persiana'],
  },
];

export const DISTRICTS = [
  'San Miguel',
  'Pueblo Libre',
  'Magdalena del Mar',
  'Jesús María',
  'Lince',
  'Miraflores',
  'Surquillo',
  'San Isidro',
];

export const WINDOW_LABEL = {
  manana: 'Mañana (8:00–11:00)',
  mediodia: 'Mediodía (11:00–15:00)',
  tarde: 'Tarde (15:00–19:00)',
} as const;

export const WINDOW_SHORT = { manana: '8–11 h', mediodia: '11–15 h', tarde: '15–19 h' } as const;

export const WEEKDAY_LABEL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;
