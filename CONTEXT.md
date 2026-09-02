# Facility Booking (member)

Member-facing church facility booking: Home, Start booking questions, then Timetable.

## Language

**Home**:
The first authenticated screen. It welcomes the member and offers a Start Booking action. It is not the question flow.
_Avoid_: Landing, Find Space, dashboard, treating Home as Q1

**Sign in**:
The unauthenticated `/login` page. Top band: booking wordmark and locale selector; centered white card (~350px, 20px radius) with compact church logo, Microsoft sign-in, and Remember me. Terms of Service and Privacy Policy links sit below the card as caption links. Mock login is collapsible when enabled in non-production. Microsoft outline button matches portal parity (ADR 0020). Not Landing — see **Home** for the first authenticated screen.
_Avoid_: Landing as the product name, email/password as production auth, SupportFooter on Sign in, wide church wordmark or app title heading in the card, Forgot password or Sign up on Sign in, dev login as the product name

**Mock login**:
Passwordless sign-in for Facility Booking in development and staging only. The member enters the email of a testing account; the app obtains a real backend session without Microsoft. Testing accounts use the `@test.local` email domain and are provisioned only by operator scripts, not self-registration or the admin portal. Each testing account keeps its own ministry and booking relationships in the database — mock login does not grant superuser bypass. Not production auth.
_Avoid_: dev login, fake local session, frontend-only token, treating mock login as Microsoft, creating testing accounts from the Sign in page

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
The question flow after Home. Ministry choice: Yes goes to ministry name, No skips to One-time vs Repeated, then When. Search leaves this flow for the Timetable. There is no Space needed step.
_Avoid_: Landing, Find Space, wizard (as the product name), Rooms as the member-facing name of the post-Search screen, Space needed, Room shortcut on this flow

**One-time**:
A booking on a single calendar day. The date must be today through one year ahead. Each Booking line has its own start–end on that same day; lines cannot cross midnight. A booking with multiple lines cannot span more than one calendar day. One booking may include up to three lines, including more than one line for the same room at different times on that day.
_Avoid_: one-off as the canonical term, unbounded future dates, overnight or next-day as One-time, a single shared time for every room in the booking, multi-room bookings across two calendar days

**When**:
The Start booking step for the One-time date and optional start and end. Date is required to continue. Start and end are either both empty or a complete pair; a single bound is invalid. Start and end have no UI default; the member fills them or leaves both empty. When both are set, they drive When seed highlight on the Timetable; they are not shown on the Search Bar and do not add Booking lines.
_Avoid_: treating start and end as required to Search, treating When as a date range, allowing only start or only end, putting When times on the Search Bar, prefilled or default start and end

**When seed highlight**:
On Timetable entry, when When has a complete start–end pair, every room that can cover that interval shows that span highlighted. It is not a Booking line and not in the Booking cart. Rooms that cannot cover the interval do not show this highlight. Other rooms keep their When seed highlight when the member Pinned interval on one room.
_Avoid_: shared Booking interval, adding to the cart from When, highlighting Unavailable spans, clearing other rooms' seed when one room is clicked

**Timetable**:
The post-Search screen: rooms across the top, hours down the side, for one calendar day from 00:00 to 24:00, with a Booking cart panel on the right. The route stays `/rooms`. Open bookable hours use a light green background; Unavailable does not. Available blocks sit on top with a darker green fill, black border, and the left deep-green edge. On entry and after Update search, the grid scrolls to When start when set, otherwise to the earliest non-Closed Slot among visible rooms. Closed gray blocks stay on the axis; scrolling does not crop them.
_Avoid_: Time Table, Calendar as this screen's name, Rooms as the member-facing screen name, cropping the day to open hours only, light green under Unavailable

**Search Bar**:
The editable summary on the Timetable: Ministry (when shown), Repetition, Date, plus Update search. Controls are one size step larger than before. It does not show start time, end time, or room count. The Ministry field is hidden unless the person is a Ministry member of at least one active ministry they can book for. When the field shows and the search is Non-ministry, it shows None and they may attach such a ministry. Holding the Owner position does not by itself show this field. Update search applies date and ministry changes. Repetition stays One-time in this slice.
_Avoid_: Start Time and End Time on the bar, # of rooms, Single/Multiple, Room shortcut, a read-only recap, showing Ministry for Owner position alone, treating pending-only applicants as able to attach a ministry

**Booking cart**:
The right-hand panel on the Timetable listing confirmed Booking lines after Confirm Booking Time. Review Booking sits at the top of this panel. Each line shows a room thumbnail, name, that line's time, line subtotal, Remove, and Edit. At most three lines per booking, including multiple lines for the same room at different times. Removing a line restores ADD on that Timetable block; Edit reopens Confirm Booking Time for that line.
_Avoid_: cart on Booking Details as the primary picker, Review Booking only for Multiple, a single shared time for all lines

**Booking line**:
One room plus one start–end interval the member confirmed for a One-time booking, on the same calendar day as every other line in that booking. Lines live in the Booking cart before Review Booking and on Booking Details. The same room may appear on more than one line in one booking.
_Avoid_: Booking interval as one span for all rooms, line without its own time, a line on a different calendar day from sibling lines in the same booking

