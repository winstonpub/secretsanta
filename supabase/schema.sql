-- Таблицы и логика сайта «Тайный Санта» для базы данных Supabase.
-- Как применить: Supabase → SQL Editor → New query → вставить этот файл целиком → Run.
-- Файл можно запускать повторно: существующие таблицы и данные он не трогает.
--
-- Как это работает. Сайт — это статическая страница на GitHub Pages без своего
-- сервера, поэтому браузер обращается к базе напрямую через Supabase API
-- публичным ключом. Прямой доступ к таблицам закрыт (защита строк включена,
-- разрешающих правил нет), а вся логика живёт в функциях ниже. Функции
-- выполняются с правами владельца базы (SECURITY DEFINER) и сами проверяют,
-- кто звонит: пары «кто кому дарит» по-прежнему видит только организатор,
-- пожелания — по настройке комнаты, чужой подарок принять нельзя.

create table if not exists public.profiles (
  id uuid primary key,
  login text not null,
  display_name text not null,
  avatar_url text,
  created_at timestamp not null default now()
);

-- Если таблица profiles была создана по старой версии инструкции (без логина),
-- заполняем его — но только пока не появилась колонка email.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
  ) then
    alter table public.profiles add column if not exists login text;
    update public.profiles set login = id::text where login is null;
    alter table public.profiles alter column login set not null;
  end if;
end $$;

-- Вход стал по почте: колонка login переименована в email (данные сохраняются).
-- Если есть обе колонки (прерванный прошлый запуск) — лишний login удаляется.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'login'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
    ) then
      alter table public.profiles drop column login;
    else
      alter table public.profiles rename column login to email;
    end if;
  end if;
end $$;
drop index if exists public.profiles_login_unique;
create unique index if not exists profiles_email_unique on public.profiles (email);

create table if not exists public.rooms (
  id serial primary key,
  code text not null unique,
  name text not null,
  budget text not null default '',
  event_date text not null default '',
  owner_id integer,
  owner_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamp not null default now()
);

create table if not exists public.participants (
  id serial primary key,
  room_id integer not null references public.rooms (id) on delete cascade,
  name text not null,
  avatar text not null,
  color text not null,
  wishlist text not null default '',
  token text not null unique,
  created_at timestamp not null default now()
);

create table if not exists public.assignments (
  id serial primary key,
  room_id integer not null references public.rooms (id) on delete cascade,
  santa_id integer not null unique references public.participants (id) on delete cascade,
  recipient_id integer not null unique references public.participants (id) on delete cascade,
  sent boolean not null default false,
  accepted boolean not null default false,
  sent_at timestamp
);

-- Обновление: вход в комнату по профилю, настройка пожеланий, упаковка подарка.
-- Для уже работающего сайта эти строки добавляют новые колонки, не трогая данные.
alter table public.rooms
  add column if not exists wishlist_visibility text not null default 'all';

alter table public.participants
  add column if not exists profile_id uuid references public.profiles (id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'participants_room_profile_unique'
  ) then
    alter table public.participants
      add constraint participants_room_profile_unique unique (room_id, profile_id);
  end if;
end $$;

alter table public.assignments
  add column if not exists wrap_style text not null default 'box',
  add column if not exists wrap_color text not null default 'red';

-- Отметка «подарок принят» появилась позже:
alter table public.assignments add column if not exists accepted boolean not null default false;

-- Упаковка 2.0: новые цвета (жёлтый, оранжевый, голубой, чёрный) и наполнение подарка.
-- Старые цвета переименовываются автоматически: золотой → жёлтый, розовый → фиолетовый,
-- бирюзовый → зелёный. Данные комнат не теряются.
alter table public.assignments add column if not exists wrap_contents text not null default 'candy';
update public.assignments set wrap_color = case wrap_color
    when 'gold' then 'yellow'
    when 'pink' then 'purple'
    when 'teal' then 'green'
  end
  where wrap_color in ('gold', 'pink', 'teal');

