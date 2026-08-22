# Facility Booking (member)

Member-facing church facility booking: Home, Start booking questions, then Timetable.

## Language

**Home**:
The first authenticated screen. It welcomes the member and offers a Start Booking action. It is not the question flow.
_Avoid_: Landing, Find Space, dashboard, treating Home as Q1

**Support**:
The member-facing help page for special requests.
_Avoid_: Contact as the canonical nav name

**Not Found**:
The page an authenticated member sees for an unknown path, or a path they are not allowed to open. Unknown and unauthorized look the same; there is no separate forbidden page. It offers a way back to Home. Unauthenticated visitors never see this — they go to login.
_Avoid_: redirecting unknown paths to Home, 403 as the member-facing response, showing Not Found before login

**My Ministry**:
The member-facing place for a Ministry member to see the ministries they are listed on, including pending and rejected records.
_Avoid_: the Start booking ministry picker, Support, Contact

**Start booking**:
The question flow after Home. Ministry choice: Yes goes to ministry name, No skips to One-time vs Repeated, then When, then Space needed. Search leaves this flow for the Timetable.
_Avoid_: Landing, Find Space, wizard (as the product name), Rooms as the member-facing name of the post-Search screen

**One-time**:
A booking for one start–end interval on a single calendar day. The date must be today through one year ahead. The interval cannot cross midnight.
_Avoid_: one-off as the canonical term, unbounded future dates, overnight or next-day as One-time

**When**:
The Start booking step for the One-time date and optional start and end. Date is required to continue. Start and end are either both empty or a complete pair; a single bound is invalid. They seed Search Bar Time and do not lock the Timetable.
_Avoid_: treating start and end as required to Search, treating When as a date range, allowing only start or only end

**Timetable**:
The post-Search screen: rooms across the top, hours down the side, for one calendar day from 00:00 to 24:00. The route stays `/rooms`.
_Avoid_: Time Table, Calendar as this screen's name, Rooms as the member-facing screen name, cropping the day to open hours only

