-- Add RLS policies for DELETE operations
-- This allows authenticated users to delete albums and entries

-- Enable DELETE for albums (authenticated users can delete any album)
CREATE POLICY "Enable delete access for authenticated users" ON "public"."album" 
FOR DELETE USING (auth.role() = 'authenticated');

-- Enable DELETE for entries (authenticated users can delete any entry)
CREATE POLICY "Enable delete access for authenticated users" ON "public"."entry" 
FOR DELETE USING (auth.role() = 'authenticated');

-- Enable INSERT for albums (authenticated users can insert albums)
CREATE POLICY "Enable insert access for authenticated users" ON "public"."album" 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable UPDATE for albums (authenticated users can update albums)
CREATE POLICY "Enable update access for authenticated users" ON "public"."album" 
FOR UPDATE USING (auth.role() = 'authenticated');

-- Enable INSERT for entries (authenticated users can insert entries)
CREATE POLICY "Enable insert access for authenticated users" ON "public"."entry" 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable UPDATE for entries (authenticated users can update entries)
CREATE POLICY "Enable update access for authenticated users" ON "public"."entry" 
FOR UPDATE USING (auth.role() = 'authenticated');

-- Enable INSERT for artists (authenticated users can insert artists)
CREATE POLICY "Enable insert access for authenticated users" ON "public"."artist" 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable UPDATE for artists (authenticated users can update artists)
CREATE POLICY "Enable update access for authenticated users" ON "public"."artist" 
FOR UPDATE USING (auth.role() = 'authenticated');

-- Enable DELETE for artists (authenticated users can delete artists)
CREATE POLICY "Enable delete access for authenticated users" ON "public"."artist" 
FOR DELETE USING (auth.role() = 'authenticated'); 