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
