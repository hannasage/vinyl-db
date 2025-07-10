drop policy "Enable delete access for authenticated users" on "public"."album";

drop policy "Enable insert access for authenticated users" on "public"."album";

drop policy "Enable update access for authenticated users" on "public"."album";

drop policy "Enable delete access for authenticated users" on "public"."artist";

drop policy "Enable insert access for authenticated users" on "public"."artist";

drop policy "Enable update access for authenticated users" on "public"."artist";

drop policy "Enable delete access for authenticated users" on "public"."entry";

drop policy "Enable insert access for authenticated users" on "public"."entry";

drop policy "Enable update access for authenticated users" on "public"."entry";

create policy "Enable delete access for users and service"
on "public"."album"
as permissive
for delete
to public
using (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));


create policy "Enable insert access for users and service"
on "public"."album"
as permissive
for insert
to public
with check (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));


create policy "Enable update access for users and service"
on "public"."album"
as permissive
for update
to public
using (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));


create policy "Enable delete access for users and service"
on "public"."artist"
as permissive
for delete
to public
using (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));


create policy "Enable insert access for users and service"
on "public"."artist"
as permissive
for insert
to public
with check (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));


create policy "Enable update access for users and service"
on "public"."artist"
as permissive
for update
to public
using (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));


create policy "Enable delete access for users and service"
on "public"."entry"
as permissive
for delete
to public
using (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));


create policy "Enable insert access for users and service"
on "public"."entry"
as permissive
for insert
to public
with check (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));


create policy "Enable update access for users and service"
on "public"."entry"
as permissive
for update
to public
using (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));



