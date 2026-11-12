-- Existing rows remain legacy records. No instructor or subject is guessed from a name.
create table public.account_roles (
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('administrator','registrar','instructor')),
 primary key(user_id,role)
);
alter table public.account_roles enable row level security;
create function public.has_role(required_role text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.account_roles where user_id=auth.uid() and role=required_role)
$$;
revoke all on function public.has_role(text) from public,anon;
grant execute on function public.has_role(text) to authenticated;
create policy own_roles on public.account_roles for select to authenticated using(user_id=auth.uid());
revoke all on public.account_roles from anon,authenticated;
grant select on public.account_roles to authenticated;
insert into public.account_roles(user_id,role) select user_id,'registrar' from public.staff_members;

alter table public.instructors add column user_id uuid unique references auth.users(id),
 add column instructor_code text unique,
 add column active boolean not null default false,
 add constraint instructor_account_required check(not active or (user_id is not null and instructor_code is not null)),
 add constraint instructor_code_length check(instructor_code is null or length(trim(instructor_code)) between 1 and 40);
create function public.instructor_eligible(profile_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.instructors i join auth.users u on u.id=i.user_id
 where i.id=profile_id and i.active and u.email_confirmed_at is not null
 and (u.banned_until is null or u.banned_until<=now())
 and exists(select 1 from public.account_roles r where r.user_id=u.id and r.role='instructor'))
$$;
revoke all on function public.instructor_eligible(uuid) from public,anon;
grant execute on function public.instructor_eligible(uuid) to authenticated;
drop policy instructors_staff on public.instructors;
create policy instructors_read on public.instructors for select to authenticated
 using(public.has_role('registrar') or public.has_role('administrator') or user_id=auth.uid());
revoke insert,update,delete on public.instructors from authenticated;
create view public.assignable_instructors with(security_barrier=true) as
 select id,name,instructor_code from public.instructors
 where public.has_role('registrar') and public.instructor_eligible(id);
revoke all on public.assignable_instructors from public,anon;
grant select on public.assignable_instructors to authenticated;

create table public.curricula (
 id text primary key, name text not null, program text not null,
 provisional boolean not null default true
);
insert into public.curricula values('bsit-provisional-2026','BSIT supplied curriculum (provisional)','BSIT',true);
create table public.subject_components (
 curriculum_id text not null references public.curricula(id), code text not null,
 title text not null, units integer not null check(units between 0 and 12),
 parent_code text, year_level integer check(year_level between 1 and 4),
 semester integer check(semester in (1,2)), track text, active boolean not null default false,
 primary key(curriculum_id,code),
 foreign key(curriculum_id,parent_code) references public.subject_components(curriculum_id,code) deferrable initially deferred,
 check(parent_code is null or (parent_code<>code and units=0))
);
create function public.validate_component_parent() returns trigger language plpgsql set search_path='' as $$
begin
 if new.parent_code is not null and not exists(select 1 from public.subject_components p
 where p.curriculum_id=new.curriculum_id and p.code=new.parent_code and p.parent_code is null) then
 raise exception 'A lab requires an explicit main subject parent'; end if;
 return new;
end $$;
create constraint trigger component_parent after insert or update on public.subject_components
 deferrable initially deferred for each row execute function public.validate_component_parent();