-- ВАЖНО. Прямой доступ к таблицам через Supabase API закрыт для всех:
-- защита строк включена, разрешающих правил нет. Сайт работает только через
-- функции ниже, а они проверяют права звонящего внутри себя.
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.assignments enable row level security;

-- ============================================================
-- Логика сайта: функции API.
-- Договорённости: ошибки входа — исключение 'NEED_AUTH',
-- комната не найдена — исключение 'ROOM_NOT_FOUND',
-- остальные исключения — готовый русский текст для показа.
-- ============================================================

-- Чистка аватара и цвета: те же списки, что в src/lib/constants.ts.
create or replace function public._clean_avatar(p_avatar text)
returns text
language sql immutable set search_path = public as $$
  select case
    when p_avatar = any (array['🦊','🐻','🐼','🐨','🐯','🦁','🐸','🐵','🐧','🦉','🦄','🐰','🐱','🐶','🎅','🤶','⛄','🦌','🧝','🐹'])
    then p_avatar else '🦊' end
$$;

create or replace function public._clean_color(p_color text)
returns text
language sql immutable set search_path = public as $$
  select case
    when p_color = any (array['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#8b5cf6','#ec4899','#64748b','#a16207'])
    then p_color else '#ef4444' end
$$;

-- Упаковка: значения вне списка заменяются на обычные (защита от подмены в запросе).
create or replace function public._clean_wrap_style(p_style text)
returns text
language sql immutable set search_path = public as $$
  select case when p_style in ('box', 'bag') then p_style else 'box' end
$$;

create or replace function public._clean_wrap_color(p_color text)
returns text
language sql immutable set search_path = public as $$
  select case when p_color in ('red', 'orange', 'yellow', 'green', 'sky', 'blue', 'purple', 'white', 'black')
    then p_color else 'red' end
$$;

create or replace function public._clean_contents(p_contents text)
returns text
language sql immutable set search_path = public as $$
  select case when p_contents in ('candy', 'toys', 'champagne', 'book', 'tangerines', 'gingerbread', 'tea', 'ornaments', 'socks')
    then p_contents else 'candy' end
$$;

-- Случайная строка для технического поля token (без расширений).
create or replace function public._rand_token()
returns text
language sql volatile set search_path = public as $$
  select md5(random()::text || clock_timestamp()::text)
      || md5(random()::text || clock_timestamp()::text)
$$;

-- Свободный 6-значный код комнаты.
create or replace function public._new_room_code()
returns text
language plpgsql volatile set search_path = public as $$
declare
  v_code text;
begin
  for i in 1..10 loop
    v_code := '';
    for j in 1..6 loop
      v_code := v_code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32)::int + 1, 1);
    end loop;
    if not exists (select 1 from public.rooms where code = v_code) then
      return v_code;
    end if;
  end loop;
  raise exception 'Не удалось придумать код комнаты, попробуйте ещё раз';
end;
$$;

