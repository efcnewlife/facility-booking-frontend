import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTranslation } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    },
  });
});

import "@/i18n";
import { API_ENDPOINTS } from "@/api/config";
import { httpClient } from "@/api/services/httpClient";
import AppLocaleSelect from "@/components/auth/AppLocaleSelect";
vi.mock("@efcnewlife/newlife-ui", async () => {
  const React = await import("react");
  return {
    cn: (...classNames: Array<string | undefined | false>) => classNames.filter(Boolean).join(" "),
    Select: ({
      id,
      label,
      options,
      value,
      onChange,
    }: {
      id: string;
      label?: string;
      options: Array<{ value: string; label: string }>;
      value?: string;
      onChange?: (next: string) => void;
    }) =>
      React.createElement(
        "label",
        { htmlFor: id },
        label,
        React.createElement(
          "select",
          {
            id,
            "aria-label": label,
            value: value ?? "",
            onChange: (event: { target: { value: string } }) => onChange?.(event.target.value),
          },
          options.map((option) =>
            React.createElement("option", { key: option.value, value: option.value }, option.label)
          )
        )
      ),
  };
});

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { change_app_language } from "@/i18n";

const EN_LOCALE_ID = "019dd0c8-69fa-7657-87bb-3b7255f5c5ae";
const ZH_TW_LOCALE_ID = "019dd0c8-7540-7601-bfd1-7939ce75c16a";
const ZH_CN_LOCALE_ID = "019dd0c8-7c12-727f-878f-16807adf39e8";

const localeItems = [
  { id: EN_LOCALE_ID, languageCode: "en", isActive: true, isDefault: true },
  {
    id: ZH_TW_LOCALE_ID,
    languageCode: "zh",
    scriptCode: "Hant",
    regionCode: "TW",
    isActive: true,
    isDefault: false,
  },
  {
    id: ZH_CN_LOCALE_ID,
    languageCode: "zh",
    scriptCode: "Hans",
    regionCode: "CN",
    isActive: true,
    isDefault: false,
  },
];

let profilePreferredLocaleId: string | null = null;

const profileResponse = () => ({
  success: true,
  data: {
    id: "user-1",
    email: "qa@test.local",
    first_name: "QA",
    roles: ["member"],
    preferredLocaleId: profilePreferredLocaleId,
  },
  code: 200,
});

const localesResponse = () => ({
  success: true,
  data: { items: localeItems },
  code: 200,
});

const AccountLanguageHarness = () => {
  const { i18n } = useTranslation();
  const { isLoading, user, loginAsMockUser } = useAuth();

  return (
    <>
      <span data-testid="language">{i18n.language}</span>
      <span data-testid="auth-state">{isLoading ? "loading" : "ready"}</span>
      <span data-testid="preference">{user?.preferredLocaleId ?? "none"}</span>
      <button type="button" onClick={() => void loginAsMockUser({ email: "qa@test.local" })}>
        Mock sign in
      </button>
      <AppLocaleSelect id="account-language" showLabel />
    </>
  );
};

const renderHarness = () => {
  render(
    <AuthProvider>
      <AccountLanguageHarness />
    </AuthProvider>
  );
};

const waitUntilReady = async () => {
  await waitFor(() => {
    expect(screen.getByTestId("auth-state")).toHaveTextContent("ready");
  });
};

const preferenceWriteCalls = () => {
  return vi
    .mocked(httpClient.request)
    .mock.calls.filter(([config]) => config.url === API_ENDPOINTS.AUTH.PREFERRED_LANGUAGE);
};

const seedSignedInSession = () => {
  sessionStorage.setItem("auth_token", "access-token");
  sessionStorage.setItem(
    "user_data",
    JSON.stringify({
      id: "user-1",
      username: "qa@test.local",
      email: "qa@test.local",
      status: "active",
      roles: ["member"],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })
  );
};

const chooseTraditionalChinese = async () => {
  const user = userEvent.setup();
  await user.selectOptions(screen.getByRole("combobox"), "zh-TW");
};

