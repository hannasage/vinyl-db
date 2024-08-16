create policy "Enable read access for all users"
on "public"."collection"
as permissive
for select
to public
using (true);


create policy "Enable read access for all users"
on "public"."entry"
as permissive
for select
to public
using (true);



