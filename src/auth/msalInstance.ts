import { ENV_CONFIG, IS_MICROSOFT_LOGIN_ENABLED } from "@/config/env";
import { type Configuration, PublicClientApplication } from "@azure/msal-browser";

export const MSAL_LOGIN_SCOPES: string[] = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "User.Read.All",
];

let msalInstance: PublicClientApplication | null = null;

const buildConfig = (): Configuration | null => {
  if (!IS_MICROSOFT_LOGIN_ENABLED) {
    return null;
  }

  const redirectUri = ENV_CONFIG.AZURE_REDIRECT_URI?.trim() || `${window.location.origin}`;

  return {
    auth: {
      clientId: ENV_CONFIG.AZURE_CLIENT_ID.trim(),
      authority: `https://login.microsoftonline.com/${ENV_CONFIG.AZURE_TENANT_ID.trim()}`,
      redirectUri,
    },
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: false,
    },
  };
};

export const getMsalInstance = (): PublicClientApplication | null => {
  if (!IS_MICROSOFT_LOGIN_ENABLED) {
    return null;
  }

  if (!msalInstance) {
    const config = buildConfig();
    if (!config) {
      return null;
    }
    msalInstance = new PublicClientApplication(config);
  }

  return msalInstance;
};

export const ensureMsalReady = async (): Promise<PublicClientApplication | null> => {
  const app = getMsalInstance();
  if (!app) {
    return null;
  }
  await app.initialize();
  return app;
};
