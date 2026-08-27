import { describe, expect, it } from "vitest";
import { mapLegalDocumentFetchResult } from "./legalDocumentViewModel";

describe("mapLegalDocumentFetchResult", () => {
  it("returns content when the body has Markdown", () => {
    expect(mapLegalDocumentFetchResult({ httpStatus: 200, body: "# Terms\n\nHello" })).toEqual({
      status: "content",
      body: "# Terms\n\nHello",
    });
  });

  it("returns empty when the active document has a blank body", () => {
    expect(mapLegalDocumentFetchResult({ httpStatus: 200, body: "" })).toEqual({ status: "empty" });
    expect(mapLegalDocumentFetchResult({ httpStatus: 200, body: "   \n  " })).toEqual({ status: "empty" });
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
