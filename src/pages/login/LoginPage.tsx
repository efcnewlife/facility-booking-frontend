import AuthLocaleSelect from "@/components/auth/AuthLocaleSelect";
import MicrosoftColorIcon from "@/components/auth/MicrosoftColorIcon";
import { ENV_CONFIG, IS_MICROSOFT_LOGIN_ENABLED, IS_SHOW_DEV_LOGIN } from "@/config/env";
import { useAuth } from "@/context/AuthContext";
import { Checkbox, cn, Input } from "@efcnewlife/newlife-ui";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

const LoginPage = () => {
  const { t } = useTranslation();
  const [rememberMe, setRememberMe] = useState(false);
  const [devEmail, setDevEmail] = useState(ENV_CONFIG.DEV_LOGIN_EMAIL);
  const navigate = useNavigate();
  const { loginWithMicrosoft, loginAsDevUser, isLoading, error, isAuthenticated, clearError } = useAuth();

  const isDevEmailValid = useMemo(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(devEmail.trim());
  }, [devEmail]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleMicrosoftSignIn = async () => {
    clearError();
    try {
      await loginWithMicrosoft(rememberMe);
      navigate("/", { replace: true });
    } catch (signInError) {
      console.error(signInError);
    }
  };

  const handleDevSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    try {
      await loginAsDevUser({ email: devEmail, rememberMe });
      navigate("/", { replace: true });
    } catch (signInError) {
      console.error(signInError);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface-container">
      <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
        <AuthLocaleSelect />
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <img alt="" className="absolute left-0 top-[-10%] h-[110%] w-full max-w-none object-cover" src="/images/login/gradient-bg.png" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-8 py-14">
        <div
          className={cn("flex w-full max-w-[480px] flex-col items-center rounded-[36px] bg-surface px-12 pb-14 pt-14", "shadow-login-card")}
        >
          <div className="mb-12 flex flex-col items-center text-center">
            <img alt="EFC New Life" className="h-auto w-full max-w-[320px] object-contain" src="/images/logo/main-light-wide.png" />
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-on-surface">{t("booking:appTitle")}</h1>
          </div>

          {error && <p className="mb-6 text-center text-base font-medium text-error">{error}</p>}

          {IS_MICROSOFT_LOGIN_ENABLED && (
            <>
              {!IS_SHOW_DEV_LOGIN && (
                <p className="mb-6 text-center text-base font-medium text-on-surface-variant">{t("auth:signInPromptMicrosoft")}</p>
              )}

              <button
                className="flex h-14 w-[320px] items-center justify-center gap-3 rounded-[30px] bg-cta text-xl font-bold text-on-cta transition-colors hover:bg-cta-hover hover:text-on-cta-hover hover:ring-1 hover:ring-inset hover:ring-primary active:bg-cta-active active:text-on-cta-active disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                onClick={handleMicrosoftSignIn}
                type="button"
              >
                <MicrosoftColorIcon className="size-6 shrink-0" />
                {isLoading ? t("auth:microsoftSigningIn") : t("auth:signInWithMicrosoft")}
              </button>

              <div className="mt-6 flex w-full items-center justify-center [&_span]:text-base">
                <Checkbox checked={rememberMe} onChange={setRememberMe} label={t("auth:keepMeLoggedIn")} />
              </div>
            </>
          )}

          {!IS_MICROSOFT_LOGIN_ENABLED && !IS_SHOW_DEV_LOGIN && (
            <p className="mb-6 text-center text-base font-medium text-on-surface-variant">
              {t("auth:microsoftNotConfiguredEnv")}
            </p>
          )}

          {IS_SHOW_DEV_LOGIN && (
            <div className={cn("w-full", IS_MICROSOFT_LOGIN_ENABLED && "mt-8")}>
              {IS_MICROSOFT_LOGIN_ENABLED && (
                <div className="relative mb-6 py-2">
                  <div aria-hidden="true" className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-outline-variant" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-surface px-2 text-on-surface-variant">{t("auth:devEmailSignInSection")}</span>
                  </div>
                </div>
              )}

              <p className="mb-4 text-center text-base font-medium text-on-surface-variant">{t("auth:signInPromptDev")}</p>

              <form className="space-y-4" onSubmit={handleDevSignIn}>
                <Input
                  id="dev-email"
                  label={t("auth:email")}
                  onChange={(event) => setDevEmail(event.target.value)}
                  placeholder="dev@local.test"
                  required
                  type="email"
                  value={devEmail}
                />

                {!IS_MICROSOFT_LOGIN_ENABLED && (
                  <div className="flex w-full items-center justify-center [&_span]:text-base">
                    <Checkbox checked={rememberMe} onChange={setRememberMe} label={t("auth:keepMeLoggedIn")} />
                  </div>
                )}

                <button
                  className="flex h-14 w-full items-center justify-center rounded-[30px] border border-gray-dark bg-surface text-xl font-bold text-gray-dark transition-colors hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading || !isDevEmailValid}
                  type="submit"
                >
                  {isLoading ? t("auth:signingIn") : t("auth:signInWithEmailDev")}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
