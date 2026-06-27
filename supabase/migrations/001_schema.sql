-- ============================================================
-- Licirei CRM – Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── PROFILES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        text    DEFAULT '',
  cargo         text    DEFAULT 'Responsable de licitaciones',
  empresa       text    DEFAULT 'Mi Empresa',
  telefono      text    DEFAULT '',
  nif           text    DEFAULT '',
  email         text    DEFAULT '',
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self" ON public.profiles USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── CONTRACTS (Cartera activa) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.contracts (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  expediente    text    NOT NULL,
  org           text    NOT NULL,
  obj           text    DEFAULT '',
  importe       numeric NOT NULL DEFAULT 0,
  cpv           text    DEFAULT '',
  fecha_inicio  date,
  fecha_vence   date    NOT NULL,
  responsable   text    DEFAULT 'Sin asignar',
  user_id       uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_self" ON public.contracts USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── PIPELINE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipeline (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  expediente    text    DEFAULT '',
  org           text    NOT NULL,
  obj           text    DEFAULT '',
  presupuesto   numeric DEFAULT 0,
  plazo         date,
  responsable   text    DEFAULT 'Sin asignar',
  docs_done     int     DEFAULT 0,
  docs_total    int     DEFAULT 6,
  cpv           text    DEFAULT '',
  stage         text    NOT NULL DEFAULT 'detectada'
                CHECK (stage IN ('detectada','analisis','gonogo','preparacion','presentada','adjudicada')),
  user_id       uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE public.pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_self" ON public.pipeline USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── INBOX (PLACSP) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inbox (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  expediente    text    DEFAULT '',
  org           text    NOT NULL,
  obj           text    DEFAULT '',
  presupuesto   numeric DEFAULT 0,
  plazo         date,
  cpv           text    DEFAULT '',
  filtro        text    DEFAULT '',
  publicado     date    DEFAULT CURRENT_DATE,
  user_id       uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE public.inbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inbox_self" ON public.inbox USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── ORGANISMOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organismos (
  id              uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  org             text    NOT NULL,
  tipo            text    DEFAULT '',
  region          text    DEFAULT '',
  contratos       int     DEFAULT 0,
  importe         numeric DEFAULT 0,
  licitaciones    int     DEFAULT 0,
  tasa_exito      int     DEFAULT 0,
  contacto        text    DEFAULT '',
  ultimo_contacto date,
  user_id         uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.organismos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organismos_self" ON public.organismos USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── SOLVENCIA ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.solvencia (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      text    NOT NULL,
  tipo        text    DEFAULT '',
  emisor      text    DEFAULT '',
  fecha_ini   date,
  fecha_cad   date    NOT NULL,
  user_id     uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.solvencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solvencia_self" ON public.solvencia USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── CPV FILTERS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cpv_filters (
  id      uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre  text    NOT NULL,
  cliente text    DEFAULT '',
  cpvs    text[]  DEFAULT '{}',
  activo  boolean DEFAULT true,
  user_id uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.cpv_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpv_filters_self" ON public.cpv_filters USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── ACTIVITY ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity (
  id         uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  quien      text    NOT NULL,
  txt        text    NOT NULL,
  tone       text    DEFAULT 'steel',
  user_id    uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_self" ON public.activity USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── REALTIME ────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE pipeline;
ALTER PUBLICATION supabase_realtime ADD TABLE inbox;
ALTER PUBLICATION supabase_realtime ADD TABLE solvencia;
ALTER PUBLICATION supabase_realtime ADD TABLE activity;

