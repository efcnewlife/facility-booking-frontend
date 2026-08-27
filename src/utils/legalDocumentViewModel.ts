export type LegalDocumentViewState =
  { status: "content"; body: string } | { status: "empty" } | { status: "not_found" } | { status: "error" };

interface LegalDocumentFetchInput {
  httpStatus?: number;
  body?: string | null;
}

export const mapLegalDocumentFetchResult = (input: LegalDocumentFetchInput): LegalDocumentViewState => {
  if (input.httpStatus === 404) {
    return { status: "not_found" };
  }

  if (input.httpStatus !== 200) {
    return { status: "error" };
  }

  const body = input.body ?? "";
  if (body.trim() === "") {
    return { status: "empty" };
  }

  return { status: "content", body };
};
