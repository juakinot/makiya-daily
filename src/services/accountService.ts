import { DISTRICTS } from '@/config/catalog';
import { DomainError } from '@/domain/stateMachine';
import type { Availability, Database, HomeProfile, ID, MakiProfile, Role, User } from '@/domain/types';
import { nowISO, uid } from '@/lib/utils';

export interface RegisterInput {
  role: Exclude<Role, 'admin'>;
  name: string;
  email: string;
  phone: string;
  district: string;
  passwordHash: string;
  consent: boolean;
  maki?: {
    specialties: ID[];
    experienceYears: number;
    districts: string[];
    availability: Availability;
    bio: string;
    references: { name: string; phone: string }[];
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateRegister(db: Database, i: RegisterInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (i.name.trim().length < 3) e.name = 'Escribe tu nombre completo.';
  if (!EMAIL_RE.test(i.email.trim())) e.email = 'Correo no válido.';
  else if (db.users.some((u) => u.email.toLowerCase() === i.email.trim().toLowerCase())) e.email = 'Ya existe una cuenta con este correo.';
  if (!/^[\d\s+]{9,15}$/.test(i.phone.trim())) e.phone = 'Teléfono no válido (9 dígitos).';
  if (!DISTRICTS.includes(i.district)) e.district = 'Elige un distrito.';
  if (!i.consent) e.consent = 'Debes aceptar el tratamiento de datos (Ley N.° 29733).';
  if (i.role === 'maki') {
    const m = i.maki;
    if (!m || m.specialties.length === 0) e.specialties = 'Elige al menos una especialidad.';
    if (!m || m.districts.length === 0) e.districts = 'Elige al menos un distrito de atención.';
    if (!m || !(m.experienceYears >= 0 && m.experienceYears <= 50)) e.experienceYears = 'Años de experiencia no válidos.';
    if (!m || Object.values(m.availability).every((w) => w.length === 0)) e.availability = 'Marca al menos una franja disponible.';
    if (!m || m.references.filter((r) => r.name.trim() && r.phone.trim()).length < 2) e.references = 'Necesitamos dos referencias de clientes anteriores.';
  }
  return e;
}

export function registerUser(db: Database, i: RegisterInput): User {
  const errors = validateRegister(db, i);
  if (Object.keys(errors).length) throw new DomainError(Object.values(errors)[0]);
  const now = nowISO();
  const user: User = {
    id: uid('u'),
    role: i.role,
    name: i.name.trim(),
    email: i.email.trim().toLowerCase(),
    phone: i.phone.trim(),
    district: i.district,
    createdAt: now,
    passwordHash: i.passwordHash,
    dataConsentAt: now,
  };
  db.users.push(user);
  if (i.role === 'client') {
    db.homeProfiles.push({ clientId: user.id, district: i.district, addressRef: '', homeType: 'departamento', notes: '', favoriteMakiIds: [] });
  } else {
    const m = i.maki!;
    db.makiProfiles.push({
      userId: user.id,
      bio: m.bio.trim(),
      specialties: m.specialties,
      experienceYears: m.experienceYears,
      districts: m.districts,
      availability: m.availability,
      status: 'postulante',
      verification: { identity: false, background: false, references: false, tradeTestScore: null },
      references: m.references,
      paused: false,
      joinedAt: now,
    });
  }
  return user;
}

export function updateHomeProfile(db: Database, actor: User, patch: Partial<Omit<HomeProfile, 'clientId' | 'favoriteMakiIds'>>) {
  if (actor.role !== 'client') throw new DomainError('Solo los clientes tienen Perfil del Hogar.');
  const h = db.homeProfiles.find((x) => x.clientId === actor.id);
  if (!h) throw new DomainError('Perfil no encontrado.');
  if (patch.district && !DISTRICTS.includes(patch.district)) throw new DomainError('Distrito no válido.');
  Object.assign(h, patch);
  return h;
}

export function updateMakiProfile(db: Database, actor: User, patch: Partial<Pick<MakiProfile, 'bio' | 'districts' | 'availability' | 'paused' | 'specialties' | 'experienceYears'>>) {
  if (actor.role !== 'maki') throw new DomainError('Solo los Makis tienen perfil profesional.');
  const mp = db.makiProfiles.find((m) => m.userId === actor.id);
  if (!mp) throw new DomainError('Perfil no encontrado.');
  if (patch.districts && patch.districts.length === 0) throw new DomainError('Mantén al menos un distrito de atención.');
  if (patch.specialties) {
    if (patch.specialties.length === 0) throw new DomainError('Mantén al menos una especialidad.');
    const added = patch.specialties.filter((s) => !mp.specialties.includes(s));
    if (added.length && mp.status === 'habilitado') {
      // Una especialidad nueva requiere nueva evaluación: no se habilita automáticamente.
      throw new DomainError('Para sumar una especialidad nueva, MakiYa debe evaluarla. Escríbenos para agendar la prueba de oficio.');
    }
  }
  Object.assign(mp, patch);
  return mp;
}
