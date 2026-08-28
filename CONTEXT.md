# Facility Booking (member)

Member-facing church facility booking: Home, Start booking questions, then Timetable.

## Language

**Home**:
The first authenticated screen. It welcomes the member and offers a Start Booking action. It is not the question flow.
_Avoid_: Landing, Find Space, dashboard, treating Home as Q1

**Sign in**:
The unauthenticated `/login` page. Top band: booking wordmark and locale selector; centered white card (~350px, 20px radius) with compact church logo, Microsoft sign-in, and Remember me. Terms of Service and Privacy Policy links sit below the card as caption links. Dev email sign-in is collapsible when enabled locally. Microsoft outline button matches portal parity (ADR 0020). Not Landing — see **Home** for the first authenticated screen.
_Avoid_: Landing as the product name, email/password as production auth, SupportFooter on Sign in, wide church wordmark or app title heading in the card, Forgot password or Sign up on Sign in

**Support**:
The member-facing help page for special requests.
_Avoid_: Contact as the canonical nav name

**Terms of Service**:
The Facility Booking Legal Document of kind Terms of Service: living localized Markdown. Visitors may read it without signing in, including from a Footer link to a public page. The app does not record acceptance.
_Avoid_: acceptance checkbox as required to book in this slice, treating Support as the legal document, a Portal-only document with no member copy

**Privacy Policy**:
The Facility Booking Legal Document of kind Privacy Policy. Same public-read and Footer-page pattern as Terms of Service; it is a distinct document, not a section of Terms of Service.
_Avoid_: merging privacy copy into Terms of Service, treating Support as the privacy page

**Public legal page**:
An unauthenticated route that shows one Facility Booking Legal Document (Terms of Service or Privacy Policy). Paths are `/terms-of-service` and `/privacy-policy`. Footer links to these pages; it does not inline the full Markdown. Login places the same two text links under the sign-in card (not a full SupportFooter). Chrome is dual: a signed-in member sees the same TopNavBar as other member pages; a guest sees the Public legal header. There is no SupportFooter on this page. When content exists, the page shows the document Effective Date under the title (i18n label + formatted calendar day), then the body via MarkdownPreview (`legal` profile). An active document with empty body shows an empty state. A soft-deleted or missing document is not found. Locale follows the app language (Accept-Language), not a URL locale param. Last Updated is not the public "in force since" line (Effective Date is).
_Avoid_: Footer modal as the reading surface, requiring login to open the page, treating empty body as not found, SupportFooter on the legal page, SupportFooter on Login as the only way to discover the links, a host-local Markdown renderer that diverges from MarkdownPreview, putting Effective Date only inside the Markdown body, showing Last Updated as Effective Date, one chrome for guests and signed-in members

**Public legal header**:
The guest-only sticky top bar on a Public legal page. It matches TopNavBar visual chrome (background, logo size) but only logo, Sign in, and locale. Logo and Sign in both go to Login. While auth is still loading, this header shows first; it swaps to TopNavBar only after the member is confirmed signed in. Signing out on a Public legal page leaves the visitor on that page and swaps back to this header. Sign in from this header uses the normal Login success path (Home); it does not pass a return URL in this slice.
_Avoid_: TopNavBar for guests, floating locale alone on the legal page, logo to Home for guests, blocking the document body on auth loading, forcing Login after Sign out from a Public legal page, legal-page-only return URL as required for this slice

**Effective Date**:
The calendar day the Facility Booking Legal Document's current wording takes effect. Shown on the Public legal page when content is available.
_Avoid_: Last Updated as the in-force date, Effective from / Effective to range

**Not Found**:
The page an authenticated member sees for an unknown path, or a path they are not allowed to open. Unknown and unauthorized look the same; there is no separate forbidden page. It offers a way back to Home. Unauthenticated visitors never see this — they go to login.
_Avoid_: redirecting unknown paths to Home, 403 as the member-facing response, showing Not Found before login

**My Ministry**:
The member-facing place for a Ministry member to see the ministries they are listed on, including pending and rejected records. It has tabs for applications they submitted and, when they are an Owner-position incumbent, pending approvals waiting on them.
_Avoid_: the approval queue as a separate top-level nav item, showing only active ministries

**Application notification email**:
An Outlook message sent from a fixed system mailbox to the Owner-position incumbent when a member submits a Ministry Application. It contains a deep link into the booking approval detail page. Body is bilingual: English first, then Chinese.
_Avoid_: applicant confirmation as the same email, portal notification as this email, single-language-only templates in this slice