-- ── SEED FUNCTION ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.seed_demo_data(uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Profile
  INSERT INTO public.profiles (id, nombre, cargo, empresa, telefono, nif, email)
  VALUES (uid, 'Almudena Ferrer', 'Responsable de licitaciones', 'Muñoz Bosch', '+34 612 345 678', 'B-46.123.456', 'almudena.ferrer@munozbosch.es')
  ON CONFLICT (id) DO NOTHING;

  -- Contracts
  INSERT INTO public.contracts (expediente, org, obj, importe, cpv, fecha_inicio, fecha_vence, responsable, user_id) VALUES
  ('2023/CON-0412','Ayuntamiento de Madrid','Suministro de productos de limpieza para dependencias municipales',1240000,'39830000-9','2023-09-01','2026-08-31','Marta Ruiz',uid),
  ('SAS-2024/0188','Servicio Andaluz de Salud','Suministro de detergentes y desinfectantes hospitalarios',2860000,'39831000-6','2024-01-15','2026-07-15','Ana Gil',uid),
  ('GVA-2024/CT-77','Generalitat Valenciana','Material de limpieza para centros educativos',980000,'39830000-9','2024-09-01','2026-12-20','Luis Cano',uid),
  ('DIBA-2025/214','Diputación de Barcelona','Productos higiénico-sanitarios y celulosa',540000,'33760000-5','2025-03-01','2027-03-01','Marta Ruiz',uid),
  ('UCM-2024/SUM-31','Universidad Complutense de Madrid','Suministro de consumibles de limpieza',320000,'39830000-9','2024-07-10','2026-07-09','Ana Gil',uid),
  ('MM-2024/0902','Metro de Madrid','Productos de limpieza para estaciones y trenes',1760000,'39830000-9','2024-10-01','2026-09-30','Luis Cano',uid),
  ('CABTF-2025/41','Cabildo de Tenerife','Suministro de detergentes industriales',210000,'39831000-6','2025-02-12','2026-08-12','Marta Ruiz',uid),
  ('ADIF-2025/SUM-08','ADIF','Productos de limpieza para instalaciones ferroviarias',1120000,'39830000-9','2025-07-01','2027-06-30','Ana Gil',uid),
  ('JCYL-2024/663','Junta de Castilla y León','Material de limpieza para residencias de mayores',760000,'39830000-9','2024-10-15','2026-10-15','Luis Cano',uid),
  ('MDEF-2024/0501','Ministerio de Defensa','Suministro de productos de limpieza para acuartelamientos',1500000,'39830000-9','2024-08-05','2026-08-05','Marta Ruiz',uid);

  -- Pipeline
  INSERT INTO public.pipeline (expediente, org, obj, presupuesto, plazo, responsable, docs_done, docs_total, cpv, stage, user_id) VALUES
  ('LIC-2601','Ayuntamiento de Sevilla','Suministro de productos de limpieza para colegios públicos',680000,'2026-07-10','Marta Ruiz',2,6,'39830000-9','detectada',uid),
  ('LIC-2602','Diputación de Valencia','Detergentes para dependencias provinciales',240000,'2026-07-18','Luis Cano',1,5,'39831000-6','detectada',uid),
  ('LIC-2598','Gobierno de Aragón','Material higiénico-sanitario',410000,'2026-07-05','Marta Ruiz',3,6,'33760000-5','analisis',uid),
  ('LIC-2595','SERGAS – Galicia','Desinfectantes hospitalarios',1350000,'2026-07-22','Ana Gil',2,7,'39831000-6','analisis',uid),
  ('LIC-2590','Ayuntamiento de Bilbao','Productos de limpieza para edificios municipales',520000,'2026-07-14','Luis Cano',4,6,'39830000-9','gonogo',uid),
  ('LIC-2581','Universidad de Granada','Consumibles de limpieza',300000,'2026-07-09','Ana Gil',5,6,'39830000-9','preparacion',uid),
  ('LIC-2577','Puertos del Estado','Suministro integral de limpieza',890000,'2026-07-25','Marta Ruiz',6,7,'39830000-9','preparacion',uid),
  ('LIC-2560','Junta de Extremadura','Material de limpieza',360000,'2026-06-30','Luis Cano',6,6,'39830000-9','presentada',uid),
  ('LIC-2555','Ayuntamiento de Málaga','Detergentes y productos de limpieza',270000,'2026-06-20','Ana Gil',5,5,'39831000-6','presentada',uid),
  ('LIC-2540','Diputación de Alicante','Productos de limpieza para sedes provinciales',450000,'2026-05-15','Marta Ruiz',7,7,'39830000-9','adjudicada',uid);

  -- Inbox
  INSERT INTO public.inbox (expediente, org, obj, presupuesto, plazo, cpv, filtro, publicado, user_id) VALUES
  ('2026/PLA-9921','Ayuntamiento de Zaragoza','Suministro de productos de limpieza para instalaciones deportivas',320000,'2026-07-28','39830000-9','Limpieza – M. Bosch','2026-06-27',uid),
  ('2026/PLA-9918','SACYL – Castilla y León','Desinfectantes para centros de salud',1100000,'2026-08-03','39831000-6','Sanitario – M. Bosch','2026-06-27',uid),
  ('2026/PLA-9910','Ayuntamiento de Murcia','Papel higiénico y celulosa',190000,'2026-07-30','33760000-5','Higiénico – M. Bosch','2026-06-26',uid),
  ('2026/PLA-9907','Cabildo de Gran Canaria','Material de limpieza para dependencias insulares',280000,'2026-08-05','39830000-9','Limpieza – M. Bosch','2026-06-26',uid),
  ('2026/PLA-9901','Universidad de Sevilla','Consumibles de limpieza',150000,'2026-07-26','39830000-9','Limpieza – M. Bosch','2026-06-26',uid),
  ('2026/PLA-9894','Metro de Bilbao','Escobas, cepillos y útiles de limpieza',95000,'2026-08-10','39224300-1','Útiles – M. Bosch','2026-06-25',uid);

  -- Organismos
  INSERT INTO public.organismos (org, tipo, region, contratos, importe, licitaciones, tasa_exito, contacto, ultimo_contacto, user_id) VALUES
  ('Ayuntamiento de Madrid','Administración Local','Madrid',1,1240000,0,45,'Servicio de Contratación Central','2026-06-10',uid),
  ('Servicio Andaluz de Salud','Sanidad autonómica','Andalucía',1,2860000,1,52,'Plataforma de Compras SAS','2026-06-22',uid),
  ('Generalitat Valenciana','Admin. autonómica','C. Valenciana',1,980000,1,38,'Conselleria de Hacienda','2026-06-05',uid),
  ('Diputación de Barcelona','Admin. provincial','Cataluña',1,540000,0,41,'Servei de Contractació','2026-05-28',uid),
  ('Metro de Madrid','Empresa pública','Madrid',1,1760000,0,60,'Dirección de Compras','2026-06-18',uid),
  ('ADIF','Empresa pública estatal','Nacional',1,1120000,0,33,'Dir. de Contratación','2026-04-30',uid),
  ('Universidad Complutense de Madrid','Universidad pública','Madrid',1,320000,0,50,'Servicio de Compras UCM','2026-06-12',uid);

  -- Solvencia
  INSERT INTO public.solvencia (nombre, tipo, emisor, fecha_ini, fecha_cad, user_id) VALUES
  ('Clasificación empresarial – Grupo U (limpieza)','Clasificación','Junta Consultiva de Contratación','2022-03-01','2027-03-01',uid),
  ('Seguro de Responsabilidad Civil','Seguro','Mapfre Empresas','2025-01-01','2026-12-31',uid),
  ('ISO 9001 – Gestión de la Calidad','Certificación','AENOR','2024-05-10','2027-05-10',uid),
  ('ISO 14001 – Gestión Ambiental','Certificación','AENOR','2023-07-15','2026-07-15',uid),
  ('Certificado de estar al corriente – AEAT','Certificado','Agencia Tributaria','2026-04-01','2026-10-01',uid),
  ('Certificado Seguridad Social – TGSS','Certificado','Tesorería General SS','2026-04-01','2026-10-01',uid),
  ('Solvencia económica – Cuentas 2024','Financiero','Registro Mercantil','2025-06-30','2026-06-30',uid);

  -- CPV Filters
  INSERT INTO public.cpv_filters (nombre, cliente, cpvs, activo, user_id) VALUES
  ('Limpieza – M. Bosch','Muñoz Bosch',ARRAY['39830000-9','39831000-6'],true,uid),
  ('Higiénico – M. Bosch','Muñoz Bosch',ARRAY['33760000-5','39224300-1'],true,uid),
  ('Sanitario – M. Bosch','Muñoz Bosch',ARRAY['39831000-6'],false,uid);

  -- Activity
  INSERT INTO public.activity (quien, txt, tone, user_id) VALUES
  ('Marta Ruiz','movió Ayto. de Bilbao a Go / No-Go','steel',uid),
  ('Sistema','nueva licitación detectada: Ayto. de Zaragoza','steel',uid),
  ('Sistema','ISO 14001 caduca en 18 días','warn',uid),
  ('Sistema','contrato SAS marcado como crítico (18 d)','danger',uid),
  ('Luis Cano','subió el pliego técnico a Ayto. de Málaga','steel',uid);
END;
$$;

-- ── AUTO-SEED TRIGGER ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.seed_demo_data(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