**Search Bar**:
The editable summary of Start booking answers on the Timetable (Ministry, Date, Repetition, Time, # of rooms) plus Update search. Time shows the Booking interval, including a later Timetable pick that differs from When. The Ministry field is hidden unless the person is a Ministry member of at least one active ministry they can book for. When the field shows and the search is Non-ministry, it shows None and they may attach such a ministry. Holding the Owner position does not by itself show this field. Update search applies Search Bar changes (date, ministry, Single/Multiple, Room shortcut, and Time typed in the bar). BOOK still updates Time immediately. Repetition stays One-time in this slice. Update search clears any selection that is not yet confirmed.
_Avoid_: a read-only recap, treating When start–end as frozen after Search, showing Ministry for Owner position alone, treating pending-only applicants as able to attach a ministry, applying Search Bar fields without Update search, keeping a previous day's rooms after Update search

**Booking Details**:
The confirm popup opened by Review Booking. Date is that one calendar day. Each Space row has Edit and Remove: Remove drops that room (zero rooms closes Details); Edit closes Details and returns to the Timetable with the current selection. This slice confirms the booking; it does not collect payment.
_Avoid_: confirm modal as the product name, Confirm & Pay, treating the mock two-day date as the rule, a separate per-room edit mode

**Review Booking**:
The Timetable CTA that opens Booking Details. Single and Multiple both use it. It is disabled until at least one room is selected. Single keeps at most one room (a later BOOK replaces it). Multiple allows one to three rooms.
_Avoid_: opening Booking Details from BOOK alone, Review as the name of the popup, requiring two rooms for Multiple

**Booking interval**:
The single start–end all selected rooms share in one One-time booking. It is Search Bar Time and Booking Details Time.
_Avoid_: per-room times inside one One-time booking, a min–max span with a gap

**BOOK**:
The control on an Available block. It selects that room. With a Booking interval already set, Available means the room covers that whole interval and the interval is at least that room's Template duration; BOOK does not change Time. With no Booking interval yet, BOOK seeds Time from the clicked Slot start for exactly that room's Template duration (click 09:30–10:00 and duration 60 → 09:30–10:30). Clicking a different Available block still changes the shared Booking interval the same way. It does not open Booking Details or create the booking.
_Avoid_: treating BOOK as Confirm, snapping empty-Time BOOK to the template's start_time chunk

**Slot**:
The Timetable visual time step: 30 minutes, all day. It is the ruler, not the bookable duration.
_Avoid_: 60-minute cells as the member visual default

**Template duration**:
How long one empty-Time BOOK chunk is for that room that day: `slot_duration_minutes` on the room slot template. Open hours are the template start–end; Closed sits outside them (and on blackouts). A When / Search Bar interval must be at least this long for that room to be Available; it may be longer; it is not required to be an integer multiple.
_Avoid_: using Template duration as the visual row height, requiring the Booking interval to align to template start_time, rejecting an interval equal to duration

**Available**:
A Timetable span the member may BOOK. If Time is empty: a free chunk starting at the clicked Slot, length Template duration (and not crossing midnight). If Time is set: the room is free for the whole Booking interval, and that interval is at least the room's Template duration.

**Unavailable**:
A Timetable block that is inside open hours but cannot be booked because another booking holds it. Not Closed, not Override.
_Avoid_: using Unavailable for Closed hours or blackouts

**Closed**:
A Timetable block that cannot be booked because the room is not open: outside that room's template hours, or a blackout. Shown with a gray background, including overnight on the 00:00–24:00 axis. Not omitted.
_Avoid_: outside hours, not open, gray as the name of the state, treating blackout as Unavailable

**Override**:
A Timetable block where this search is a Ministry booking with Ministry priority, and a Non-ministry booking holds the slot. Shown as its own state. This slice is display-only: no BOOK, no VIEW, no Confirm and notify.
_Avoid_: painting Override as Unavailable, showing Override on a Non-ministry search, treating VIEW as required to show the state

**Available rooms**:
A Timetable view: rooms that still have at least one Available block that day.

**All rooms**:
A Timetable view: every room offered that day, including columns with no Available block. Those columns stay on the grid as Unavailable, Closed, and/or Override. The availability API must return those rooms, not omit them.

**Capacity filter**:
Timetable chips 1–10, 10–25, 25–50, 50+. Default is no chip (any capacity). A room whose max capacity is exactly 10 counts as 1–10.
_Avoid_: defaulting to 1–10, a free-form capacity box as the member Timetable control

**No matching results**:
The Available rooms view when no room can be BOOK'd under the current Search Bar, Booking interval, Template duration rule, and Capacity filter. All rooms still shows Closed / Unavailable / Override columns.
_Avoid_: sending the member to Home, treating this as the whole building missing

**One-time window**:
The allowed One-time date range: from today through one year ahead (rolling, not calendar year-end).
_Avoid_: calendar year, 365-day fee window as the name of this limit

**Repeated**:
A booking frequency: the same interval on a repeating schedule (weekly, monthly). Member copy uses this word, not Recurring.
_Avoid_: Reoccurring, Recurring (in member copy)

**Space needed**:
Single room or Multiple rooms — how many rooms this search is for. Gym and Sanctuary on that screen are Room shortcuts, not extra space values.
_Avoid_: space=gym, space=sanctuary, room type taxonomy

**Room shortcut**:
Gym or Sanctuary chosen on the Space needed question. It names one specific room and still means Single room. Search Bar can change this later.
_Avoid_: a third space value, facility category

**Gym**:
A named room. Choosing it as a Room shortcut means that room, with Space needed Single.
_Avoid_: room type, facility type, excluding Gym from an unfiltered Single/Multiple search

**Sanctuary**:
A named room. Choosing it as a Room shortcut means that room, with Space needed Single.
_Avoid_: room type, hall type, excluding Sanctuary from an unfiltered Single/Multiple search

**Ministry member**:
A person listed on a ministry as primary or secondary steward. Pending, rejected, and active ministries all count for My Ministry. Only a Ministry member can see My Ministry. This is not the Owner position.
_Avoid_: church member, attendee, Owner, treating a pending applicant as a different kind of person

**Owner position**:
The church Org Position that owns a ministry (`owner_position`). It is a leadership seat, not a Ministry member row. Holding it does not by itself make someone a Ministry member or show Search Bar Ministry.
_Avoid_: Owner as a synonym for Ministry member, owner as the booking's user

**Ministry booking**:
A booking attached to a ministry the booker belongs to.
_Avoid_: ministry event (too vague)

**Non-ministry booking**:
A booking for a personal or informal group, with no ministry attached.
_Avoid_: personal booking (the design also includes group events)

**Ministry priority**:
When a Ministry booking conflicts with a Non-ministry booking, the Ministry booking takes the slot. The Non-ministry booking is cancelled; that booker is notified and must book again. A ministry has this on by default.
_Avoid_: warning-only priority, manual admin cancel as the rule, opt-in priority flag as the member-facing rule