describe("Booking account language preference", () => {
  beforeEach(async () => {
    profilePreferredLocaleId = null;
    sessionStorage.clear();
    localStorage.clear();
    vi.spyOn(httpClient, "get").mockImplementation(async (url: string) => {
      if (url === API_ENDPOINTS.AUTH.PROFILE) {
        return profileResponse();
      }
      if (url === API_ENDPOINTS.ORG.LOCALES) {
        return localesResponse();
      }
      throw new Error(`Unexpected GET ${url}`);
    });
    vi.spyOn(httpClient, "request").mockImplementation(async (config) => {
      if (config.url === API_ENDPOINTS.AUTH.PREFERRED_LANGUAGE) {
        return { success: true, data: undefined, code: 204 };
      }
      return { success: false, data: undefined, code: 500 };
    });
    await change_app_language("en");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("changes only the browser language for an unauthenticated visitor", async () => {
    renderHarness();
    await waitUntilReady();

    await chooseTraditionalChinese();

    await waitFor(() => {
      expect(screen.getByTestId("language")).toHaveTextContent("zh-TW");
    });
    expect(httpClient.get).not.toHaveBeenCalled();
    expect(preferenceWriteCalls()).toHaveLength(0);
    expect(screen.getByTestId("preference")).toHaveTextContent("none");
  });

  it("switches immediately and sends the matching system locale for a signed-in Booker", async () => {
    let releaseLocales: (value: ReturnType<typeof localesResponse>) => void = () => undefined;
    vi.spyOn(httpClient, "get").mockImplementation(async (url: string) => {
      if (url === API_ENDPOINTS.AUTH.PROFILE) {
        return profileResponse();
      }
      if (url === API_ENDPOINTS.ORG.LOCALES) {
        return new Promise((resolve) => {
          releaseLocales = resolve;
        });
      }
      throw new Error(`Unexpected GET ${url}`);
    });
    seedSignedInSession();
    renderHarness();
    await waitUntilReady();

    await chooseTraditionalChinese();

    await waitFor(() => {
      expect(screen.getByTestId("language")).toHaveTextContent("zh-TW");
    });
    expect(preferenceWriteCalls()).toHaveLength(0);

    releaseLocales(localesResponse());

    await waitFor(() => {
      expect(preferenceWriteCalls()).toEqual([
        [
          expect.objectContaining({
            method: "PUT",
            url: API_ENDPOINTS.AUTH.PREFERRED_LANGUAGE,
            data: { preferredLocaleId: ZH_TW_LOCALE_ID },
            skipRetry: true,
          }),
        ],
      ]);
    });
    await waitFor(() => {
      expect(screen.getByTestId("preference")).toHaveTextContent(ZH_TW_LOCALE_ID);
    });
    expect(screen.getByTestId("language")).toHaveTextContent("zh-TW");
  });

  it("keeps the session language when the preference update fails, with no notice and no retry", async () => {
    vi.spyOn(httpClient, "request").mockImplementation(async (config) => {
      if (config.url === API_ENDPOINTS.AUTH.PREFERRED_LANGUAGE) {
        throw { code: 500, message: "language save failed" };
      }
      return { success: false, data: undefined, code: 500 };
    });
    seedSignedInSession();
    renderHarness();
    await waitUntilReady();

    await chooseTraditionalChinese();

    await waitFor(() => {
      expect(preferenceWriteCalls()).toHaveLength(1);
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(preferenceWriteCalls()).toHaveLength(1);
    expect(screen.getByTestId("language")).toHaveTextContent("zh-TW");
    expect(screen.getByTestId("preference")).toHaveTextContent("none");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("language save failed")).not.toBeInTheDocument();
  });

  it("applies the stored account language over the browser language on a later authenticated session", async () => {
    profilePreferredLocaleId = ZH_TW_LOCALE_ID;
    seedSignedInSession();
    await change_app_language("en");
    renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId("language")).toHaveTextContent("zh-TW");
    });
    expect(screen.getByTestId("preference")).toHaveTextContent(ZH_TW_LOCALE_ID);
    expect(httpClient.request).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: API_ENDPOINTS.AUTH.PREFERRED_LANGUAGE })
    );
  });

  it("keeps the browser language when the returning account has no stored preference", async () => {
    profilePreferredLocaleId = null;
    seedSignedInSession();
    await change_app_language("zh-TW");
    renderHarness();
    await waitUntilReady();

    expect(screen.getByTestId("language")).toHaveTextContent("zh-TW");
    expect(httpClient.get).not.toHaveBeenCalledWith(API_ENDPOINTS.ORG.LOCALES);
    expect(httpClient.request).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: API_ENDPOINTS.AUTH.PREFERRED_LANGUAGE })
    );
  });

  it("applies the account language when signing in and does not write the browser language", async () => {
    vi.spyOn(httpClient, "request").mockResolvedValue({
      success: true,
      code: 200,
      data: {
        member: {
          id: "user-1",
          email: "qa@test.local",
          first_name: "QA",
          roles: ["member"],
          preferredLocaleId: ZH_TW_LOCALE_ID,
        },
        token: {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          tokenType: "bearer",
          expiresIn: 3600,
        },
      },
    });
    renderHarness();
    await waitUntilReady();

    await userEvent.click(screen.getByRole("button", { name: "Mock sign in" }));

    await waitFor(() => {
      expect(screen.getByTestId("language")).toHaveTextContent("zh-TW");
    });
    expect(screen.getByTestId("preference")).toHaveTextContent(ZH_TW_LOCALE_ID);
    expect(httpClient.request).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: API_ENDPOINTS.AUTH.PREFERRED_LANGUAGE })
    );
  });

  it("keeps a newer language selection when an earlier account preference is still loading", async () => {
    const pendingLocales: Array<(value: ReturnType<typeof localesResponse>) => void> = [];
    profilePreferredLocaleId = EN_LOCALE_ID;
    vi.spyOn(httpClient, "get").mockImplementation(async (url: string) => {
      if (url === API_ENDPOINTS.AUTH.PROFILE) {
        return profileResponse();
      }
      if (url === API_ENDPOINTS.ORG.LOCALES) {
        return new Promise((resolve) => {
          pendingLocales.push(resolve);
        });
      }
      throw new Error(`Unexpected GET ${url}`);
    });
    seedSignedInSession();
    await change_app_language("zh-CN");
    renderHarness();

    await waitFor(() => {
      expect(pendingLocales).toHaveLength(1);
    });

    await chooseTraditionalChinese();

    await waitFor(() => {
      expect(screen.getByTestId("language")).toHaveTextContent("zh-TW");
      expect(pendingLocales).toHaveLength(2);
    });

    await act(async () => {
      pendingLocales[0]?.(localesResponse());
    });

    expect(screen.getByTestId("language")).toHaveTextContent("zh-TW");

    await act(async () => {
      pendingLocales[1]?.(localesResponse());
    });

    await waitFor(() => {
      expect(preferenceWriteCalls()).toEqual([
        [
          expect.objectContaining({
            data: { preferredLocaleId: ZH_TW_LOCALE_ID },
            skipRetry: true,
          }),
        ],
      ]);
    });
    expect(screen.getByTestId("language")).toHaveTextContent("zh-TW");
  });
});
