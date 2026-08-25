-- Yoldaş — Read-only diagnosis for reference-recipe saving
-- This query does NOT edit, delete, or insert anything.

select
  'columns' as section,
  column_name as item,
  data_type as value,
  is_nullable as extra
from information_schema.columns
where table_schema = 'public' and table_name = 'meals'

union all

select
  'policies' as section,
  policyname as item,
  cmd as value,
  coalesce(with_check, qual, '') as extra
from pg_policies
where schemaname = 'public' and tablename = 'meals'

order by section, item;
