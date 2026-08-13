# Start booking states Ministry priority as automatic override

Q1 keeps the design meaning: ministry events take priority, and a conflicting Non-ministry booking is cancelled with notice and re-booking required. That is the product rule, not a softened warning.

This Home / Start booking slice only communicates the rule. Member create still rejects overlap; override apply / displace is not shipped on the API (see newlife-docs TC-GAP-005). We do not hide the rule in the UI because the write path is later work.
