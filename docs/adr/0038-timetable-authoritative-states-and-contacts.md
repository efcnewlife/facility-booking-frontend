# Timetable states come from cells, templates, and events

The member Timetable no longer switches between Available rooms and All rooms. The availability response decides which rooms appear. A Personal requested interval can still hide rooms that cannot cover it. A Ministry proposal keeps occupied rooms from that response, including when a time seed is present.

Cells and templates are the opening-hour authority. Events carry Ministry-context occupancy and the authorized contact. AM/PM free lists do not decide occupancy kind, opening windows, or template duration when cells and templates are present. Clock times stay facility-local.

Ministry occupancy is a light orange block labeled Conflict, with View contact. Non-priority Rental occupancy stays gray Unavailable with View contact. Priority Rental occupancy is red Override and is not selectable in this slice. Personal occupancy is generic Unavailable with no contact. Closed time has no reservation content. View contact opens a close-only Conflict dialog for that event and does not admit the interval to the Cart.