create table public.academic_terms (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 80),
 starts_on date not null, ends_on date not null, semester integer not null check(semester in(1,2)),
 check(ends_on>=starts_on), unique(name)
);
create table public.class_sections (
 id uuid primary key default gen_random_uuid(), term_id uuid not null references public.academic_terms(id),
 curriculum_id text not null references public.curricula(id),
 name text not null check(length(trim(name)) between 1 and 80), year_level integer not null check(year_level between 1 and 4),
 track text check(track in('Data Network Track','Software Development Track','Information Management Track')),
 unique(term_id,name)
);
create table public.subject_offerings (
 id uuid primary key default gen_random_uuid(), section_id uuid not null references public.class_sections(id),
 curriculum_id text not null, parent_code text not null, class_code text not null check(length(trim(class_code)) between 1 and 40),
 foreign key(curriculum_id,parent_code) references public.subject_components(curriculum_id,code),
 unique(section_id,curriculum_id,parent_code,class_code)
);
alter table public.curricula enable row level security;
alter table public.subject_components enable row level security;
alter table public.academic_terms enable row level security;
alter table public.class_sections enable row level security;
alter table public.subject_offerings enable row level security;
create policy curriculum_read on public.curricula for select to authenticated using(true);
create policy component_read on public.subject_components for select to authenticated using(true);
create policy term_read on public.academic_terms for select to authenticated using(true);
create policy section_read on public.class_sections for select to authenticated using(true);
create policy term_admin on public.academic_terms for insert to authenticated with check(public.has_role('administrator'));
create policy section_admin on public.class_sections for insert to authenticated with check(public.has_role('administrator'));
create policy offering_registrar on public.subject_offerings for all to authenticated
 using(public.has_role('registrar')) with check(public.has_role('registrar'));
revoke all on public.curricula,public.subject_components,public.academic_terms,public.class_sections,public.subject_offerings from anon,authenticated;
grant select on public.curricula,public.subject_components,public.academic_terms,public.class_sections,public.subject_offerings to authenticated;
grant insert on public.academic_terms,public.class_sections,public.subject_offerings to authenticated;

alter table public.bookings add column kind text not null default 'legacy' check(kind in('legacy','class','activity')),
 add column offering_id uuid references public.subject_offerings(id),
 add column component_code text,
 add column class_code text, add column course text, add column units integer,
 add column subject_code text, add column subject_name text, add column year_level integer,
 add column term_id uuid references public.academic_terms(id), add column section_id uuid references public.class_sections(id);
-- Eligibility and canonical metadata are enforced even for direct REST writes.
create function public.validate_academic_booking() returns trigger
language plpgsql security definer set search_path='' as $$
declare o public.subject_offerings; c public.subject_components; p public.subject_components;
 s public.class_sections; t public.academic_terms;
begin
 if new.kind='legacy' then
   if tg_op='INSERT' then raise exception 'Map new classes to the approved catalog'; end if;
   if new.published and (not old.published or new is distinct from old) then
     raise exception 'Map this legacy class to a subject and instructor before republishing or editing';
   end if;
   return new;
 end if;
 if new.kind='activity' then
   if new.instructor_id is not null or new.offering_id is not null or new.component_code is not null then
     raise exception 'Activities cannot contain academic assignments'; end if;
   new.class_code=null; new.course=null; new.units=null; new.subject_code=null;
   new.subject_name=null; new.year_level=null; new.term_id=null; new.section_id=null;
   new.instructor_name='Department activity';
   return new;
 end if;
 select * into o from public.subject_offerings where id=new.offering_id;
 if not found then raise exception 'Choose a valid subject offering'; end if;
 select * into s from public.class_sections where id=o.section_id;
 select * into t from public.academic_terms where id=s.term_id;
 select * into p from public.subject_components where curriculum_id=o.curriculum_id and code=o.parent_code;
 select * into c from public.subject_components where curriculum_id=o.curriculum_id and code=new.component_code;
 if c.code is null or not c.active or not p.active or p.parent_code is not null or
   not (c.code=p.code or c.parent_code=p.code) or s.curriculum_id<>o.curriculum_id then
   raise exception 'Choose an active component belonging to the subject and section'; end if;
 if p.year_level is distinct from s.year_level or p.semester is distinct from t.semester or
   (p.track is not null and p.track is distinct from s.track) then
   raise exception 'Subject year, semester and track must match the section'; end if;
 if (new.starts_at at time zone 'Asia/Manila')::date<t.starts_on or
    (new.ends_at at time zone 'Asia/Manila')::date>t.ends_on then
   raise exception 'Every meeting must fall within the academic term dates'; end if;
 -- Allow unpublishing obsolete assignments even when their account is no longer eligible.
 if not (tg_op='UPDATE' and old.published and not new.published and
     new.instructor_id is not distinct from old.instructor_id and new.offering_id is not distinct from old.offering_id and
     new.component_code is not distinct from old.component_code and new.room_id=old.room_id and
     new.starts_at=old.starts_at and new.ends_at=old.ends_at) and not public.instructor_eligible(new.instructor_id) then
   raise exception 'Choose an active instructor with a confirmed account'; end if;
 new.class_code=o.class_code; new.course=(select program from public.curricula where id=o.curriculum_id);
 new.units=c.units; new.subject_code=c.code; new.subject_name=c.title; new.year_level=s.year_level;
 new.term_id=t.id; new.section_id=s.id;
 new.title=left(o.class_code || ' - ' || case when c.parent_code is not null then 'Lab - ' else '' end || p.title,200);
 new.instructor_name=(select name from public.instructors where id=new.instructor_id);
 return new;
