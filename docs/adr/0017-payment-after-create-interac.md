# Create booking on Confirm, then Payment with Interac copy

Confirm on Booking Details creates the booking and holds the slot. Success goes to Payment keyed by booking id, with Canada Interac e-Transfer instructions and a placeholder email. This slice does not run a processor or mark the booking paid, so we do not label the button Confirm & Pay. Showing Payment before create would leave the slot free while the member reads Interac copy.
