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
  
-- Add info_approved column to album table
alter table "album" add column info_approved boolean default false;

-- Set existing records to approved
update "album" set info_approved = true;

-- Create receipt table
create table "receipt" (
  id uuid default gen_random_uuid() primary key,
  album_id bigint references album(id) not null,
  receipt text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add receipt_id to album table
alter table "album" add column receipt_id uuid references receipt(id);

-- Create trigger for receipt updated_at
create trigger update_receipt_updated_at
  before update on "receipt"
  for each row
  execute function update_updated_at_column();