-- Профиль звонящего: создаёт запись при первом входе. Если та же почта
-- записана за другим id (профиль удалили в Supabase и зарегистрировали
-- заново), комнаты и участие переносятся на новый профиль.
create or replace function public._ensure_profile_row()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_stale_id uuid;
begin
  if v_uid is null then
    raise exception 'NEED_AUTH';
  end if;
  -- Почта берётся из учётки (ей можно доверять), имя — из данных регистрации.
  -- Учётки со старым техническим адресом (раньше вход был по логину)
  -- показываем коротко — просто логином.
  v_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  if v_email like '%@users.secret-santa.local' then
    v_email := split_part(v_email, '@', 1);
  end if;
  if v_email is null or v_email = '' then
    v_email := v_uid::text;
  end if;
  v_name := left(
    coalesce(nullif(trim(auth.jwt() #>> array['user_metadata', 'display_name']), ''), v_email),
    40
  );
  perform 1 from public.profiles where id = v_uid;
  if found then
    return v_uid;
  end if;
  select id into v_stale_id from public.profiles where email = v_email and id <> v_uid;
  if found then
    update public.profiles
      set email = v_email || '#old#' || v_stale_id::text
      where id = v_stale_id;
  end if;
  insert into public.profiles (id, email, display_name)
  values (v_uid, v_email, v_name)
  on conflict do nothing;
  if v_stale_id is not null then
    update public.participants set profile_id = v_uid where profile_id = v_stale_id;
    update public.rooms set owner_profile_id = v_uid where owner_profile_id = v_stale_id;
    delete from public.profiles where id = v_stale_id;
  end if;
  return v_uid;
end;
$$;

-- Общий контекст комнаты: вход, профиль, комната, участник, права.
create or replace function public._room_ctx(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_room public.rooms%rowtype;
  v_me_id int;
  v_email text;
  v_dname text;
begin
  v_uid := public._ensure_profile_row();
  select * into v_room from public.rooms where code = upper(trim(p_code));
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;
  select id into v_me_id from public.participants
    where room_id = v_room.id and profile_id = v_uid;
  select email, display_name into v_email, v_dname from public.profiles where id = v_uid;
  return jsonb_build_object(
    'uid', v_uid,
    'email', v_email,
    'displayName', v_dname,
    'roomId', v_room.id,
    'ownerId', v_room.owner_id,
    'visibility', case
      when v_room.wishlist_visibility in ('all', 'santa') then v_room.wishlist_visibility
      else 'all' end,
    'meId', v_me_id,
    'isOwner', (v_me_id is not null and v_room.owner_id = v_me_id)
      or (v_room.owner_profile_id = v_uid)
  );
end;
$$;

-- Кто сейчас вошёл (после входа/регистрации и при открытии сайта).
create or replace function public.ensure_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public._ensure_profile_row();
begin
  return (
    select jsonb_build_object('id', id, 'email', email, 'displayName', display_name)
    from public.profiles
    where id = v_uid
  );
end;
$$;

-- Всё состояние комнаты для текущего пользователя.
-- Пожелания скрыты по настройке комнаты, чужие пары не отдаются никому,
-- кроме организатора. Упаковка видна после отправки, содержимое — после принятия.
create or replace function public.get_room_state(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb := public._room_ctx(p_code);
  v_room_id int := (v_ctx ->> 'roomId')::int;
  v_me int := (v_ctx ->> 'meId')::int;
  v_vis text := v_ctx ->> 'visibility';
  v_owner boolean := (v_ctx ->> 'isOwner')::boolean;
  v_target int;
begin
  if v_me is not null then
    select recipient_id into v_target from public.assignments
      where room_id = v_room_id and santa_id = v_me;
  end if;
  return jsonb_build_object(
    'room', (
      select jsonb_build_object(
        'code', r.code, 'name', r.name, 'budget', r.budget,
        'eventDate', r.event_date, 'ownerId', r.owner_id,
        'wishlistVisibility', v_vis)
      from public.rooms r
      where r.id = v_room_id
    ),
    'viewer', jsonb_build_object(
      'email', v_ctx ->> 'email',
      'displayName', v_ctx ->> 'displayName'),
    'me', (
      select jsonb_build_object(
          'id', p.id, 'name', p.name, 'avatar', p.avatar,
          'color', p.color, 'wishlist', p.wishlist)
      from public.participants p
      where p.id = v_me
    ),
    'isOwner', v_owner,
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', p.id, 'name', p.name, 'avatar', p.avatar, 'color', p.color,
          'wishlist', case
            when v_vis = 'all' or p.id = v_me or p.id = v_target then p.wishlist
            else '' end)
        order by p.created_at, p.id)
      from public.participants p
      where p.room_id = v_room_id
    ), '[]'::jsonb),
    'gifts', coalesce((
      select jsonb_agg(jsonb_build_object(
          'recipientId', p.id,
          'assigned', a.id is not null,
          'sent', coalesce(a.sent, false),
          'accepted', coalesce(a.sent, false) and coalesce(a.accepted, false),
          'style', case when coalesce(a.sent, false) then public._clean_wrap_style(a.wrap_style) end,
          'color', case when coalesce(a.sent, false) then public._clean_wrap_color(a.wrap_color) end,
          'contents', case when coalesce(a.sent, false) and coalesce(a.accepted, false)
            then public._clean_contents(a.wrap_contents) end)
        order by p.created_at, p.id)
      from public.participants p
      left join public.assignments a on a.room_id = v_room_id and a.recipient_id = p.id
      where p.room_id = v_room_id
    ), '[]'::jsonb),
    'myTarget', (
      select jsonb_build_object(
          'assignmentId', a.id,
          'recipient', jsonb_build_object(
            'id', t.id, 'name', t.name, 'avatar', t.avatar,
            'color', t.color, 'wishlist', t.wishlist),
          'sent', a.sent,
          'style', public._clean_wrap_style(a.wrap_style),
          'color', public._clean_wrap_color(a.wrap_color),
          'contents', public._clean_contents(a.wrap_contents))
      from public.assignments a
      join public.participants t on t.id = a.recipient_id
      where a.room_id = v_room_id and a.santa_id = v_me
    ),
    'assignments', case when v_owner then coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', a.id, 'santaId', a.santa_id, 'recipientId', a.recipient_id, 'sent', a.sent))
      from public.assignments a
      where a.room_id = v_room_id
    ), '[]'::jsonb) end
  );