end $$;
revoke all on function public.validate_academic_booking() from public,anon,authenticated;
create trigger academic_booking before insert or update on public.bookings for each row execute function public.validate_academic_booking();
alter table public.bookings add constraint instructor_no_overlap exclude using gist
 (instructor_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where(published and kind='class');

drop policy bookings_staff on public.bookings;
create policy bookings_registrar on public.bookings for all to authenticated
 using(public.has_role('registrar')) with check(public.has_role('registrar'));
create policy bookings_instructor_read on public.bookings for select to authenticated
 using(public.has_role('instructor') and exists(select 1 from public.instructors i where i.id=instructor_id and i.user_id=auth.uid()));
drop policy notifications_staff on public.sms_notifications;
create policy notifications_registrar on public.sms_notifications for all to authenticated
 using(public.has_role('registrar')) with check(public.has_role('registrar'));
-- Retain the six existing public columns, append only explicitly public academic fields.
create or replace view public.published_schedule with(security_barrier=true) as
 select id,room_id,title,instructor_name,starts_at,ends_at,kind,class_code,course,units,subject_code,subject_name,year_level
 from public.bookings where published;

create function public.save_class_booking(
 p_id uuid, p_section uuid, p_parent text, p_component text, p_class_code text,
 p_instructor uuid, p_room text, p_size integer, p_published boolean, p_slots jsonb
) returns integer language plpgsql set search_path='' as $$
declare section public.class_sections; offering uuid; slot jsonb; affected integer; total integer=0;
begin
 if not public.has_role('registrar') then raise insufficient_privilege using message='Registrar access required'; end if;
 if p_slots is null or jsonb_typeof(p_slots)<>'array' or jsonb_array_length(p_slots) not between 1 and 150 then
   raise exception 'Choose between 1 and 150 meeting dates'; end if;
 if p_id is not null and jsonb_array_length(p_slots)<>1 then raise exception 'Edit one occurrence at a time'; end if;
 select * into section from public.class_sections where id=p_section;
 if not found then raise exception 'Choose a valid section'; end if;
 insert into public.subject_offerings(section_id,curriculum_id,parent_code,class_code)
 values(section.id,section.curriculum_id,p_parent,trim(p_class_code))
 on conflict(section_id,curriculum_id,parent_code,class_code) do nothing returning id into offering;
 if offering is null then select id into offering from public.subject_offerings where section_id=section.id
 and curriculum_id=section.curriculum_id and parent_code=p_parent and class_code=trim(p_class_code); end if;
 for slot in select value from jsonb_array_elements(p_slots) loop
   if p_id is null then
     insert into public.bookings(kind,offering_id,component_code,instructor_id,room_id,class_size,published,title,instructor_name,starts_at,ends_at)
     values('class',offering,p_component,p_instructor,p_room,p_size,p_published,'Derived','Derived',(slot->>'start')::timestamptz,(slot->>'end')::timestamptz);
   else
     update public.bookings set kind='class',offering_id=offering,component_code=p_component,instructor_id=p_instructor,
       room_id=p_room,class_size=p_size,published=p_published,starts_at=(slot->>'start')::timestamptz,ends_at=(slot->>'end')::timestamptz where id=p_id;
     get diagnostics affected=row_count;
     if affected<>1 then raise exception 'Booking not found or no access'; end if;
   end if;
   total=total+1;
 end loop;
 return total;
end $$;
revoke all on function public.save_class_booking(uuid,uuid,text,text,text,uuid,text,integer,boolean,jsonb) from public,anon;
grant execute on function public.save_class_booking(uuid,uuid,text,text,text,uuid,text,integer,boolean,jsonb) to authenticated;

-- Administrator links an existing confirmed account; never creates Auth users or guesses legacy matches.
create function public.provision_instructor(p_email text,p_code text,p_name text,p_active boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare account_id uuid; profile_id uuid;
begin
 if not public.has_role('administrator') then raise insufficient_privilege using message='Administrator access required'; end if;
 if length(trim(p_name)) not between 1 and 100 or length(trim(p_code)) not between 1 and 40 then raise exception 'Enter a name and instructor code'; end if;
 select id into account_id from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null
 and (banned_until is null or banned_until<=now());
 if account_id is null then raise exception 'Create and confirm this account in Supabase Auth first'; end if;
 insert into public.account_roles(user_id,role) values(account_id,'instructor') on conflict do nothing;
 insert into public.instructors(user_id,instructor_code,name,active) values(account_id,trim(p_code),trim(p_name),p_active)
 on conflict(user_id) do update set instructor_code=excluded.instructor_code,name=excluded.name,active=excluded.active
 returning id into profile_id;
 return profile_id;
end $$;
revoke all on function public.provision_instructor(text,text,text,boolean) from public,anon;
grant execute on function public.provision_instructor(text,text,text,boolean) to authenticated;

-- Reviewed screenshot transcription. Repeatable; does not overwrite existing definitions.
insert into public.subject_components(curriculum_id,code,title,units,parent_code,year_level,semester,track,active) values
('bsit-provisional-2026','ITCC41','Computer Programming 1',3,null,1,1,null,true),
('bsit-provisional-2026','ITCC43','Introduction to Computing',3,null,1,1,null,true),
('bsit-provisional-2026','ITCC41A','Computer Programming 1, Lab',0,'ITCC41',1,1,null,true),
('bsit-provisional-2026','GEC 11','Understanding the Self',3,null,1,1,null,true),
('bsit-provisional-2026','GEC 14','Mathematics in the Modern World',3,null,1,1,null,true),
('bsit-provisional-2026','ITCC43A','Introduction to Computing, Lab',0,'ITCC43',1,1,null,true),
('bsit-provisional-2026','GEC 15','Purposive Communication',3,null,1,1,null,true),
('bsit-provisional-2026','PE31','Physical Activities Towards Health and Fitness I (PATH-Fit I): Movement Competency Training',2,null,1,1,null,true),
('bsit-provisional-2026','GEC 18','Ethics',3,null,1,1,null,true),
('bsit-provisional-2026','NSTP1','National Service Training Program I',3,null,1,1,null,false),
('bsit-provisional-2026','ITCC42','Discrete Structures',3,null,1,2,null,true),
('bsit-provisional-2026','ITCC44','Computer Programming 2',3,null,1,2,null,true),
('bsit-provisional-2026','ITCC44A','Computer Programming 2, Lab',0,'ITCC44',1,2,null,true),
('bsit-provisional-2026','GEC 13','The Contemporary World',3,null,1,2,null,true),
('bsit-provisional-2026','GEC 12','Readings in Philippine History',3,null,1,2,null,true),
('bsit-provisional-2026','GEC 16','Art Appreciation',3,null,1,2,null,true),
('bsit-provisional-2026','GEE 16','The Entrepreneurial Mind',3,null,1,2,null,true),
('bsit-provisional-2026','GEC 19','The Life and Works of Jose Rizal',3,null,1,2,null,true),
('bsit-provisional-2026','NSTP2','National Service Training Program II',3,null,1,2,null,false),
('bsit-provisional-2026','PE32','Physical Activities Towards Health and Fitness 2 (PATH-Fit 2): Exercise-based Fitness Activities',2,null,1,2,null,true),
('bsit-provisional-2026','ITCC45','Computer Programming 3',3,null,2,1,null,true),
('bsit-provisional-2026','ITCC47','Data Structures and Algorithms',3,null,2,1,null,true),
('bsit-provisional-2026','IT51','Computer Architecture',3,null,2,1,null,true),
('bsit-provisional-2026','IT53','Fundamentals of Networking',3,null,2,1,null,true),
('bsit-provisional-2026','IT55','Web Systems and Technologies 1',3,null,2,1,null,true),
('bsit-provisional-2026','GEC 17','Science, Technology and Society',3,null,2,1,null,true),
('bsit-provisional-2026','GEE 11','Environmental Science',3,null,2,1,null,true),
('bsit-provisional-2026','ITCC45A','Computer Programming 3, Lab',0,'ITCC45',2,1,null,true),
('bsit-provisional-2026','ITCC47A','Data Structures and Algorithms, Lab',0,'ITCC47',2,1,null,true),
('bsit-provisional-2026','IT51A','Computer Architecture, Lab',0,'IT51',2,1,null,true),
('bsit-provisional-2026','IT53A','Fundamentals of Networking, Lab',0,'IT53',2,1,null,true),
('bsit-provisional-2026','IT55A','Web Systems and Technologies 1, Lab',0,'IT55',2,1,null,true),
('bsit-provisional-2026','PE33','Physical Activities Towards Health and Fitness 3 (PATH-Fit 3): Any of the Menu of Courses on Dance Sports, Martial Arts, Group Exercises, and Outdoor and Adventure Activities',2,null,2,1,null,true),
('bsit-provisional-2026','ITCC46','Information Management',3,null,2,2,null,true),
('bsit-provisional-2026','ITCC48','Application Development and Emerging Technologies',3,null,2,2,null,true),
('bsit-provisional-2026','IT52','Operating Systems',3,null,2,2,null,true),
('bsit-provisional-2026','IT54','Routing and Switching',3,null,2,2,null,true),
('bsit-provisional-2026','IT 56','Web Systems and Technology 2',3,null,2,2,null,true),
('bsit-provisional-2026','STAT22','Elementary Statistics and Probability',3,null,2,2,null,true),
('bsit-provisional-2026','GEE 15','Gender and Society',3,null,2,2,null,true),
('bsit-provisional-2026','ITCC46A','Information Management, Lab',0,'ITCC46',2,2,null,true),
('bsit-provisional-2026','ITCC48A','Application Development and Emerging Technologies, Lab',0,'ITCC48',2,2,null,true),
('bsit-provisional-2026','IT52A','Operating System, Lab',0,'IT52',2,2,null,true),
('bsit-provisional-2026','IT54A','Routing and Switching, Lab',0,'IT54',2,2,null,true),
('bsit-provisional-2026','IT 56A','Web Systems and Technologies 2, Lab',0,'IT 56',2,2,null,true),
('bsit-provisional-2026','PE34','Physical Activities Towards Health and Fitness 4 (PATH-Fit 4): Any of the Menu of Courses on Dance, Sports, Martial Arts, Group Exercises, and Outdoor and Adventure Activities',2,null,2,2,null,true),
('bsit-provisional-2026','IT57','Introduction to Human Computer Interaction',3,null,3,1,null,true),
('bsit-provisional-2026','IT57A','Introduction to Human Computer Interaction, Lab',0,'IT57',3,1,null,true),
('bsit-provisional-2026','IT59','Software Engineering',3,null,3,1,null,true),
('bsit-provisional-2026','IT59A','Software Engineering, Lab',0,'IT59',3,1,null,true),
('bsit-provisional-2026','IT61','Fundamentals of Database Systems',3,null,3,1,null,true),
('bsit-provisional-2026','IT61A','Fundamentals of Database Systems, Lab',0,'IT61',3,1,null,true),
('bsit-provisional-2026','IT63','Multimedia Technologies',3,null,3,1,null,true),
('bsit-provisional-2026','IT63A','Multimedia Technologies, Lab',0,'IT63',3,1,null,true),
('bsit-provisional-2026','IT95','Research Methods for IT',3,null,3,1,null,true),
('bsit-provisional-2026','IT Elective 1','IT Elective',3,null,3,1,null,false),
('bsit-provisional-2026','IT Elective 2','IT Elective',3,null,3,1,null,false),
('bsit-provisional-2026','IT58','Emerging Technologies in HCI',3,null,3,2,null,true),
('bsit-provisional-2026','IT58A','Emerging Technologies in HCI, Lab',0,'IT58',3,2,null,true),
('bsit-provisional-2026','IT60','Information Assurance and Security 1',3,null,3,2,null,true),
('bsit-provisional-2026','IT60A','Information Assurance and Security 1, Lab',0,'IT60',3,2,null,true),
('bsit-provisional-2026','IT99','IT Trips and Seminars',1,null,3,2,null,true),
('bsit-provisional-2026','IT100.1','IT Capstone Project and Research I',3,null,3,2,null,true),
('bsit-provisional-2026','IT62','Technopreneurship',3,null,3,2,null,true),
('bsit-provisional-2026','IT Elective 3','IT Elective',3,null,3,2,null,false),
('bsit-provisional-2026','IT Elective 4','IT Elective',3,null,3,2,null,false),
('bsit-provisional-2026','IT65','Information Assurance and Security 2',3,null,4,1,null,true),
('bsit-provisional-2026','IT65A','Information Assurance and Security 2, Lab',0,'IT65',4,1,null,true),
('bsit-provisional-2026','IT67','Integrative Programming and Technologies',3,null,4,1,null,true),
('bsit-provisional-2026','IT67A','Integrative Programming and Technologies, Lab',0,'IT67',4,1,null,true),
('bsit-provisional-2026','IT 69','Systems Administration and Maintenance',3,null,4,1,null,true),
('bsit-provisional-2026','IT 69A','Systems Administration and Maintenance, Lab',0,'IT 69',4,1,null,true),
('bsit-provisional-2026','IT 71','Systems Integration and Architecture',3,null,4,1,null,true),
('bsit-provisional-2026','IT 71A','Systems Integration and Architecture, Lab',0,'IT 71',4,1,null,true),
('bsit-provisional-2026','IT 73','Social and Professional Issues in IT',3,null,4,1,null,true),
('bsit-provisional-2026','IT 100.2','IT Capstone Project and Research 2',3,null,4,1,null,true),
('bsit-provisional-2026','IT Elective 5','IT Elective',3,null,4,1,null,false),
('bsit-provisional-2026','IT 98','Practicum',6,null,4,2,null,true),
('bsit-provisional-2026','add101','addon units',3,null,4,2,null,false),
('bsit-provisional-2026','ITDN 81','Scaling Networks',3,null,null,null,'Data Network Track',false),
('bsit-provisional-2026','ITDN 81A','Scaling Networks, Lab',0,'ITDN 81',null,null,'Data Network Track',false),
('bsit-provisional-2026','ITDN 82','Connecting Networks',3,null,null,null,'Data Network Track',false),
('bsit-provisional-2026','ITDN 82A','Connecting Networks, Lab',0,'ITDN 82',null,null,'Data Network Track',false),
('bsit-provisional-2026','ITDN 83','Internet of Things',3,null,null,null,'Data Network Track',false),
('bsit-provisional-2026','ITDN 83A','Internet of Things, Lab',0,'ITDN 83',null,null,'Data Network Track',false),
('bsit-provisional-2026','ITDN 84','Network Security',3,null,null,null,'Data Network Track',false),
('bsit-provisional-2026','ITDN 84A','Network Security, Lab',0,'ITDN 84',null,null,'Data Network Track',false),
('bsit-provisional-2026','ITDN 85','Special Topics in Networking',3,null,null,null,'Data Network Track',false),
('bsit-provisional-2026','ITDN 85A','Special Topics in Networking, Lab',0,'ITDN 85',null,null,'Data Network Track',false),
('bsit-provisional-2026','ITSD 81','Desktop Application Development',3,null,null,null,'Software Development Track',false),
('bsit-provisional-2026','ITSD 81A','Desktop Application Development, Lab',0,'ITSD 81',null,null,'Software Development Track',false),
('bsit-provisional-2026','ITSD 82','Web Software Tools',3,null,null,null,'Software Development Track',false),
('bsit-provisional-2026','ITSD 82A','Web Software Tools, Lab',0,'ITSD 82',null,null,'Software Development Track',false),
('bsit-provisional-2026','ITSD 83','Mobile Application Development 1',3,null,null,null,'Software Development Track',false),
('bsit-provisional-2026','ITSD 83A','Mobile Application Development 1, Lab',0,'ITSD 83',null,null,'Software Development Track',false),
('bsit-provisional-2026','ITSD 84','Mobile Application Development 2',3,null,null,null,'Software Development Track',false),
('bsit-provisional-2026','ITSD 84A','Mobile Application Development 2, Lab',0,'ITSD 84',null,null,'Software Development Track',false),
('bsit-provisional-2026','ITSD 85','Special Topics in Software Development',3,null,null,null,'Software Development Track',false),
('bsit-provisional-2026','ITSD 85A','Special Topics in Software Development, Lab',0,'ITSD 85',null,null,'Software Development Track',false),
('bsit-provisional-2026','ITIM81','Programming for Data Science and AI',3,null,null,null,'Information Management Track',false),
('bsit-provisional-2026','ITIM81A','Programming for Data Science and AI, Lab',0,'ITIM81',null,null,'Information Management Track',false),
('bsit-provisional-2026','ITIM 82','Big Data Analytics',3,null,null,null,'Information Management Track',false),
('bsit-provisional-2026','ITIM 82A','Big Data Analytics, Lab',0,'ITIM 82',null,null,'Information Management Track',false),
('bsit-provisional-2026','ITIM 83','Data Mining',3,null,null,null,'Information Management Track',false),
('bsit-provisional-2026','ITIM 83A','Data Mining, Lab',0,'ITIM 83',null,null,'Information Management Track',false),
('bsit-provisional-2026','ITIM 84','Intelligent Systems',3,null,null,null,'Information Management Track',false),
('bsit-provisional-2026','ITIM 84A','Intelligent Systems, Lab',0,'ITIM 84',null,null,'Information Management Track',false),
('bsit-provisional-2026','ITIM 85','Special Topics in Information Management',3,null,null,null,'Information Management Track',false),
('bsit-provisional-2026','ITIM 85A','Special Topics in Information Management, Lab',0,'ITIM 85',null,null,'Information Management Track',false),
('bsit-provisional-2026','NSTPR1','Reserved Officer Training Corps I',3,null,null,null,null,false),
('bsit-provisional-2026','NSTPR2','Reserved Officer Training Corps II',3,null,null,null,null,false),
('bsit-provisional-2026','NSTPC2','Civic Welfare Training Service II',3,null,null,null,null,false),
('bsit-provisional-2026','NSTPL2','Literacy Training Service II',3,null,null,null,null,false)
on conflict (curriculum_id,code) do nothing;
