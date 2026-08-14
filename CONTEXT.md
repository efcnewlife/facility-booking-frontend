# Facility Booking (member)

Member-facing church facility booking: Home, Start booking questions, then Rooms.

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
The question flow after Home. Ministry choice: Yes goes to ministry name, No skips to One-time vs Repeated, then date and time, then Space needed. Search leaves this flow for Rooms.
_Avoid_: Landing, Find Space, wizard (as the product name)

**One-time**:
A booking for a single date and a single start–end interval. The date must be today through one year ahead.
_Avoid_: one-off as the canonical term, unbounded future dates

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
A person listed on a ministry as primary or secondary steward. Pending, rejected, and active ministries all count. Only a Ministry member can see My Ministry.
_Avoid_: church member, attendee, treating a pending applicant as a different kind of person

**Ministry booking**:
A booking attached to a ministry the booker belongs to.
_Avoid_: ministry event (too vague)

**Non-ministry booking**:
A booking for a personal or informal group, with no ministry attached.
_Avoid_: personal booking (the design also includes group events)

**Ministry priority**:
When a Ministry booking conflicts with a Non-ministry booking, the Ministry booking takes the slot. The Non-ministry booking is cancelled; that booker is notified and must book again. A ministry has this on by default.
_Avoid_: warning-only priority, manual admin cancel as the rule, opt-in priority flag as the member-facing rule
