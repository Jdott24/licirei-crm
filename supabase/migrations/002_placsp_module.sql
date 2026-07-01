-- ============================================================
-- Licirei CRM – PLACSP Module Migration
-- Replaces inbox table with placsp_contracts + client_contracts.
-- Domain: PLACSP → PlacspContract (one) → ClientContract (many users)
-- ============================================================

-- Drop old inbox table (dev environment, no backwards compat needed)
DROP TABLE IF EXISTS public.inbox CASCADE;

-- ── PLACSP_CONTRACTS ─────────────────────────────────────────────────────────
-- Platform-level table. One row per unique licitación.
-- Many users can be related to the same contract via client_contracts.
CREATE TABLE IF NOT EXISTS public.placsp_contracts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_id        text        UNIQUE NOT NULL,  -- 'pcsp:{DIR3}:{folderId}' or 'evol:{id}'
  atom_id             text        NOT NULL,          -- full <id> URI from ATOM feed
  id_evolucion        text,                          -- numeric idEvolucion from atom_id
  contract_folder_id  text,                          -- ContractFolderID (expediente)
  dir3                text,                          -- DIR3 code of contracting authority
  titulo              text        NOT NULL,
  organismo           text        NOT NULL,
  objeto              text,
  presupuesto         numeric     DEFAULT 0,
  plazo               date,
  fecha_publicacion   date,
  cpvs                text[]      DEFAULT '{}',
  version_count       int         NOT NULL DEFAULT 1,
  last_seen_at        timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  raw_data            jsonb       DEFAULT '{}'       -- full raw entry for parser debugging
);

CREATE INDEX IF NOT EXISTS idx_placsp_canonical ON public.placsp_contracts (canonical_id);
CREATE INDEX IF NOT EXISTS idx_placsp_cpvs      ON public.placsp_contracts USING gin(cpvs);

-- Auto-set updated_at on every UPDATE
CREATE OR REPLACE FUNCTION public.placsp_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER placsp_updated_at
  BEFORE UPDATE ON public.placsp_contracts
  FOR EACH ROW EXECUTE FUNCTION public.placsp_set_updated_at();

-- Auto-increment version_count only when meaningful fields change
CREATE OR REPLACE FUNCTION public.placsp_increment_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (
    OLD.id_evolucion IS DISTINCT FROM NEW.id_evolucion OR
    OLD.presupuesto  IS DISTINCT FROM NEW.presupuesto  OR
    OLD.plazo        IS DISTINCT FROM NEW.plazo        OR
    OLD.organismo    IS DISTINCT FROM NEW.organismo    OR
    OLD.objeto       IS DISTINCT FROM NEW.objeto       OR
    OLD.titulo       IS DISTINCT FROM NEW.titulo
  ) THEN
    NEW.version_count = OLD.version_count + 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER placsp_version
  BEFORE UPDATE ON public.placsp_contracts
  FOR EACH ROW EXECUTE FUNCTION public.placsp_increment_version();

-- RLS: any authenticated user can read; all writes go through server routes
ALTER TABLE public.placsp_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "placsp_contracts_read" ON public.placsp_contracts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "placsp_contracts_write" ON public.placsp_contracts
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ── CLIENT_CONTRACTS ──────────────────────────────────────────────────────────
-- User ↔ contract relationship. One row per (user, contract) pair.
-- estado follows the lifecycle: descubierta → favorita / descartada / presentada
CREATE TABLE IF NOT EXISTS public.client_contracts (
  id           uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id  uuid      NOT NULL REFERENCES public.placsp_contracts(id) ON DELETE CASCADE,
  estado       text      NOT NULL DEFAULT 'descubierta'
               CHECK (estado IN ('descubierta', 'favorita', 'descartada', 'presentada')),
  matched_cpvs text[]    DEFAULT '{}',
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, contract_id)
);

CREATE INDEX IF NOT EXISTS idx_cc_user_estado ON public.client_contracts (user_id, estado);
CREATE INDEX IF NOT EXISTS idx_cc_created     ON public.client_contracts (created_at DESC);

ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_contracts_self" ON public.client_contracts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add new tables to realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.placsp_contracts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_contracts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END;
$$;
