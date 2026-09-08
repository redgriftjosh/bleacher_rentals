select wt.*, a.*
from public."WorkTrackers" wt
join public."Addresses" a on a.id = wt.pickup_address_uuid
where wt.notes = 'uniquesearchquery';