**Application decision email**:
An Outlook message to the applicant when a Ministry Application is approved or rejected. My Ministry also shows the updated status. Body is bilingual: English first, then Chinese.
_Avoid_: treating this as the incumbent notification, in-app-only with no email

**Application submit confirmation email**:
An Outlook message to the applicant right after submit, summarizing the Ministry Application and linking to My Ministry. Body is bilingual: English first, then Chinese.
_Avoid_: duplicating the incumbent notification, replacing My Ministry status updates

**Target audience (application)**:
Optional atomic catalog labels on booking create (multi-select). When present, `all_ages` cannot combine with other labels. Schedule is not collected on booking create.
_Avoid_: merged poster phrases as one code, requiring audience for every ministry type

**Ministry Application**:
A Ministry in the pending-approval lifecycle after the member submits from booking. A Ministry Approver decides it; approving makes that Ministry Active so it can appear in Start booking / Search Bar Ministry.
_Avoid_: Application as a synonym for an Active Ministry, treating Approval as the Application itself

**Ministry Approver**:
A person who may approve or reject a Ministry Application: the current incumbent of that Ministry's Owner position, or a user granted ministry approval authority in the admin portal.
_Avoid_: incumbent-only as the sole rule, RBAC-only as the sole rule

**Ministry approval queue**:
The booking member view of Ministry Applications waiting on the signed-in user as Owner-position incumbent. Email links land on a detail page inside this queue after Microsoft sign-in.
_Avoid_: the admin portal Approvals menu, treating the queue as My Ministry applications the user submitted

**Steward picker search**:
The booking create form finds secondary stewards among active auth users by email or display name (minimum query length, capped results). The applicant cannot select themselves as secondary.
_Avoid_: invite-by-email without an existing auth user, searching Member Person records

**Start booking**:
The question flow after Home. Ministry choice: Yes goes to ministry name, No skips to One-time vs Repeated, then When, then Space needed. Search leaves this flow for the Timetable.
_Avoid_: Landing, Find Space, wizard (as the product name), Rooms as the member-facing name of the post-Search screen

**One-time**:
A booking for one start–end interval on a single calendar day. The date must be today through one year ahead. The interval cannot cross midnight.
_Avoid_: one-off as the canonical term, unbounded future dates, overnight or next-day as One-time

**When**:
The Start booking step for the One-time date and optional start and end. Date is required to continue. Start and end are either both empty or a complete pair; a single bound is invalid. They seed Search Bar Start Time and End Time and do not lock the Timetable.
_Avoid_: treating start and end as required to Search, treating When as a date range, allowing only start or only end

**Timetable**:
The post-Search screen: rooms across the top, hours down the side, for one calendar day from 00:00 to 24:00. The route stays `/rooms`. On entry and after Update search, the grid scrolls to the Booking interval Start Time if that pair is set, otherwise to the earliest non-Closed Slot among visible rooms. Closed gray blocks stay on the axis; scrolling does not crop them.
_Avoid_: Time Table, Calendar as this screen's name, Rooms as the member-facing screen name, cropping the day to open hours only

**Search Bar**:
The editable summary of Start booking answers on the Timetable, in this order: Ministry, Repetition, Date, Start Time, End Time, # of rooms, plus Update search. Start Time and End Time together are the Booking interval, including a later Timetable pick that differs from When. The Ministry field is hidden unless the person is a Ministry member of at least one active ministry they can book for. When the field shows and the search is Non-ministry, it shows None and they may attach such a ministry. Holding the Owner position does not by itself show this field. Update search applies Search Bar changes (date, ministry, Single/Multiple, Room shortcut, and Start Time / End Time typed in the bar). BOOK and ADD still update Start Time and End Time immediately. Repetition stays One-time in this slice. Update search clears any selection that is not yet confirmed.
_Avoid_: a read-only recap, treating When start–end as frozen after Search, showing Ministry for Owner position alone, treating pending-only applicants as able to attach a ministry, applying Search Bar fields without Update search, keeping a previous day's rooms after Update search, a single merged Time field as the Search Bar control, Date before Repetition

