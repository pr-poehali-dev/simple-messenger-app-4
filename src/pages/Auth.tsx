import { useState, useEffect } from "react";
import type { UseAuthReturn } from "@/components/extensions/auth-email/useAuth";
import { LoginForm } from "@/components/extensions/auth-email/LoginForm";
import { RegisterForm } from "@/components/extensions/auth-email/RegisterForm";
import { ResetPasswordForm } from "@/components/extensions/auth-email/ResetPasswordForm";

type View = "login" | "register" | "reset" | "verifying";

interface AuthPageProps {
  auth: UseAuthReturn;
}

export default function AuthPage({ auth }: AuthPageProps) {
  const [view, setView] = useState<View>("login");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Обрабатываем ссылку подтверждения ?verify=КОД&email=EMAIL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("verify");
    const email = params.get("email");
    if (!code || !email) return;

    // Убираем параметры из URL
    window.history.replaceState({}, '', window.location.pathname);

    setView("verifying");

    auth.verifyEmail(email, code).then((ok) => {
      if (ok) {
        setSuccessMessage("Email подтверждён! Войдите в аккаунт.");
      } else {
        setVerifyError("Ссылка недействительна или уже использована.");
      }
      setView("login");
    });
  }, []);

  const handleResetSuccess = () => {
    setSuccessMessage("Пароль успешно изменён. Войдите с новым паролем.");
    setView("login");
  };

  if (view === "verifying") {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0e1117', gap: 16 }}>
        <div style={{ width: 44, height: 44, border: '3px solid #2b5278', borderTop: '3px solid #5eadd4', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ color: '#8896a3', fontSize: 15 }}>Подтверждаем email...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1117', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {view === "login" && (
          <LoginForm
            onLogin={auth.login}
            onRegisterClick={() => { setSuccessMessage(null); setVerifyError(null); setView("register"); }}
            onForgotPasswordClick={() => { setSuccessMessage(null); setVerifyError(null); setView("reset"); }}
            error={verifyError || auth.error}
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
