export const MINISTRY_PROFILE_HANDOFF_SOURCE = "my-ministry";

const MINISTRY_ID_QUERY_KEY = "ministryId";
const SOURCE_QUERY_KEY = "source";

export const startBookingMinistryProfileHandoffPath = (ministryId: string): string => {
  const params = new URLSearchParams({
    step: "select_ministry",
    ministry: "1",
    [MINISTRY_ID_QUERY_KEY]: ministryId,
    [SOURCE_QUERY_KEY]: MINISTRY_PROFILE_HANDOFF_SOURCE,
  });
  return `/start-booking?${params.toString()}`;
};

export const readMinistryProfileHandoffMinistryId = (searchParams: URLSearchParams): string | null => {
  if (searchParams.get(SOURCE_QUERY_KEY) !== MINISTRY_PROFILE_HANDOFF_SOURCE) {
    return null;
  }
  return searchParams.get(MINISTRY_ID_QUERY_KEY);
};

export const clearMinistryProfileHandoffParams = (searchParams: URLSearchParams): URLSearchParams => {
  const next = new URLSearchParams(searchParams);
  next.delete(MINISTRY_ID_QUERY_KEY);
  next.delete(SOURCE_QUERY_KEY);
  return next;
};