end;
$$;

-- Новая комната. Создатель сразу становится её участником и организатором.
create or replace function public.create_room(
  p_name text,
  p_budget text,
  p_avatar text,
  p_color text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public._ensure_profile_row();
  v_dname text;
  v_name text := left(trim(p_name), 60);
  v_code text;
  v_room_id int;
  v_owner_id int;
begin
  if v_name = '' then
    raise exception 'Укажите название комнаты';
  end if;
  select display_name into v_dname from public.profiles where id = v_uid;
  v_code := public._new_room_code();
  insert into public.rooms (code, name, budget, owner_profile_id)
    values (v_code, v_name, left(trim(coalesce(p_budget, '')), 40), v_uid)
    returning id into v_room_id;
  insert into public.participants (room_id, profile_id, name, avatar, color, token)
    values (
      v_room_id, v_uid, left(v_dname, 40),
      public._clean_avatar(p_avatar), public._clean_color(p_color),
      public._rand_token()
    )
    returning id into v_owner_id;
  update public.rooms set owner_id = v_owner_id where id = v_room_id;
  return jsonb_build_object('code', v_code);
end;
$$;

-- Вступление в комнату. Имя берётся из профиля, аватар и цвет — из формы.
create or replace function public.join_room(
  p_code text,
  p_avatar text,
  p_color text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb := public._room_ctx(p_code);
  v_room_id int := (v_ctx ->> 'roomId')::int;
  v_uid uuid := (v_ctx ->> 'uid')::uuid;
  v_dname text := v_ctx ->> 'displayName';
  v_avatar text := public._clean_avatar(p_avatar);
  v_color text := public._clean_color(p_color);
  v_dup boolean;
begin
  if (v_ctx ->> 'meId') is not null then
    return jsonb_build_object('ok', true, 'existed', true);
  end if;
  select exists(
    select 1 from public.participants
    where room_id = v_room_id
      and lower(name) = lower(v_dname)
      and avatar = v_avatar
      and color = v_color
  ) into v_dup;
  if v_dup then
    raise exception 'Такой пользователь уже есть в комнате. Как минимум должен отличаться аватар, цвет или имя пользователя.';
  end if;
  begin
    insert into public.participants (room_id, profile_id, name, avatar, color, token)
      values (v_room_id, v_uid, left(v_dname, 40), v_avatar, v_color, public._rand_token());
  exception when unique_violation then
    -- Двойное нажатие: этот профиль уже успел войти в комнату.
    return jsonb_build_object('ok', true, 'existed', true);
  end;
  return jsonb_build_object('ok', true, 'existed', false);
end;
$$;

-- Свои пожелания, имя, аватар и цвет в этой комнате.
-- Если переданы только пожелания — меняются только они.
drop function if exists public.update_profile(text, text, text, text);
drop function if exists public.add_participant(text, text, text, text);
create or replace function public.update_profile(
  p_code text,
  p_wishlist text,
  p_avatar text default null,
  p_color text default null,
  p_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb := public._room_ctx(p_code);
  v_room_id int := (v_ctx ->> 'roomId')::int;
  v_me int := (v_ctx ->> 'meId')::int;
  v_wish text := left(coalesce(p_wishlist, ''), 1000);
  v_old_name text;
  v_old_avatar text;
  v_old_color text;
  v_name text;
  v_avatar text;
  v_color text;
  v_dup boolean;
begin
  if v_me is null then
    raise exception 'Сначала присоединитесь к комнате';
  end if;
  if p_avatar is null and p_color is null and p_name is null then
    update public.participants set wishlist = v_wish where id = v_me;
    return jsonb_build_object('ok', true);
  end if;
  select name, avatar, color into v_old_name, v_old_avatar, v_old_color
    from public.participants where id = v_me;
  v_name := left(coalesce(nullif(trim(p_name), ''), v_old_name), 40);
  v_avatar := public._clean_avatar(coalesce(p_avatar, v_old_avatar));
  v_color := public._clean_color(coalesce(p_color, v_old_color));
  select exists(
    select 1 from public.participants
    where room_id = v_room_id and id <> v_me
      and lower(name) = lower(v_name)
      and avatar = v_avatar
      and color = v_color
  ) into v_dup;
  if v_dup then
    raise exception 'Такой пользователь уже есть в комнате. Как минимум должен отличаться аватар, цвет или имя пользователя.';
  end if;
  update public.participants
    set name = v_name, avatar = v_avatar, color = v_color, wishlist = v_wish
    where id = v_me;
  return jsonb_build_object('ok', true);
end;
$$;

-- Упаковка и содержимое своего подарка (выбирает Санта).
drop function if exists public.set_wrap(text, text, text);
create or replace function public.set_wrap(
  p_code text,
  p_style text,
  p_color text,
  p_contents text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb := public._room_ctx(p_code);
  v_n int;
begin
  if (v_ctx ->> 'meId') is null then
    raise exception 'Сначала присоединитесь к комнате';
  end if;
  if public._clean_wrap_style(p_style) is distinct from p_style
    or public._clean_wrap_color(p_color) is distinct from p_color
    or public._clean_contents(p_contents) is distinct from p_contents then
    raise exception 'Неизвестная упаковка';
  end if;
  update public.assignments
    set wrap_style = p_style, wrap_color = p_color, wrap_contents = p_contents
    where room_id = (v_ctx ->> 'roomId')::int
      and santa_id = (v_ctx ->> 'meId')::int;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Назначение не найдено';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Отметка об отправке. Санта отмечает свой подарок, организатор — любой.
create or replace function public.set_sent(
  p_code text,
  p_sent boolean,
  p_recipient_id int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb := public._room_ctx(p_code);
  v_n int;
begin
  if (v_ctx ->> 'meId') is null then
    raise exception 'Сначала присоединитесь к комнате';
  end if;
  if p_recipient_id is not null and (v_ctx ->> 'isOwner')::boolean then
    update public.assignments
      set sent = p_sent,
          sent_at = case when p_sent then now() end,
          accepted = case when p_sent then accepted else false end
      where room_id = (v_ctx ->> 'roomId')::int and recipient_id = p_recipient_id;
  else
    update public.assignments
      set sent = p_sent,
          sent_at = case when p_sent then now() end,
          accepted = case when p_sent then accepted else false end
      where room_id = (v_ctx ->> 'roomId')::int
        and santa_id = (v_ctx ->> 'meId')::int;
  end if;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Назначение не найдено';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Принять подарок может только получатель, и только отправленный.
create or replace function public.accept_gift(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb := public._room_ctx(p_code);
  v_n int;
begin
  if (v_ctx ->> 'meId') is null then
    raise exception 'Сначала присоединитесь к комнате';
  end if;
  update public.assignments
    set accepted = true
    where room_id = (v_ctx ->> 'roomId')::int
      and recipient_id = (v_ctx ->> 'meId')::int
      and sent = true;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Подарок для вас ещё не отправлен';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Жеребьёвка для всех: один случайный круг, никто не дарит сам себе.
create or replace function public.draw_full(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb := public._room_ctx(p_code);
  v_room_id int := (v_ctx ->> 'roomId')::int;
  v_ids int[];
  v_n int;
  i int;
begin
  if (v_ctx ->> 'meId') is null then
    raise exception 'Сначала присоединитесь к комнате';
  end if;
  if not (v_ctx ->> 'isOwner')::boolean then
    raise exception 'Только организатор может это сделать';
  end if;
  select coalesce(array_agg(id order by random()), '{}') into v_ids
    from public.participants where room_id = v_room_id;
  v_n := coalesce(array_length(v_ids, 1), 0);
  if v_n < 2 then
    raise exception 'Нужно минимум 2 участника';
  end if;
  delete from public.assignments where room_id = v_room_id;
  for i in 1..v_n loop
    insert into public.assignments (room_id, santa_id, recipient_id)
      values (v_room_id, v_ids[i], v_ids[(i % v_n) + 1]);
  end loop;
  return jsonb_build_object('ok', true);
end;
$$;

-- Жеребьёвка для оставшихся: ручные пары сохраняются.
create or replace function public.draw_fill(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb := public._room_ctx(p_code);
  v_room_id int := (v_ctx ->> 'roomId')::int;
  v_total int;
  v_santas int[];
  v_recips int[];
  v_shuffled int[];
  v_n int;
  v_ok boolean;
  i int;
begin
  if (v_ctx ->> 'meId') is null then
    raise exception 'Сначала присоединитесь к комнате';
  end if;
  if not (v_ctx ->> 'isOwner')::boolean then
    raise exception 'Только организатор может это сделать';
  end if;
  select count(*) into v_total from public.participants where room_id = v_room_id;
  if v_total < 2 then
    raise exception 'Нужно минимум 2 участника';
  end if;
  select coalesce(array_agg(id), '{}') into v_santas
    from public.participants p
    where p.room_id = v_room_id
      and not exists (
        select 1 from public.assignments a
        where a.room_id = v_room_id and a.santa_id = p.id);
  select coalesce(array_agg(id), '{}') into v_recips
    from public.participants p
    where p.room_id = v_room_id
      and not exists (
        select 1 from public.assignments a
        where a.room_id = v_room_id and a.recipient_id = p.id);
  v_n := coalesce(array_length(v_santas, 1), 0);
  if v_n = 0 then
    return jsonb_build_object('ok', true);
  end if;
  if v_n <> coalesce(array_length(v_recips, 1), 0) then
    raise exception 'Не получается распределить оставшихся без самоназначения. Измените ручные назначения или сделайте полный рандом.';
  end if;
  for attempt in 1..200 loop
    select array_agg(x order by random()) into v_shuffled from unnest(v_recips) as x;
    v_ok := true;
    for i in 1..v_n loop
      if v_santas[i] = v_shuffled[i] then
        v_ok := false;
        exit;
      end if;
    end loop;
    if v_ok then
      for i in 1..v_n loop
        insert into public.assignments (room_id, santa_id, recipient_id)
          values (v_room_id, v_santas[i], v_shuffled[i]);
      end loop;
      return jsonb_build_object('ok', true);
    end if;
  end loop;
  raise exception 'Не получается распределить оставшихся без самоназначения. Измените ручные назначения или сделайте полный рандом.';
end;
$$;

-- Ручное назначение Санты. Получатель null — снять назначение.
create or replace function public.set_pair(
  p_code text,
  p_santa int,
  p_recipient int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb := public._room_ctx(p_code);
  v_room_id int := (v_ctx ->> 'roomId')::int;
  v_found boolean;
begin
  if (v_ctx ->> 'meId') is null then
    raise exception 'Сначала присоединитесь к комнате';
  end if;
  if not (v_ctx ->> 'isOwner')::boolean then
    raise exception 'Только организатор может это сделать';
  end if;
  select exists(select 1 from public.participants where room_id = v_room_id and id = p_santa)
    into v_found;
  if not v_found then
    raise exception 'Санта не найден';
  end if;
  if p_recipient is null then
    delete from public.assignments where room_id = v_room_id and santa_id = p_santa;
    return jsonb_build_object('ok', true);
  end if;
  select exists(select 1 from public.participants where room_id = v_room_id and id = p_recipient)
    into v_found;
  if not v_found then
    raise exception 'Получатель не найден';
  end if;
  if p_recipient = p_santa then
    raise exception 'Нельзя дарить самому себе';
  end if;
  delete from public.assignments
    where room_id = v_room_id and (santa_id = p_santa or recipient_id = p_recipient);
  insert into public.assignments (room_id, santa_id, recipient_id)
    values (v_room_id, p_santa, p_recipient);
  return jsonb_build_object('ok', true);
end;
$$;

-- Сбросить все назначения в комнате.
create or replace function public.reset_draw(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb := public._room_ctx(p_code);
begin
  if (v_ctx ->> 'meId') is null then
    raise exception 'Сначала присоединитесь к комнате';
  end if;
  if not (v_ctx ->> 'isOwner')::boolean then
    raise exception 'Только организатор может это сделать';
  end if;
  delete from public.assignments where room_id = (v_ctx ->> 'roomId')::int;
  return jsonb_build_object('ok', true);
end;
$$;

-- Удалить участника из комнаты (кроме себя).
create or replace function public.kick_participant(
  p_code text,
  p_participant int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb := public._room_ctx(p_code);
begin
  if (v_ctx ->> 'meId') is null then
    raise exception 'Сначала присоединитесь к комнате';
  end if;
  if not (v_ctx ->> 'isOwner')::boolean then
    raise exception 'Только организатор может это сделать';
  end if;
  if p_participant = (v_ctx ->> 'meId')::int then
    raise exception 'Нельзя удалить себя';
  end if;
  delete from public.participants
    where room_id = (v_ctx ->> 'roomId')::int and id = p_participant;
  return jsonb_build_object('ok', true);
end;
$$;


-- Кто видит пожелания на подарке: все участники или только Санта.
create or replace function public.set_wishlist_visibility(
  p_code text,
  p_value text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb := public._room_ctx(p_code);
begin
  if (v_ctx ->> 'meId') is null then
    raise exception 'Сначала присоединитесь к комнате';
  end if;
  if not (v_ctx ->> 'isOwner')::boolean then
    raise exception 'Только организатор может это сделать';
  end if;
  if p_value not in ('all', 'santa') then
    raise exception 'Неизвестная настройка';
  end if;
  update public.rooms
    set wishlist_visibility = p_value
    where id = (v_ctx ->> 'roomId')::int;
  return jsonb_build_object('ok', true);
end;
$$;

-- Название комнаты может поменять только организатор.
create or replace function public.set_room_name(p_code text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb := public._room_ctx(p_code);
  v_name text := left(trim(coalesce(p_name, '')), 60);
begin
  if (v_ctx ->> 'meId') is null then
    raise exception 'Сначала присоединитесь к комнате';
  end if;
  if not (v_ctx ->> 'isOwner')::boolean then
    raise exception 'Только организатор может это сделать';
  end if;
  if v_name = '' then
    raise exception 'Укажите название комнаты';
  end if;
  update public.rooms set name = v_name where id = (v_ctx ->> 'roomId')::int;
  return jsonb_build_object('ok', true);
end;
$$;
