-- ═══════════════════════════════════════════════════════════════════════════
-- MakiYa — modelo relacional para Supabase/PostgreSQL (PREPARADO, no conectado)
-- Espejo de src/domain/types.ts. Políticas RLS equivalentes a src/auth/permissions.ts.
-- Las transiciones de estado y los pagos deben ejecutarse en funciones del servidor
-- (RPC / Edge Functions) que reutilicen las reglas de src/services/*.
-- ═══════════════════════════════════════════════════════════════════════════

create type app_role as enum ('client', 'maki', 'admin');
create type maki_status as enum ('postulante', 'en_evaluacion', 'habilitado', 'rechazado', 'suspendido');
create type category_status as enum ('activo', 'futuro');
create type request_status as enum ('en_revision','propuesta_lista','esperando_maki','confirmada','en_curso','evidencia_enviada','con_incidencia','completada','cancelada');
create type time_window as enum ('manana', 'mediodia', 'tarde');
create type price_route as enum ('tarifario', 'evaluador');
create type offer_status as enum ('pendiente', 'aceptada', 'rechazada');
create type extra_status as enum ('propuesto', 'aprobado', 'rechazado');
create type incident_type as enum ('conformidad', 'garantia', 'seguridad', 'cobro', 'otro');
create type incident_status as enum ('abierta', 'en_correccion', 'resuelta', 'no_procede');

-- Perfil de usuario (1:1 con auth.users)
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role app_role not null default 'client',
  name text not null,
  phone text not null,
  district text not null,
  data_consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table home_profiles (
  client_id uuid primary key references profiles (id) on delete cascade,
  district text not null,
  address_ref text not null default '',
  home_type text not null default 'departamento',
  floor text,
  notes text not null default ''
);

create table favorite_makis (
  client_id uuid references profiles (id) on delete cascade,
  maki_id uuid references profiles (id) on delete cascade,
  primary key (client_id, maki_id)
);

create table service_categories (
  id text primary key,
  name text not null,
  line text not null,
  status category_status not null default 'futuro',
  description text not null,
  trust_step smallint not null check (trust_step between 1 and 5)
);

create table service_items (
  id text primary key,
  category_id text not null references service_categories (id),
  name text not null,
  unit text not null,
  price numeric(10,2) not null check (price > 0),           -- valor de DEMOSTRACIÓN
  duration_min int not null check (duration_min >= 15),
  includes text[] not null,
  excludes text[] not null,
  closing_test jsonb not null,
  active boolean not null default true
);

create table maki_profiles (
  user_id uuid primary key references profiles (id) on delete cascade,
  bio text not null default '',
  specialties text[] not null,
  experience_years int not null check (experience_years >= 0),
  districts text[] not null,
  availability jsonb not null,               -- { "1": ["manana","tarde"], ... }
  status maki_status not null default 'postulante',
  identity_ok boolean not null default false,
  background_ok boolean not null default false,
  references_ok boolean not null default false,
  trade_test_score smallint check (trade_test_score between 0 and 20),
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  paused boolean not null default false,
  joined_at timestamptz not null default now(),
  -- Habilitar exige las 4 capas y la prueba de oficio ≥ 14
  constraint enabled_requires_4_layers check (
    status <> 'habilitado' or (identity_ok and background_ok and references_ok and trade_test_score >= 14)
  )
);

create table service_requests (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  client_id uuid not null references profiles (id),
  status request_status not null,
  description text not null,
  photo_paths text[] not null default '{}',   -- Storage privado (bucket «evidencias»)
  photo_consent boolean not null default false,
  district text not null,
  address_ref text not null default '',
  preferred_date date not null,
  time_window time_window not null,
  interpretation jsonb not null,               -- salida del AIProvider (incluye provider_id e is_simulated)
  classification_confirmed boolean not null,
  category_id text references service_categories (id),
  route price_route not null,
  quote_verified_by uuid references profiles (id),
  quote_verified_at timestamptz,
  proposal_at timestamptz,
  selected_maki_id uuid references profiles (id),
  scope_approved_at timestamptz,
  approved_total numeric(10,2),
  assigned_maki_id uuid references profiles (id),
  visit_code char(4),
  started_visit_at timestamptz,
  evidence jsonb,
  conformity jsonb,
  warranty_until timestamptz,
  cancellation jsonb,
  started_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint photos_need_consent check (cardinality(photo_paths) = 0 or photo_consent),
  -- Cero Sorpresas: nada se ofrece ni confirma sin aprobación escrita
  constraint offer_needs_scope_approval check (status not in ('esperando_maki','confirmada','en_curso','evidencia_enviada','completada') or scope_approved_at is not null),
  constraint completion_needs_conformity check (status <> 'completada' or conformity is not null)
);

create table quote_lines (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests (id) on delete cascade,
  item_id text references service_items (id),   -- null = línea a medida (evaluador)
  description text not null,
  qty int not null check (qty between 1 and 10),
  unit_price numeric(10,2) not null check (unit_price > 0)
);

create table offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests (id) on delete cascade,
  maki_id uuid not null references profiles (id),
  status offer_status not null default 'pendiente',
  reason text,
  sent_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index one_pending_offer_per_request on offers (request_id) where status = 'pendiente';

create table extras (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests (id) on delete cascade,
  kind text not null check (kind in ('trabajo', 'material')),
  description text not null,
  amount numeric(10,2) not null check (amount > 0),
  receipt text,
  status extra_status not null default 'propuesto',
  proposed_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint material_needs_receipt check (kind <> 'material' or receipt is not null)
);

create table settlements (
  id uuid primary key default gen_random_uuid(),
  maki_id uuid not null references profiles (id),
  total numeric(10,2) not null,
  method text not null default 'simulado',
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique not null references service_requests (id),
  client_id uuid not null references profiles (id),
  maki_id uuid not null references profiles (id),
  amount numeric(10,2) not null,
  commission_rate numeric(5,4) not null,
  commission numeric(10,2) not null,
  maki_net numeric(10,2) not null,
  is_repeat boolean not null,
  method text not null default 'simulado' check (method = 'simulado'), -- prototipo: sin pasarela real
  paid_at timestamptz not null default now(),
  settlement_id uuid references settlements (id)
);

create table incidents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests (id),
  client_id uuid not null references profiles (id),
  maki_id uuid references profiles (id),
  type incident_type not null,
  description text not null,
  status incident_status not null default 'abierta',
  response_due timestamptz not null,
  fix_due timestamptz,
  resolution text,
  resolved_at timestamptz,
  counts_as_rework boolean not null default false,
  created_at timestamptz not null default now()
);

create table future_interests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id),
  category_id text not null references service_categories (id),
  description text not null,
  created_at timestamptz not null default now()
);

create table analytics_events (
  id bigserial primary key,
  type text not null,
  user_id uuid references profiles (id),
  request_id uuid references service_requests (id),
  at timestamptz not null default now()
);

create table timeline_events (
  id bigserial primary key,
  request_id uuid not null references service_requests (id) on delete cascade,
  type text not null,
  label text not null,
  by_role text not null,
  at timestamptz not null default now()
);

create table settings (
  id boolean primary key default true check (id),   -- fila única
  commission_first numeric(5,4) not null default 0.25,
  commission_repeat numeric(5,4) not null default 0.20,
  matching_weights jsonb not null,
  ai_confidence_threshold numeric(3,2) not null default 0.60,
  max_candidates smallint not null default 3,
  new_maki_slot boolean not null default true,
  costs jsonb not null
);

-- ═══════════════════════ Row Level Security ═══════════════════════
create or replace function auth_role() returns app_role language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

alter table profiles enable row level security;
alter table home_profiles enable row level security;
alter table favorite_makis enable row level security;
alter table maki_profiles enable row level security;
alter table service_categories enable row level security;
alter table service_items enable row level security;
alter table service_requests enable row level security;
alter table quote_lines enable row level security;
alter table offers enable row level security;
alter table extras enable row level security;
alter table payments enable row level security;
alter table settlements enable row level security;
alter table incidents enable row level security;
alter table future_interests enable row level security;
alter table analytics_events enable row level security;
alter table timeline_events enable row level security;
alter table settings enable row level security;

-- Admin: acceso total
do $$ declare t text; begin
  foreach t in array array['profiles','home_profiles','favorite_makis','maki_profiles','service_categories','service_items','service_requests','quote_lines','offers','extras','payments','settlements','incidents','future_interests','analytics_events','timeline_events','settings'] loop
    execute format('create policy admin_all on %I for all using (auth_role() = ''admin'') with check (auth_role() = ''admin'')', t);
  end loop;
end $$;

-- Catálogo: lectura pública
create policy catalog_read on service_categories for select using (true);
create policy items_read on service_items for select using (true);
create policy settings_read on settings for select using (auth.uid() is not null);

-- Perfil propio
create policy own_profile on profiles for select using (id = auth.uid());
create policy own_profile_update on profiles for update using (id = auth.uid()) with check (role = (select role from profiles where id = auth.uid()));
-- Los clientes ven el perfil público de los Makis habilitados
create policy makis_public on profiles for select using (exists (select 1 from maki_profiles m where m.user_id = profiles.id and m.status = 'habilitado'));

-- Perfil del Hogar: el cliente dueño, y el Maki solo mientras tiene un trabajo asignado
create policy own_home on home_profiles for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy maki_sees_assigned_home on home_profiles for select using (
  exists (select 1 from service_requests r where r.client_id = home_profiles.client_id and r.assigned_maki_id = auth.uid()
          and r.status in ('confirmada','en_curso','evidencia_enviada','con_incidencia'))
);
create policy own_favorites on favorite_makis for all using (client_id = auth.uid()) with check (client_id = auth.uid());

-- Maki: su propio perfil (no puede auto-habilitarse: status y verificación solo vía admin)
create policy maki_own on maki_profiles for select using (user_id = auth.uid() or status = 'habilitado');
create policy maki_own_update on maki_profiles for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and status = (select status from maki_profiles where user_id = auth.uid())
              and trade_test_score is not distinct from (select trade_test_score from maki_profiles where user_id = auth.uid()));

-- Solicitudes: el cliente ve las suyas; el Maki ve las ofrecidas o asignadas
create policy client_requests on service_requests for select using (client_id = auth.uid());
create policy client_create on service_requests for insert with check (client_id = auth.uid() and auth_role() = 'client');
create policy maki_requests on service_requests for select using (
  assigned_maki_id = auth.uid() or exists (select 1 from offers o where o.request_id = service_requests.id and o.maki_id = auth.uid())
);
-- Las actualizaciones de estado se hacen por RPC (security definer) que valida la máquina de estados.

create policy lines_read on quote_lines for select using (exists (select 1 from service_requests r where r.id = request_id));
create policy offers_read on offers for select using (maki_id = auth.uid() or exists (select 1 from service_requests r where r.id = request_id and r.client_id = auth.uid()));
create policy extras_read on extras for select using (exists (select 1 from service_requests r where r.id = request_id));
create policy timeline_read on timeline_events for select using (exists (select 1 from service_requests r where r.id = request_id));

create policy payments_read on payments for select using (client_id = auth.uid() or maki_id = auth.uid());
create policy settlements_read on settlements for select using (maki_id = auth.uid());
create policy incidents_read on incidents for select using (client_id = auth.uid() or maki_id = auth.uid());
create policy incidents_create on incidents for insert with check (client_id = auth.uid());
create policy interests_own on future_interests for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy events_insert on analytics_events for insert with check (user_id = auth.uid());
