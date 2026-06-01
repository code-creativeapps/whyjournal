-- Lets an authenticated user delete their own account.
-- All app tables reference auth.users with `on delete cascade`, so
-- removing the row cleans up the user's data automatically.
create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_current_user() from public;
grant execute on function public.delete_current_user() to authenticated;
