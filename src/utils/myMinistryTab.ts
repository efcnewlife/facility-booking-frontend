export type MyMinistryTab = "applications" | "approvals";

export const resolveMyMinistryTab = (tabParam: string | null): MyMinistryTab => {
  return tabParam === "approvals" ? "approvals" : "applications";
};

export const applyMyMinistryTabToSearchParams = (
  searchParams: URLSearchParams,
  tab: MyMinistryTab
): URLSearchParams => {
  const nextParams = new URLSearchParams(searchParams);
  if (tab === "applications") {
    nextParams.delete("tab");
  } else {
    nextParams.set("tab", tab);
  }
  return nextParams;
};
