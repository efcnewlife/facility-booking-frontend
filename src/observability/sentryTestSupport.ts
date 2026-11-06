import * as Sentry from "@sentry/react";

type SentryTransport = NonNullable<Sentry.BrowserOptions["transport"]>;

export type CapturedEnvelopeItem = { type: string; payload: Record<string, unknown> };

/**
 * Test-only Sentry transport: keeps serialized envelopes in memory instead of sending them,
 * or rejects every send to simulate unavailable ingestion. Never import it from app code.
 */
export const createCapturedSentryTransport = ({ unavailable = false } = {}) => {
  const items: CapturedEnvelopeItem[] = [];
  let sendAttempts = 0;

  const transport: SentryTransport = (options) =>
    Sentry.createTransport(options, async ({ body }) => {
      sendAttempts += 1;
      if (unavailable) throw new TypeError("Failed to fetch");
      items.push(...parseEnvelopeItems(body));
      return { statusCode: 200 };
    });

  return {
    transport,
    items,
    events: () => items.filter((item) => item.type === "event").map((item) => item.payload),
    logs: () =>
      items
        .filter((item) => item.type === "log")
        .flatMap((item) => (item.payload as { items: Array<Record<string, unknown>> }).items),
    sendAttempts: () => sendAttempts,
  };
};

const parseEnvelopeItems = (body: string | Uint8Array): CapturedEnvelopeItem[] => {
  const text = typeof body === "string" ? body : new TextDecoder().decode(body);
  const [, ...lines] = text.split("\n").filter(Boolean);
  const items: CapturedEnvelopeItem[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    const header = JSON.parse(lines[i]) as { type: string };
    items.push({ type: header.type, payload: JSON.parse(lines[i + 1]) as Record<string, unknown> });
  }
  return items;
};

/** Drops the active client and scope data so each test starts from an uninitialized SDK. */
export const resetSentryForTests = async () => {
  await Sentry.close();
  Sentry.getCurrentScope().setClient(undefined);
  Sentry.getCurrentScope().clearBreadcrumbs();
  Sentry.getIsolationScope().clearBreadcrumbs();
  Sentry.setUser(null);
};
