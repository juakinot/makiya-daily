import type { MarketReference, ServiceCategory, ServiceItem } from '@/domain/types';

/**
 * Catálogo de MakiYa.
 * - Solo las categorías con status "activo" son contratables (escalón 1: armado + instalaciones sencillas).
 * - Las categorías "futuro" existen en la arquitectura (escalera de confianza) pero NO se pueden contratar.
 * - Precios del prototipo alineados a una referencia de mercado en Lima (investigación de escritorio del
 *   27-11-2026, ver docs/05-precios-y-catalogo.md). Son editables desde Admin › Servicios y respetan el
 *   tope de +10 % sobre la referencia definido en el informe.
 */

export const CATEGORIES: ServiceCategory[] = [
  {
    id: 'armado',
    name: 'Armado de muebles',
    line: 'arreglos',
    status: 'activo',
    description: 'Camas, escritorios, roperos, comedores y muebles de almacenamiento de armado estándar.',
    icon: 'Sofa',
    trustStep: 1,
  },
  {
    id: 'instalacion',
    name: 'Instalaciones sencillas',
    line: 'arreglos',
    status: 'activo',
    description: 'Soportes de TV, repisas, cortinas, accesorios de baño y otros accesorios de pared.',
    icon: 'Ruler',
    trustStep: 1,
  },
  // ───── Futuras: visibles como «Próximamente», no contratables ─────
  { id: 'limpieza', name: 'Limpieza', line: 'reset', status: 'futuro', description: 'Limpieza por paquete de resultado.', icon: 'Sparkles', trustStep: 2 },
  { id: 'reset', name: 'MakiYa Reset', line: 'reset', status: 'futuro', description: 'Orden y limpieza por resultado con checklist y fotos.', icon: 'RotateCcw', trustStep: 2 },
  { id: 'organizacion', name: 'Organización del hogar', line: 'reset', status: 'futuro', description: 'Organización de espacios.', icon: 'LayoutGrid', trustStep: 2 },
  { id: 'gasfiteria', name: 'Gasfitería', line: 'arreglos', status: 'futuro', description: 'Grifería, fugas visibles e inodoros.', icon: 'Droplets', trustStep: 3 },
  { id: 'electricidad', name: 'Electricidad', line: 'arreglos', status: 'futuro', description: 'Tomacorrientes, interruptores y luminarias, aguas abajo del tablero.', icon: 'Zap', trustStep: 4 },
  { id: 'laptops', name: 'Reparación de laptops', line: 'daily', status: 'futuro', description: 'Diagnóstico y reparación de laptops.', icon: 'Laptop', trustStep: 5 },
  { id: 'televisores', name: 'Reparación de televisores', line: 'daily', status: 'futuro', description: 'Diagnóstico y reparación de televisores.', icon: 'Tv', trustStep: 5 },
  { id: 'consolas', name: 'Reparación de consolas', line: 'daily', status: 'futuro', description: 'Mantenimiento y reparación de consolas.', icon: 'Gamepad2', trustStep: 5 },
  { id: 'daily', name: 'Otras soluciones Daily', line: 'daily', status: 'futuro', description: 'Nuevas soluciones cotidianas.', icon: 'CalendarHeart', trustStep: 5 },
];

/* ───────── Fuentes de referencia de mercado (consultadas el 27-11-2026) ───────── */
const CHECKED = '2026-11-27';
const SOD_R1 = { name: 'Sodimac Perú · Armado de muebles rango 1', price: 'S/ 34,90', url: 'https://www.sodimac.com.pe/sodimac-pe/content/armado-muebles-rango-1', note: 'Escritorios, roperos hasta 3 puertas, veladores, estantes' };
const SOD_R2 = { name: 'Sodimac Perú · Armado de muebles rango 2', price: 'S/ 69,90', url: 'https://www.sodimac.com.pe/sodimac-pe/servicios/armado-de-muebles-rango2', note: 'Roperos hasta 6 puertas, racks, juegos de comedor' };
const SOD_R3 = { name: 'Sodimac Perú · Armado de muebles rango 3', price: 'S/ 99,90', url: 'https://www.sodimac.com.pe/sodimac-pe/servicios/armado-de-muebles-rango3', note: 'Muebles de mayor complejidad' };
const INDEP_ARMADO = { name: 'Técnicos independientes en Lima (anuncios)', price: 'S/ 30–75', url: 'https://www.armadosmelamina.com/', note: 'Ropero 2–3 puertas ~S/ 35; 4–5 puertas ~S/ 45; sin garantía ni verificación' };