**Booking Details**:
The confirm page after Single Confirm Booking Time, or after Multiple Review Booking. The route is `/booking-details`. Date, Start Time, End Time, rooms, and ministry travel in the query as a draft snapshot, not a lock and not a cart. Each visit (including a pasted URL) reloads availability and Payment Summary from the backend. If any selected room cannot cover the Booking interval, Confirm stays disabled and the member can return to the Timetable. Confirm calls create booking; success goes to Payment. Create failure stays on this page. Date is that one calendar day. Each Space row has Edit and Remove: Remove drops that room (zero rooms returns to the Timetable); Edit returns to the Timetable with the current selection.
_Avoid_: confirm modal as the product name, treating the query as a reservation, a shopping cart, treating Booking Details as a Timetable popup, treating the mock two-day date as the rule, a separate per-room edit mode, charging a card here

**Payment Summary**:
The Booking Details aside that shows rate, ministry discount, tax, and total. The backend calculates the money; the client displays it.
_Avoid_: calculating totals only in the browser, treating this aside as the Interac instructions screen

**Payment**:
The page after a successful create booking. The route uses the booking id. It shows Canada Interac e-Transfer instructions and a placeholder email, plus the backend total. It does not collect or verify payment. The member continues with Back to Home.
_Avoid_: Confirm & Pay, a payment processor, treating this page as Booking Details, a second submit that marks the booking paid

**Review Booking**:
The Multiple-only Timetable CTA that opens the Booking Details page. The label includes how many rooms are selected. It is disabled until at least one room is added. Multiple allows one to three rooms.
_Avoid_: Review Booking on Single, Review as the name of Booking Details, requiring two rooms for Multiple, opening Booking Details from ADD alone

**Booking interval**:
The single start–end all selected rooms share in one One-time booking. It is Search Bar Start Time and End Time, Confirm Booking Time, and Booking Details Time.
_Avoid_: per-room times inside one One-time booking, a min–max span with a gap

**Confirm Booking Time**:
The Single overlay after BOOK. It shows Date (the Search Bar date, not editable) plus Start Time and End Time. The member sets the Booking interval, then continues to the Booking Details page. It always opens on BOOK, including when Start Time and End Time are already filled.
_Avoid_: Choose time, Booking Details as this overlay, skipping this overlay on Single when Time is already set, opening it from Multiple ADD, letting Date change here

**BOOK**:
The control on a Single Available block. It selects that room and always opens Confirm Booking Time. It does not open Booking Details or create the booking.
_Avoid_: treating BOOK as Confirm, BOOK on Multiple, snapping empty-Time BOOK to the template's start_time chunk without Confirm Booking Time

**ADD**:
The control on a Multiple Available block. It adds that room to the selection, at most three. With a Booking interval already set, Available means the room covers that whole interval and the interval is at least that room's Template duration; ADD does not change Start Time and End Time. With no Booking interval yet, ADD seeds Start Time and End Time from the clicked Slot start for exactly that room's Template duration. A later ADD on a different span replaces the shared Booking interval and keeps only that room. It does not open Confirm Booking Time, Booking Details, or create the booking.
_Avoid_: BOOK as the Multiple block control, treating ADD as Confirm

**Slot**:
The Timetable visual time step: 30 minutes, all day. It is the ruler, not the bookable duration.
_Avoid_: 60-minute cells as the member visual default

**Template duration**:
How long one empty-Time BOOK chunk is for that room that day: `slot_duration_minutes` on the room slot template. Open hours are the template start–end; Closed sits outside them (and on blackouts). A When / Search Bar interval must be at least this long for that room to be Available; it may be longer; it is not required to be an integer multiple.
_Avoid_: using Template duration as the visual row height, requiring the Booking interval to align to template start_time, rejecting an interval equal to duration

**Available**:
A Timetable span the member may BOOK or ADD. If Start Time and End Time are empty: hover (or a first tap on touch) previews a free chunk on that room only, starting at the Slot, length Template duration (and not crossing midnight); that preview is not a selection and does not paint other rooms. BOOK or ADD then commits that chunk as the Booking interval. If Start Time and End Time are set: the room is free for the whole Booking interval, and that interval is at least the room's Template duration; those rooms show Available without hover.

**Room photo**:
The picture of a room on the Timetable column header. Opening it shows Image preview. If the room has no picture, the header shows a photo icon, not an image and not a text label.
_Avoid_: Gallery as the product name, a "No photo" caption, treating a missing picture as an empty gray box with no icon

**Image preview**:
The overlay that enlarges Room photos, with thumbs and previous/next when there is more than one picture. Close returns to the Timetable.
_Avoid_: Gallery modal as the product name, a separate route for the photos

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
