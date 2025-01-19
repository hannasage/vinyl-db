create table "retailer" (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add initial trusted retailers
insert into "retailer" (name, email) values
  ('Turntable Lab', 'orders@turntablelab.com'),
  ('Rough Trade', 'vinyl@roughtraderecords.com');

-- Create function to update updated_at on changes
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger update_retailer_updated_at
  before update on "retailer"
  for each row
  execute function update_updated_at_column(); 
  