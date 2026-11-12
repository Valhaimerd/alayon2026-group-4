-- Reject SQL NULL parent comparisons for unrelated main components.
create or replace function public.validate_academic_booking() returns trigger
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
   (c.code=p.code or c.parent_code=p.code) is not true or s.curriculum_id<>o.curriculum_id then
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
