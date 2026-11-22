-- Porto Serena: saves na nuvem (privados) e ranking público.
-- Já aplicado no projeto Supabase "porto-serena" (mbxstxxfyrygqpcfmthk).
create table public.saves (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint saves_size check (octet_length(data::text) < 2000000)
);
alter table public.saves enable row level security;
create policy "saves_select_own" on public.saves for select to authenticated using ((select auth.uid()) = user_id);
create policy "saves_insert_own" on public.saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "saves_update_own" on public.saves for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "saves_delete_own" on public.saves for delete to authenticated using ((select auth.uid()) = user_id);

create table public.ranking (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  city text not null check (char_length(city) between 1 and 32),
  pop integer not null default 0 check (pop between 0 and 100000),
  happiness integer not null default 0 check (happiness between 0 and 100),
  day integer not null default 1 check (day >= 1),
  buildings integer not null default 0 check (buildings >= 0),
  goals integer not null default 0 check (goals between 0 and 100),
  updated_at timestamptz not null default now()
);
create index ranking_pop_idx on public.ranking (pop desc);
alter table public.ranking enable row level security;
create policy "ranking_read_all" on public.ranking for select to anon, authenticated using (true);
create policy "ranking_insert_own" on public.ranking for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ranking_update_own" on public.ranking for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "ranking_delete_own" on public.ranking for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger saves_touch before update on public.saves for each row execute function public.touch_updated_at();
create trigger ranking_touch before update on public.ranking for each row execute function public.touch_updated_at();
