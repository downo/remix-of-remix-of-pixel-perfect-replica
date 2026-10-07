CREATE TABLE public.territories (
  id text PRIMARY KEY,
  owner uuid,
  owner_name text,
  captured_at timestamptz,
  last_attack_at timestamptz
);
GRANT SELECT ON public.territories TO anon, authenticated;
GRANT ALL ON public.territories TO service_role;
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "territories readable" ON public.territories FOR SELECT USING (true);
INSERT INTO public.territories(id) VALUES ('t_mine'),('t_dam'),('t_tower'),('t_depot'),('t_crater');

CREATE TABLE public.season_contrib (
  season text NOT NULL,
  user_id uuid NOT NULL,
  username text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (season, user_id)
);
GRANT SELECT ON public.season_contrib TO anon, authenticated;
GRANT INSERT, UPDATE ON public.season_contrib TO authenticated;
GRANT ALL ON public.season_contrib TO service_role;
ALTER TABLE public.season_contrib ENABLE ROW LEVEL SECURITY;
CREATE POLICY "season readable" ON public.season_contrib FOR SELECT USING (true);
CREATE POLICY "season insert own" ON public.season_contrib FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND amount BETWEEN 0 AND 1000000);
CREATE POLICY "season update own" ON public.season_contrib FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND amount BETWEEN 0 AND 1000000);

CREATE OR REPLACE FUNCTION public.claim_territory(_id text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mine uuid; t record; pa numeric; pd numeric; win boolean; nm text;
BEGIN
  SELECT clan_id INTO mine FROM clan_members WHERE user_id = auth.uid();
  IF mine IS NULL THEN RAISE EXCEPTION 'Pole klannis'; END IF;
  SELECT * INTO t FROM territories WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sellist ala pole'; END IF;
  IF t.owner = mine THEN RAISE EXCEPTION 'See ala on juba teie oma'; END IF;
  IF t.last_attack_at > now() - interval '30 minutes' THEN RAISE EXCEPTION 'Seda ala rünnati hiljuti. Oota pool tundi.'; END IF;
  SELECT name INTO nm FROM clans WHERE id = mine;
  IF t.owner IS NULL OR NOT EXISTS (SELECT 1 FROM clans WHERE id = t.owner) THEN
    win := true;
  ELSE
    SELECT coalesce(sum(p.score),0) + 10 INTO pa FROM clan_members m JOIN profiles p ON p.id = m.user_id WHERE m.clan_id = mine;
    SELECT (coalesce(sum(p.score),0) + 10) * 1.15 INTO pd FROM clan_members m JOIN profiles p ON p.id = m.user_id WHERE m.clan_id = t.owner;
    win := pa * (0.7 + random() * 0.6) > pd * (0.7 + random() * 0.6);
  END IF;
  IF win THEN
    UPDATE territories SET owner = mine, owner_name = nm, captured_at = now(), last_attack_at = now() WHERE id = _id;
  ELSE
    UPDATE territories SET last_attack_at = now() WHERE id = _id;
  END IF;
  RETURN json_build_object('won', win);
END $$;
REVOKE ALL ON FUNCTION public.claim_territory(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_territory(text) TO authenticated;