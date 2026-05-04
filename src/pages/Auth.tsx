import { useState } from "react";
import { useAuth } from "@/components/extensions/auth-email/useAuth";
import { LoginForm } from "@/components/extensions/auth-email/LoginForm";
import { RegisterForm } from "@/components/extensions/auth-email/RegisterForm";
import { ResetPasswordForm } from "@/components/extensions/auth-email/ResetPasswordForm";

const AUTH_URL = "https://functions.poehali.dev/9d23499c-1556-498e-801e-74e66d3ae884";

type View = "login" | "register" | "reset";

interface AuthPageProps {
  onSuccess: () => void;
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [view, setView] = useState<View>("login");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const auth = useAuth({
    apiUrls: {
      login: `${AUTH_URL}?action=login`,
      register: `${AUTH_URL}?action=register`,
      verifyEmail: `${AUTH_URL}?action=verify-email`,
      refresh: `${AUTH_URL}?action=refresh`,
      logout: `${AUTH_URL}?action=logout`,
      resetPassword: `${AUTH_URL}?action=reset-password`,
    },
  });

  const handleResetSuccess = () => {
    setSuccessMessage("Пароль успешно изменён. Войдите с новым паролем.");
    setView("login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-md">
        {view === "login" && (
          <LoginForm
            onLogin={auth.login}
            onSuccess={onSuccess}
            onRegisterClick={() => { setSuccessMessage(null); setView("register"); }}
            onForgotPasswordClick={() => { setSuccessMessage(null); setView("reset"); }}
            error={auth.error}
            isLoading={auth.isLoading}
            successMessage={successMessage}
          />
        )}

        {view === "register" && (
          <RegisterForm
            onRegister={auth.register}
            onVerifyEmail={auth.verifyEmail}
            onSuccess={onSuccess}
            onLoginClick={() => setView("login")}
            error={auth.error}
            isLoading={auth.isLoading}
          />
        )}

        {view === "reset" && (
          <ResetPasswordForm
            onRequestReset={auth.requestPasswordReset}
            onResetPassword={auth.resetPassword}
            onSuccess={handleResetSuccess}
            onLoginClick={() => setView("login")}
            error={auth.error}
            isLoading={auth.isLoading}
          />
        )}
      </div>
    </div>
  );
}
