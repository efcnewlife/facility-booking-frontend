import AuthLocaleSelect from "@/components/auth/AuthLocaleSelect";
import MicrosoftColorIcon from "@/components/auth/MicrosoftColorIcon";
import LegalDocumentLinks from "@/components/legal/LegalDocumentLinks";
import { ENV_CONFIG, IS_MICROSOFT_LOGIN_ENABLED, IS_SHOW_MOCK_LOGIN } from "@/config/env";
import { useAuth } from "@/context/AuthContext";
import { resolvePostLoginNext } from "@/utils/resolvePostLoginNext";
import { Button, Checkbox, cn, Input } from "@efcnewlife/newlife-ui";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";

const LoginPage = () => {
  const { t } = useTranslation();
  const [rememberMe, setRememberMe] = useState(false);
  const [mockEmail, setMockEmail] = useState(ENV_CONFIG.MOCK_LOGIN_EMAIL);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithMicrosoft, loginAsMockUser, isLoading, error, isAuthenticated, clearError } = useAuth();
  const postLoginPath = resolvePostLoginNext(searchParams.get("next"));

  const isMockEmailValid = useMemo(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(mockEmail.trim());
  }, [mockEmail]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(postLoginPath, { replace: true });
    }
  }, [isAuthenticated, navigate, postLoginPath]);

  const handleMicrosoftSignIn = async () => {
    clearError();
    try {
      await loginWithMicrosoft(rememberMe);
      navigate(postLoginPath, { replace: true });
    } catch (signInError) {
      console.error(signInError);
    }
  };

  const handleMockSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    try {
      await loginAsMockUser({ email: mockEmail, rememberMe });
      navigate(postLoginPath, { replace: true });
    } catch (signInError) {
      console.error(signInError);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-booking-login">
      <div className="absolute top-4 left-4 z-10 sm:top-6 sm:left-6 lg:left-12">
        <img
          alt={t("booking:nav.logoAlt")}
          className="h-[39px] w-auto max-w-[min(180px,40vw)] object-contain object-left"
          src="/images/logo/booking-app-logo.png"
        />
      </div>

      <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
        <AuthLocaleSelect className="w-[180px]" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 pb-14 pt-6 sm:px-8">
        <div
          className={cn(
            "flex w-full max-w-[438px] flex-col items-center rounded-[25px] bg-surface px-[30px] py-10 sm:px-10",
            "shadow-login-card"
          )}
        >
          <img
            alt={t("booking:footer.churchLogoAlt")}
            className="mb-[30px] h-auto w-full max-w-[213px] object-contain"
            src="/images/logo/church-logo.png"
          />

          {error && <p className="mb-5 w-full text-center text-[17.5px] font-medium text-error">{error}</p>}

          {IS_MICROSOFT_LOGIN_ENABLED && (
            <>
              {!IS_SHOW_MOCK_LOGIN && (
                <p className="mb-5 text-center text-[17.5px] font-medium text-on-surface-variant">
                  {t("auth:signInPromptMicrosoft")}
                </p>
              )}

              <Button
                btnType="button"
                className="w-full !rounded-full"
                disabled={isLoading}
                onClick={handleMicrosoftSignIn}
                size="sm"
                startIcon={<MicrosoftColorIcon className="size-[22px] shrink-0" />}
                variant="outline"
              >
                {isLoading ? t("auth:microsoftSigningIn") : t("auth:signInWithMicrosoft")}
              </Button>

              <div className="mt-5 flex w-full items-center justify-center [&_span]:text-[17.5px]">
                <Checkbox checked={rememberMe} onChange={setRememberMe} label={t("auth:keepMeLoggedIn")} />
              </div>
            </>
          )}

          {!IS_MICROSOFT_LOGIN_ENABLED && !IS_SHOW_MOCK_LOGIN && (
            <p className="text-center text-[17.5px] font-medium text-on-surface-variant">
              {t("auth:microsoftNotConfiguredEnv")}
            </p>
          )}

          {IS_SHOW_MOCK_LOGIN && (
            <details className={cn("w-full", IS_MICROSOFT_LOGIN_ENABLED && "mt-[30px]")}>
              <summary className="cursor-pointer text-center text-[15px] font-medium text-on-surface-variant">
                {t("auth:mockLoginSection")}
              </summary>

              <div className="mt-5">
                <p className="mb-5 text-center text-[17.5px] font-medium text-on-surface-variant">
                  {t("auth:signInPromptMock")}
                </p>

                <form className="space-y-5" onSubmit={handleMockSignIn}>
                  <Input
                    id="mock-login-email"
                    label={t("auth:email")}
                    onChange={(event) => setMockEmail(event.target.value)}
                    placeholder="qa@test.local"
                    required
                    type="email"
                    value={mockEmail}
                  />

                  {!IS_MICROSOFT_LOGIN_ENABLED && (
                    <div className="flex w-full items-center justify-center [&_span]:text-[17.5px]">
                      <Checkbox checked={rememberMe} onChange={setRememberMe} label={t("auth:keepMeLoggedIn")} />
                    </div>
                  )}

                  <Button
                    btnType="submit"
                    className="w-full"
                    disabled={isLoading || !isMockEmailValid}
                    size="md"
                    variant="outline"
                  >
                    {isLoading ? t("auth:signingIn") : t("auth:signInWithMockLogin")}
                  </Button>
                </form>
              </div>
            </details>
          )}
        </div>

        <LegalDocumentLinks
          className="mt-[30px]"
          linkClassName="text-[15px] font-medium text-booking-text underline-offset-2 hover:text-booking-secondary hover:underline"
        />
      </div>
    </div>
  );
};

export default LoginPage;
