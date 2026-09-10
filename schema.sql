-- ============================================================
-- Road naar 85 — databaseschema
-- Plak dit in Supabase → SQL Editor → New query → Run.
-- ============================================================

-- Eén rij per persoon per dag. Alleen kg is verplicht;
-- de rest mag leeg blijven.
create table if not exists daily_entry (
  person   text        not null check (person in ('nick','victor')),
  date     date        not null,
  kg       numeric(5,2) not null check (kg between 30 and 250),
  kcal     int          check (kcal between 0 and 9000),
  protein  int          check (protein between 0 and 500),
  training text,
  sleep    numeric(3,1) check (sleep between 0 and 16),
  note     text,
  updated_at timestamptz not null default now(),
  primary key (person, date)
);

-- Handig voor het ophalen op datumvolgorde.
create index if not exists daily_entry_date_idx on daily_entry (date);

-- Row level security aanzetten en daarna bewust openzetten.
alter table daily_entry enable row level security;

drop policy if exists "open" on daily_entry;
create policy "open" on daily_entry
  for all using (true) with check (true);

-- LET OP: deze policy geeft iedereen met de anon key volledige lees- en
-- schrijfrechten op deze tabel. De anon key staat in config.js en is dus
-- publiek zichtbaar in een GitHub Pages-site. Voor twee vrienden en een
-- weegschaal is dat een aanvaardbare afweging, maar zet er verder niets
-- gevoeligs in en gebruik dit Supabase-project niet voor iets anders.

-- ============================================================
-- Krachttraining: oefeningen en persoonlijke records.
-- Eén rij per oefening per persoon; een nieuwe PR overschrijft de oude.
-- ============================================================

create table if not exists exercises (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null check (category in
                ('chest','tricep','rug','bicep','benen','schouders')),
  note        text,
  is_custom   boolean not null default false,
  sort_order  int     not null default 100,
  created_at  timestamptz not null default now(),
  unique (name, category)
);

create table if not exists exercise_prs (
  id           uuid primary key default gen_random_uuid(),
  exercise_id  uuid not null references exercises(id) on delete cascade,
  person       text not null check (person in ('nick','victor')),
  weight       numeric(6,1),
  reps         int not null,
  note         text,
  updated_at   timestamptz not null default now(),
  unique (exercise_id, person)
);

create index if not exists exercise_prs_person_idx on exercise_prs (person);
create index if not exists exercises_category_idx  on exercises (category);

create or replace function touch_exercise_pr()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists exercise_prs_touch on exercise_prs;
create trigger exercise_prs_touch
  before update on exercise_prs
  for each row execute function touch_exercise_pr();

alter table exercises    enable row level security;
alter table exercise_prs enable row level security;

drop policy if exists exercises_all    on exercises;
drop policy if exists exercise_prs_all on exercise_prs;

create policy exercises_all    on exercises    for all using (true) with check (true);
create policy exercise_prs_all on exercise_prs for all using (true) with check (true);

-- De basislijst met 19 oefeningen en Nicks beginwaarden zijn eenmalig
-- ingeladen via de losse migratie; zie de git-historie.