**Pinned interval**:
The single-room span the member commits on the Timetable by clicking after hover preview, before ADD. It is not in the Booking cart until Confirm Booking Time succeeds. Clicking a room sets or changes only that room's Pinned interval; other rooms keep When seed highlight when present.
_Avoid_: pinning all rooms from one click, treating pin as cart membership, BOOK

**Booking Details**:
The confirm page after Review Booking from the Booking cart. The route is `/booking-details`. A back control above the title returns to the Timetable with cart state preserved. Date, ministry, and Booking lines travel in the query as a draft snapshot, not a backend lock. Each visit reloads availability and Payment Summary. If any line is no longer available, Confirm stays disabled. Confirm calls create booking; success goes to Payment. There is no single Time row at the top; each Space row shows a thumbnail, that line's time, Edit, and Remove. Below all Space rows, + Room returns to the Timetable to add more lines.
_Avoid_: a single shared Time field, confirm modal as the product name, treating the query as a paid reservation, skipping back to Timetable

**Payment Summary**:
The Booking Details aside that shows rate, ministry discount, tax, and total. The backend calculates the money; the client displays it.
_Avoid_: calculating totals only in the browser, treating this aside as the Interac instructions screen

**Payment**:
The page after a successful create booking. The route uses the booking id. It shows Canada Interac e-Transfer instructions and a placeholder email, plus the backend total. It does not collect or verify payment. The member continues with Back to Home.
_Avoid_: Confirm & Pay, a payment processor, treating this page as Booking Details, a second submit that marks the booking paid

**Review Booking**:
The Timetable CTA at the top of the Booking cart that opens Booking Details. It is disabled until at least one Booking line exists. The label reflects how many lines are in the cart.
_Avoid_: Review as the name of Booking Details, Multiple-only, opening Booking Details directly from ADD without a cart line, BOOK

**Confirm Booking Time**:
The modal opened by ADD on a Pinned interval. It shows Date (the Search Bar date, not editable) plus Start Time and End Time for that room line. On confirm, the line joins the Booking cart and the block control becomes a checkmark. Edit on a cart line reopens this modal for that line.
_Avoid_: Choose time, Booking Details as this overlay, BOOK as the opener, skipping the modal, letting Date change here, checkmark opening the modal again

**ADD**:
The control on an Available block after Pinned interval. It opens Confirm Booking Time. After a line is confirmed, ADD becomes a non-clickable checkmark on that block until the line is removed from the cart. Grid click alone only Pinned interval; it does not open this modal or add to the cart.
_Avoid_: BOOK, treating grid click as ADD, checkmark as a second confirm, adding to the cart without the modal

**Slot**:
The Timetable visual time step: 30 minutes, all day. It is the ruler, not the bookable duration.
_Avoid_: 60-minute cells as the member visual default

**Template duration**:
How long one hover-preview chunk is for that room that day: `slot_duration_minutes` on the room slot template. Open hours are the template start–end; Closed sits outside them (and on blackouts). A confirmed line must be at least this long for that room; it may be longer; it is not required to be an integer multiple.
_Avoid_: using Template duration as the visual row height, requiring the line to align to template start_time, rejecting a line equal to duration

**Available**:
A Timetable span shown as an Available block on which the member may ADD after Pinned interval. Hover (or a first tap on touch) previews a free chunk on that room only, starting at the Slot, length Template duration (and not crossing midnight); that preview is not a Pinned interval and does not paint other rooms. When seed highlight may show a wider span on eligible rooms without replacing per-room pin and cart rules.
_Avoid_: BOOK, painting Available on every room from one action, treating hover preview as cart membership

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
A Timetable block where this search is a Ministry booking with Ministry priority, and a Non-ministry booking holds the slot. Shown as its own state. This slice is display-only: no ADD, no VIEW, no Confirm and notify.
_Avoid_: painting Override as Unavailable, showing Override on a Non-ministry search, treating VIEW as required to show the state

**Available rooms**:
A Timetable view: rooms that still have at least one Available block that day.

**All rooms**:
A Timetable view: every room offered that day, including columns with no Available block. Those columns stay on the grid as Unavailable, Closed, and/or Override. The availability API must return those rooms, not omit them.

**Capacity filter**:
Timetable chips 1–10, 10–25, 25–50, 50+. Default is no chip (any capacity). A room whose max capacity is exactly 10 counts as 1–10.
_Avoid_: defaulting to 1–10, a free-form capacity box as the member Timetable control

**No matching results**:
The Available rooms view when no room shows a bookable Available block under the current date, ministry, Template duration rule, and Capacity filter. All rooms still shows Closed / Unavailable / Override columns.
_Avoid_: sending the member to Home, treating this as the whole building missing, BOOK

**One-time window**:
The allowed One-time date range: from today through one year ahead (rolling, not calendar year-end).
_Avoid_: calendar year, 365-day fee window as the name of this limit

**Repeated**:
A booking frequency: the same interval on a repeating schedule (weekly, monthly). Member copy uses this word, not Recurring.
_Avoid_: Reoccurring, Recurring (in member copy)

**Gym**:
A named facility room code in the catalog. Members find it on the Timetable like any other room; there is no Start booking shortcut to Gym.
_Avoid_: room type, facility type, Room shortcut, Space needed

**Sanctuary**:
A named facility room code in the catalog. Members find it on the Timetable like any other room; there is no Start booking shortcut to Sanctuary.
_Avoid_: room type, hall type, Room shortcut, Space needed

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
