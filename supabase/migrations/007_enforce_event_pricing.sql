-- ============================================================
-- Enforce pricing / discount rules at the database layer
-- ============================================================
-- Until now "only admins may discount" lived purely in the React form, so any
-- secretary using their own session (or raw supabase-js) could insert arbitrary
-- discounts and final prices. This trigger enforces the business rules in the DB:
--
--   * price_final must always equal price_listed - discount_amount
--   * non-admins may never apply a discount
--   * non-admins must charge the venue's configured price for the slot (on insert)
--   * non-admins may not alter pricing on an existing event
--
-- Admins keep full flexibility (the edit modal lets them set any listed price).

create or replace function enforce_event_pricing()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
  v_listed numeric(10,2);
begin
  v_role := current_user_role();

  if new.price_listed < 0 or new.discount_amount < 0 or new.price_final < 0 then
    raise exception 'Prices cannot be negative';
  end if;

  -- Final price must always be internally consistent.
  if new.price_final <> new.price_listed - new.discount_amount then
    raise exception 'price_final must equal price_listed minus discount_amount';
  end if;

  if v_role <> 'admin' then
    if tg_op = 'INSERT' then
      if new.discount_amount <> 0 then
        raise exception 'Only admins may apply a discount';
      end if;

      select case new.event_type
        when 'morning'  then price_morning
        when 'evening'  then price_evening
        when 'full_day' then price_full_day
        when 'shabbat'  then price_shabbat
      end
      into v_listed
      from public.venues
      where id = new.venue_id;

      if new.price_listed <> coalesce(v_listed, 0) then
        raise exception 'Listed price does not match the venue price';
      end if;

    elsif tg_op = 'UPDATE' then
      -- Non-admins can edit status/notes/etc. but never the money fields.
      if new.price_listed   is distinct from old.price_listed
         or new.discount_amount is distinct from old.discount_amount
         or new.price_final     is distinct from old.price_final then
        raise exception 'Only admins may change event pricing';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger events_pricing_check
  before insert or update on events
  for each row execute function enforce_event_pricing();
