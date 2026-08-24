-- Elimina categorias duplicadas en catalogo_precio (conserva la de menor id)
-- y agrega una restriccion unica para que no se repitan.
-- Copiar desde VS Code y ejecutar en Supabase -> SQL Editor.

delete from catalogo_precio a
using catalogo_precio b
where a.categoria = b.categoria
  and a.id > b.id;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'uq_catalogo_categoria') then
    alter table catalogo_precio add constraint uq_catalogo_categoria unique (categoria);
  end if;
end $$;
