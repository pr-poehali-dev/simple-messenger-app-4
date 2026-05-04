/**
 * Auth Email Extension - Register Form
 *
 * Форма регистрации с поддержкой верификации email через 6-значный код.
 */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

// ============================================================================
// ТИПЫ
// ============================================================================

interface RegisterResult {
  success: boolean;
  emailVerificationRequired: boolean;
  message?: string;
}

interface RegisterFormProps {
  /** Функция регистрации из useAuth */
  onRegister: (payload: {
    email: string;
    password: string;
    name?: string;
  }) => Promise<RegisterResult>;
  /** Функция верификации email из useAuth */
  onVerifyEmail: (email: string, code: string) => Promise<boolean>;
  /** Функция входа из useAuth */
  onLogin: (payload: { email: string; password: string }) => Promise<boolean>;
  /** Callback после успешной регистрации и входа */
  onSuccess?: () => void;
  /** Переход на вход */
  onLoginClick?: () => void;
  /** Ошибка из useAuth */
  error?: string | null;
  /** Состояние загрузки */
  isLoading?: boolean;
  /** CSS класс для Card */
  className?: string;
}

type Step = "register" | "verify";

// ============================================================================
// КОМПОНЕНТ
// ============================================================================

export function RegisterForm({
  onRegister,
  onVerifyEmail,
  onLogin,
  onSuccess,
  onLoginClick,
  error,
  isLoading = false,
  className = "",
}: RegisterFormProps): React.ReactElement {
  const [step, setStep] = useState<Step>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError("Заполните обязательные поля");
      return;
    }

    if (password !== confirmPassword) {
      setLocalError("Пароли не совпадают");
      return;
    }

    if (password.length < 8) {
      setLocalError("Пароль должен содержать минимум 8 символов");
      return;
    }

    setIsBusy(true);
    const result = await onRegister({
      email,
      password,
      name: name || undefined,
    });
    setIsBusy(false);

    if (result.success) {
      if (result.emailVerificationRequired) {
        setMessage(result.message || "Код отправлен на email");
        setStep("verify");
      } else {
        onSuccess?.();
      }
    } else if (!result.success && !result.emailVerificationRequired) {
      setLocalError("Ошибка регистрации. Попробуйте ещё раз.");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (code.length !== 6) {
      setLocalError("Введите 6-значный код");
      return;
    }

    const verified = await onVerifyEmail(email, code);

    if (verified) {
      if (onLogin) {
        const loggedIn = await onLogin({ email, password });
        if (loggedIn) {
          onSuccess?.();
          return;
        }
      }
      // Верификация прошла, но автовход не удался — предлагаем войти вручную
      setMessage("Email подтверждён! Войдите в аккаунт.");
      onLoginClick?.();
    }
  };

  const handleResend = async () => {
    setLocalError(null);
    setCode("");
    setIsResending(true);

    try {
      const result = await onRegister({
        email,
        password,
        name: name || undefined,
      });

      if (result.success) {
        setMessage("Код отправлен повторно");
      }
    } finally {
      setIsResending(false);
    }
  };

  const displayError = error || localError;

  // ============================================================================
  // STEP: VERIFY EMAIL
  // ============================================================================

  if (step === "verify") {
    return (
      <Card className={className}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Проверьте почту</CardTitle>
          <CardDescription>
            Письмо со ссылкой отправлено на {email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>📧</div>
            <p style={{ color: '#a8b4c8', fontSize: 14, lineHeight: 1.6 }}>
              Откройте письмо и нажмите кнопку<br />
              <strong style={{ color: '#fff' }}>«Подтвердить email»</strong>
            </p>
            <p style={{ color: '#5e6e85', fontSize: 12, marginTop: 12 }}>
              Ссылка действительна 24 часа
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? "Отправка..." : "Отправить письмо повторно"}
          </Button>
          <button
            type="button"
            onClick={() => setStep("register")}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Изменить email
          </button>
        </CardFooter>
      </Card>
    );
  }

  // ============================================================================
  // STEP: REGISTER
  // ============================================================================

  return (
    <Card className={className}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Регистрация</CardTitle>
        <CardDescription>
          Создайте аккаунт для начала работы
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleRegister}>
        <CardContent className="space-y-4">
          {displayError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {displayError}
              {displayError?.includes("уже существует") && onLoginClick && (
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="block mt-2 text-primary hover:underline underline-offset-4"
                >
                  Войти в существующий аккаунт
                </button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input
              id="name"
              type="text"
              placeholder="Иван Иванов"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="mail@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Пароль <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-muted-foreground">
              Минимум 8 символов, буквы и цифры
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Подтвердите пароль <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isBusy || isLoading}>
            {isBusy || isLoading ? "Регистрация..." : "Зарегистрироваться"}
          </Button>

          {onLoginClick && (
            <p className="text-sm text-muted-foreground text-center">
              Уже есть аккаунт?{" "}
              <button
                type="button"
                onClick={onLoginClick}
                className="text-primary hover:underline underline-offset-4"
              >
                Войти
              </button>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

// ============================================================================
// ПРИМЕР ИСПОЛЬЗОВАНИЯ
// ============================================================================

/*
import { useAuth } from "./useAuth";
import { RegisterForm } from "./RegisterForm";

const AUTH_URL = "https://functions.poehali.dev/xxx";

function AuthPage() {
  const { register, verifyEmail, login, error, isLoading } = useAuth({
    apiUrls: {
      login: `${AUTH_URL}?action=login`,
      register: `${AUTH_URL}?action=register`,
      verifyEmail: `${AUTH_URL}?action=verify-email`,
      refresh: `${AUTH_URL}?action=refresh`,
      logout: `${AUTH_URL}?action=logout`,
      resetPassword: `${AUTH_URL}?action=reset-password`,
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center">
      <RegisterForm
        onRegister={register}
        onVerifyEmail={verifyEmail}
        onLogin={login}
        onSuccess={() => window.location.href = "/dashboard"}
        onLoginClick={() => setView("login")}
        error={error}
        isLoading={isLoading}
        className="w-full max-w-md"
      />
    </div>
  );
}
*/

export default RegisterForm;