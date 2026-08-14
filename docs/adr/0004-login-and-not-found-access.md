# Unauthenticated visitors always see login; authenticated unknown and unauthorized share Not Found

Visitors who are not signed in always land on login, including unknown paths, so the public site does not enumerate member routes. Authenticated members who hit an unknown path, or open My Ministry without being a Ministry member, see the same standalone Not Found page. There is no distinct forbidden page. After login, the app always goes to Home and does not restore the pre-login path.
