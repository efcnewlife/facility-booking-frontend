import { describe, expect, it } from "vitest";
import { mapLegalDocumentFetchResult } from "./legalDocumentViewModel";

describe("mapLegalDocumentFetchResult", () => {
  it("returns content with Effective Date when the body has Markdown", () => {
    expect(
      mapLegalDocumentFetchResult({
        httpStatus: 200,
        body: "# Terms\n\nHello",
        effectiveDate: "2026-01-15",
      })
    ).toEqual({
      status: "content",
      body: "# Terms\n\nHello",
      effectiveDate: "2026-01-15",
    });
  });

  it("returns empty when the active document has a blank body", () => {
    expect(mapLegalDocumentFetchResult({ httpStatus: 200, body: "", effectiveDate: "2026-01-15" })).toEqual({
      status: "empty",
    });
    expect(mapLegalDocumentFetchResult({ httpStatus: 200, body: "   \n  ", effectiveDate: "2026-01-15" })).toEqual({
      status: "empty",
    });
  });

  it("returns error when content body is present but Effective Date is missing", () => {
    expect(mapLegalDocumentFetchResult({ httpStatus: 200, body: "# Terms" })).toEqual({ status: "error" });
    expect(mapLegalDocumentFetchResult({ httpStatus: 200, body: "# Terms", effectiveDate: "  " })).toEqual({
      status: "error",
    });
  });

  it("returns not_found for HTTP 404", () => {
    expect(mapLegalDocumentFetchResult({ httpStatus: 404 })).toEqual({ status: "not_found" });
  });

  it("returns error for other HTTP failures", () => {
    expect(mapLegalDocumentFetchResult({ httpStatus: 500 })).toEqual({ status: "error" });
    expect(mapLegalDocumentFetchResult({ httpStatus: 503 })).toEqual({ status: "error" });
  });

  it("returns error when status is missing", () => {
    expect(mapLegalDocumentFetchResult({})).toEqual({ status: "error" });
  });
});