function ref(low: number, high: number, sources: MarketReference['sources'], limited = false): MarketReference {
  return { low, high, sources, checkedAt: CHECKED, limited };
}

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
    price: 55,
    durationMin: 90,
    includes: ['Cama, camarote o box tarima según manual del fabricante', 'Ajuste final de tornillería', 'Retiro de embalajes al punto de basura del edificio'],
    excludes: ['Muebles a medida o modificaciones', 'Cortes o perforaciones estructurales', 'Traslado entre ambientes o pisos'],
    closingTest: { ...FURNITURE_TEST, checklist: ['Estructura nivelada', 'Sin juego al presionar esquinas', 'Tarima/somier asentado', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['cama', 'camarote', 'litera', 'tarima', 'box', 'somier', 'cabecera'],
    marketRef: ref(35, 70, [SOD_R1, SOD_R2, INDEP_ARMADO]),
    trustRationale: 'Es lo primero que se arma al mudarse. Resultado visible y comprobable en minutos.',
  },
  {
    id: 'armado-escritorio',
    categoryId: 'armado',
    name: 'Armado de escritorio',
    unit: 'escritorio',
    price: 45,
    durationMin: 75,
    includes: ['Escritorio con o sin cajones según manual', 'Instalación de cajones y correderas', 'Retiro de embalajes'],
    excludes: ['Escritorios a medida', 'Pasacables o perforaciones adicionales', 'Instalación eléctrica'],
    closingTest: { ...FURNITURE_TEST, checklist: ['Superficie nivelada', 'Cajones abren y cierran sin roce', 'Sin juego lateral', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['escritorio', 'mesa de trabajo', 'mesa de estudio', 'home office'],
    marketRef: ref(35, 50, [SOD_R1, { name: 'Sodimac Perú · Armado de escritorio más silla', price: 'S/ 49,90', url: 'https://www.sodimac.com.pe/sodimac-pe/content/armado-escritorio-mas-silla' }, INDEP_ARMADO]),
    trustRationale: 'Clave para el profesional joven que trabaja desde casa. Bajo riesgo y precio cerrado.',
  },
  {
    id: 'armado-ropero',
    categoryId: 'armado',
    name: 'Armado de ropero (hasta 3 puertas)',
    unit: 'ropero',
    price: 49,
    durationMin: 120,
    includes: ['Armado según manual', 'Puertas y bisagras reguladas', 'Anclaje antivuelco a pared', 'Retiro de embalajes'],
    excludes: ['Roperos empotrados o a medida', 'Cortes de piezas', 'Muebles de más de 2,4 m de alto'],
    closingTest: { ...FURNITURE_TEST, checklist: ['Puertas alineadas', 'Bisagras reguladas sin roce', 'Anclaje antivuelco instalado', 'Mueble a plomo', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['ropero', 'closet', 'clóset', 'armario', 'guardarropa'],
    marketRef: ref(35, 70, [SOD_R1, INDEP_ARMADO]),
    trustRationale: 'El anclaje antivuelco y la prueba de puertas hacen visible la calidad del trabajo.',
  },
  {
    id: 'armado-ropero-grande',
    categoryId: 'armado',
    name: 'Armado de ropero grande (4 a 6 puertas)',
    unit: 'ropero',
    price: 75,
    durationMin: 180,
    includes: ['Roperos de 4 a 6 puertas o con corredizas, según manual', 'Puertas y correderas reguladas', 'Anclaje antivuelco a pared', 'Retiro de embalajes'],
    excludes: ['Roperos empotrados o a medida', 'Cortes de piezas', 'Muebles de más de 2,4 m de alto'],
    closingTest: { ...FURNITURE_TEST, checklist: ['Puertas alineadas', 'Correderas o bisagras sin roce', 'Anclaje antivuelco instalado', 'Mueble a plomo', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['ropero grande', 'closet grande'],
    marketRef: ref(45, 100, [SOD_R2, SOD_R3, INDEP_ARMADO]),
    trustRationale: 'Mueble pesado y caro: el cliente valora que lo haga alguien probado y con garantía.',
  },
  {
    id: 'armado-almacenamiento',
    categoryId: 'armado',
    name: 'Armado de mueble pequeño',
    unit: 'mueble',
    price: 35,
    durationMin: 60,
    includes: ['Cómodas, zapateras, estantes, libreros o veladores', 'Armado según manual', 'Anclaje si supera 1 m de alto'],
    excludes: ['Muebles a medida', 'Cortes de piezas'],
    closingTest: { ...FURNITURE_TEST, checklist: ['Mueble nivelado', 'Cajones/puertas sin roce', 'Anclado si supera 1 m', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['cómoda', 'comoda', 'zapatera', 'estante', 'librero', 'velador', 'mesa de noche', 'cajonera', 'organizador', 'mueble de tv', 'rack', 'aparador', 'mueble'],
    marketRef: ref(30, 40, [SOD_R1, INDEP_ARMADO]),
    trustRationale: 'Servicio de entrada económico: permite probar MakiYa con poco riesgo.',
  },
  {
    id: 'armado-comedor',
    categoryId: 'armado',
    name: 'Armado de juego de comedor',
    unit: 'juego',
    price: 65,
    durationMin: 120,
    includes: ['Mesa y hasta 6 sillas según manual', 'Nivelación de patas', 'Retiro de embalajes'],
    excludes: ['Muebles a medida', 'Vidrios o tableros de piedra a medida'],
    closingTest: { ...FURNITURE_TEST, checklist: ['Mesa nivelada sin cojeo', 'Sillas firmes sin juego', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['comedor', 'mesa de comedor', 'juego de comedor', 'sillas'],
    marketRef: ref(55, 70, [SOD_R2]),
    trustRationale: 'Parte del equipamiento típico del primer departamento.',
  },
  {
    id: 'inst-tv',
    categoryId: 'instalacion',
    name: 'Instalación de soporte de TV',
    unit: 'soporte',
    price: 55,
    durationMin: 60,
    includes: ['Soporte fijo o inclinable (hasta 65")', 'Fijación con tarugos adecuados al muro', 'Montaje del televisor y nivelado'],
    excludes: ['Soportes articulados de más de 65"', 'Ocultar cables dentro del muro', 'Instalación de tomacorrientes', 'Muros de drywall sin refuerzo'],
    closingTest: { test: 'Nivel y prueba de tracción del soporte antes de montar la TV.', criterion: 'Nivelado, firme y sin juego.', checklist: ['Soporte a nivel', 'Prueba de tracción superada', 'TV asegurada al soporte', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['tv', 'televisor', 'tele', 'soporte', 'pantalla', 'smart tv', 'rack de tv'],
    marketRef: ref(50, 60, [{ name: 'Sodimac Perú · Instalación de soporte de TV', price: 'S/ 55 c/u', url: 'https://www.sodimac.com.pe/sodimac-pe/content/a40018/Instalacion-de-Soporte-de-TV', note: 'Solo en radio urbano de tiendas con servicio; recargos por distancia' }]),
    trustRationale: 'El temor a que «se caiga la TV» se resuelve con la prueba de tracción frente al cliente.',
  },
  {
    id: 'inst-repisa',
    categoryId: 'instalacion',
    name: 'Instalación de repisa',
    unit: 'repisa',
    price: 30,
    durationMin: 30,
    includes: ['Repisa de hasta 1,2 m', 'Fijación con tarugos adecuados', 'Nivelado'],
    excludes: ['Repisas a medida o cortes', 'Cargas mayores a 25 kg'],
    closingTest: { ...WALL_TEST, checklist: ['Repisa a nivel', 'Prueba de carga superada', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['repisa', 'repisas', 'estante flotante', 'anaquel', 'balda'],
    marketRef: ref(30, 35, [{ name: 'Sodimac Perú · Instalación de repisas', price: 'S/ 30 c/u', url: 'https://www.sodimac.com.pe/sodimac-pe/content/a40017/Instalacion-de-Repisas', note: 'Recargos por distancia' }]),
    trustRationale: 'Trabajo rápido y frecuente al mudarse; buena primera experiencia.',
  },
  {
    id: 'inst-cortina',
    categoryId: 'instalacion',
    name: 'Instalación de barra o riel de cortina',
    unit: 'ventana',
    price: 40,
    durationMin: 45,
    includes: ['Barra, riel o cortina roller manual de hasta 2,5 m', 'Fijación a pared o techo y nivelado', 'Colgado de la cortina'],
    excludes: ['Cortinas motorizadas', 'Confección o medidas a medida', 'Trabajos a más de 3 m de altura'],
    closingTest: { ...WALL_TEST, checklist: ['Barra o riel a nivel', 'La cortina corre sin trabarse', 'Fijación firme', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['cortina', 'cortinas', 'rieles de cortina', 'riel', 'barra de cortina', 'barral', 'persiana', 'roller'],
    marketRef: ref(40, 50, [{ name: 'Sophie Store · Servicio de instalación de cortinas', price: 'S/ 45', url: 'https://sophiestore.pe/riel-para-cortinas/' }, { name: 'CortinasHD · Instalación de cortina roller (referencia superior)', price: 'S/ 79,90', url: 'https://cortinashd.com/cortinas-persianas/servicio-tecnico-instalacion-cortinas-rollers/', note: 'Roller por unidad; no es comparable con una barra simple' }], true),
    trustRationale: 'Privacidad desde el primer día en el nuevo depa: necesidad inmediata del segmento.',
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
    keywords: ['toallero', 'portapapel', 'porta papel', 'jabonera', 'espejo', 'barra de baño', 'accesorio de baño', 'accesorios de baño', 'baño'],
    marketRef: ref(30, 45, [{ name: 'Sodimac Perú · Instalación de accesorios de baño', price: 'S/ 44,90', url: 'https://www.sodimac.com.pe/sodimac-pe/servicios/instalacion-aparatos-sanitarios', note: 'Servicio por instalación; puede incluir varios accesorios' }], true),
    trustRationale: 'Perforar mayólica sin romperla requiere herramienta y oficio: alto valor percibido.',
  },
  {
    id: 'inst-accesorio',
    categoryId: 'instalacion',
    name: 'Colgado de cuadro, espejo o perchero',
    unit: 'pieza',
    price: 25,
    durationMin: 20,
    includes: ['Cuadros, espejos de pared, percheros o ganchos', 'Fijación adecuada al muro', 'Nivelado'],
    excludes: ['Piezas de más de 20 kg', 'Instalaciones eléctricas', 'Trabajos a más de 3 m de altura'],
    closingTest: { ...WALL_TEST, checklist: ['Pieza a nivel', 'Prueba de tracción superada', 'Zona de trabajo limpia'] },
    active: true,
    keywords: ['cuadro', 'cuadros', 'perchero', 'gancho', 'espejo de pared'],
    marketRef: ref(25, 35, [{ name: 'Técnicos independientes en Lima (anuncios)', price: 'desde S/ 30', url: 'https://www.armadosmelamina.com/', note: 'Tarifa mínima por visita' }], true),
    trustRationale: 'Complemento barato que se suma a otros servicios de la misma visita.',
  },
];

/** Paquetes sugeridos para el segmento inicial (personas que se mudan o equipan su hogar). Sin descuento: suman los precios del tarifario. */
export const PACKS = [
  {
    id: 'pack-mudanza',
    name: 'Pack Mudanza esencial',
    description: 'Lo básico para dormir, guardar tu ropa y ver tele desde la primera noche.',
    text: 'Armar una cama y un ropero de 3 puertas, instalar 2 repisas y un soporte de TV',
    lines: [{ itemId: 'armado-cama', qty: 1 }, { itemId: 'armado-ropero', qty: 1 }, { itemId: 'inst-repisa', qty: 2 }, { itemId: 'inst-tv', qty: 1 }],
  },
  {
    id: 'pack-home-office',
    name: 'Pack Home office',
    description: 'Tu espacio de trabajo listo: escritorio, repisas y un cuadro.',
    text: 'Armar un escritorio, instalar 2 repisas y colgar un cuadro',
    lines: [{ itemId: 'armado-escritorio', qty: 1 }, { itemId: 'inst-repisa', qty: 2 }, { itemId: 'inst-accesorio', qty: 1 }],
  },
  {
    id: 'pack-bano-ventanas',
    name: 'Pack Baño y ventanas',
    description: 'Privacidad y orden: accesorios de baño y cortinas.',
    text: 'Instalar 2 accesorios de baño y 2 rieles de cortina',
    lines: [{ itemId: 'inst-bano', qty: 2 }, { itemId: 'inst-cortina', qty: 2 }],
  },
] as const;

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
