select wt.*, a.*
from public."WorkTrackers" wt
join public."Addresses" a on a.id = wt.dropoff_address_uuid
where wt.notes = 'asdfg';

-- Troubadour Festival 4/4 September

-- select e.*, a.*
-- from public."Events" e
-- join public."Addresses" a on a.id = e.address_uuid
-- where e.event_name = 'Troubadour Festival 4/4 September';