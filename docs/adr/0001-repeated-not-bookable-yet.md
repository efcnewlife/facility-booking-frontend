# Repeated is shown in Start booking but cannot continue

Start booking includes One-time vs Repeated to match the design, and member copy keeps **Repeated**. Member create and availability are still a single interval on a single date (`one_time` only); there is no series write path. Choosing Repeated shows that series booking is not available yet and does not Continue. We do not submit a One-time booking and call it Repeated.
