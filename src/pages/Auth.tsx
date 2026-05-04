import { useState } from "react";
import type { UseAuthReturn } from "@/components/extensions/auth-email/useAuth";
import { LoginForm } from "@/components/extensions/auth-email/LoginForm";
import { RegisterForm } from "@/components/extensions/auth-email/RegisterForm";
import { ResetPasswordForm } from "@/components/extensions/auth-email/ResetPasswordForm";

type View = "login" | "register" | "reset";

interface AuthPageProps {
  auth: UseAuthReturn;
}

export default function AuthPage({ auth }: AuthPageProps) {
  const [view, setView] = useState<View>("login");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
            onLogin={auth.login}
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