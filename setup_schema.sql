create table if not exists public.user_profiles (
  id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  condition_tags text[] default ARRAY[]::text[],
  created_at timestamptz default now(),
  primary key (id)
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, auth'
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name, 
    condition_tags, 
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    ARRAY[]::text[],
    now()
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW 
EXECUTE PROCEDURE public.handle_new_user();

create table public.appointment_reminders (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_profile_id uuid not null,
  appointment_name text not null,
  date timestamp with time zone null default now(),
  notified boolean null default false,
  constraint appointment_reminders_pkey primary key (id),
  constraint appointment_reminders_user_profile_id_fkey foreign KEY (user_profile_id) references user_profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists appointment_reminders_user_profile_id_idx on public.appointment_reminders using btree (user_profile_id) TABLESPACE pg_default;
create table public.chat_messages (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_profile_id uuid not null,
  room_id text not null,
  message text not null,
  created_at timestamp with time zone null default now(),
  constraint chat_messages_pkey primary key (id),
  constraint chat_messages_user_profile_id_fkey foreign KEY (user_profile_id) references user_profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_chat_messages_user_profile on public.chat_messages using btree (user_profile_id) TABLESPACE pg_default;
create extension if not exists pg_cron;
select cron.schedule(
  'check_due_reminders', 
  '*/1 * * * *', 
  $$ select notify_due_reminders(); $$
);
create table public.files (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_profile_id uuid not null,
  filename text not null,
  url text not null,
  file_type text null,
  uploaded_at timestamp with time zone null default now(),
  tags text[] null default '{}'::text[],
  constraint files_pkey primary key (id),
  constraint files_user_profile_id_fkey foreign KEY (user_profile_id) references user_profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_files_user_profile on public.files using btree (user_profile_id) TABLESPACE pg_default;
create table public.health_logs (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_profile_id uuid not null,
  symptom_type text null,
  severity integer null,
  mood text null,
  vitals jsonb null,
  medication_intake text null,
  notes text null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone null,
  constraint health_logs_pkey primary key (id),
  constraint health_logs_user_profile_id_fkey foreign KEY (user_profile_id) references user_profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_health_logs_user_profile on public.health_logs using btree (user_profile_id) TABLESPACE pg_default;
create table public.medication_reminders (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_profile_id uuid not null,
  medication_name text not null,
  dosage text null,
  reminder_time timestamp with time zone not null,
  recurrence text null,
  calendar_sync_token text null,
  created_at timestamp with time zone null default now(),
  notified boolean null default false,
  constraint medication_reminders_pkey primary key (id),
  constraint medication_reminders_user_profile_id_fkey foreign KEY (user_profile_id) references user_profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_medication_reminders_user_profile on public.medication_reminders using btree (user_profile_id) TABLESPACE pg_default;
create or replace function notify_due_reminders() returns void as $$
declare
  r record;
begin
  for r in 
    select * from appointment_reminders 
    where date <= now()
      and not exists (
        select 1 from user_notifications 
        where reminder_id = concat('appt-', id)
      )
  loop
    insert into user_notifications(user_profile_id, reminder_id, type, title, due_time, notified)
    values(r.user_profile_id::text, concat('appt-', r.id), 'appointment', r.appointment_name, r.date, true);
  end loop;

  for r in 
    select * from medication_reminders
    where reminder_time <= now()
      and not exists (
        select 1 from user_notifications 
        where reminder_id = concat('med-', id)
      )
  loop
    insert into user_notifications(user_profile_id, reminder_id, type, title, due_time, notified)
    values(r.user_profile_id::text, concat('med-', r.id), 'medication', r.medication_name, r.reminder_time, true);
  end loop;
end;
$$ language plpgsql;
create table public.user_notifications (
  id uuid not null default gen_random_uuid (),
  user_profile_id text not null,
  reminder_id text not null,
  type text not null,
  title text not null,
  due_time timestamp with time zone not null,
  notified boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint user_notifications_pkey primary key (id)
) TABLESPACE pg_default;
