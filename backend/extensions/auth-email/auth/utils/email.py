"""Email utilities for sending verification codes."""
import os
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def is_email_enabled() -> bool:
    """Check if email sending is configured."""
    return bool(os.environ.get('SMTP_USER') and os.environ.get('SMTP_PASSWORD'))


def generate_code() -> str:
    """Generate 6-digit verification code using cryptographically secure random."""
    return str(secrets.randbelow(900000) + 100000)


def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Send email via SMTP (Gmail by default)."""
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_password = os.environ.get('SMTP_PASSWORD', '')
    smtp_from = os.environ.get('SMTP_FROM', smtp_user)

    if not smtp_user or not smtp_password:
        return False

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = smtp_from
    msg['To'] = to_email

    msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_body, 'html', 'utf-8'))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, to_email, msg.as_string())
        return True
    except (smtplib.SMTPException, OSError):
        return False


def send_verification_code(to_email: str, code: str, app_url: str = '') -> bool:
    """Send email verification link."""
    import urllib.parse
    subject = "Подтверждение регистрации"

    encoded_email = urllib.parse.quote(to_email)
    verify_url = f"{app_url}?verify={code}&email={encoded_email}"

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0e1117; color: #e8edf5; padding: 40px 30px; border-radius: 16px;">
        <h2 style="color: #5eadd4; margin-bottom: 8px;">Подтверждение регистрации</h2>
        <p style="color: #a8b4c8; margin-bottom: 30px;">Нажмите кнопку ниже, чтобы подтвердить email и войти в аккаунт:</p>
        <a href="{verify_url}"
           style="display: inline-block; background: #2b5278; color: #5eadd4;
                  text-decoration: none; padding: 14px 32px; border-radius: 10px;
                  font-size: 16px; font-weight: 600; margin-bottom: 24px;">
            Подтвердить email
        </a>
        <p style="color: #5e6e85; font-size: 13px; margin-top: 24px;">
            Ссылка действительна 24 часа.<br>
            Если вы не регистрировались — проигнорируйте это письмо.
        </p>
        <p style="color: #5e6e85; font-size: 12px;">Или скопируйте ссылку: {verify_url}</p>
    </div>
    """

    text_body = f"Подтвердите регистрацию, перейдя по ссылке:\n{verify_url}\n\nСсылка действительна 24 часа."

    return send_email(to_email, subject, html_body, text_body)


def send_password_reset_code(to_email: str, code: str) -> bool:
    """Send password reset code."""
    subject = "Код для сброса пароля"

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Сброс пароля</h2>
        <p>Ваш код для сброса пароля:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;
                  background: #f5f5f5; padding: 20px; text-align: center;
                  border-radius: 8px; margin: 20px 0;">
            {code}
        </p>
        <p style="color: #666; font-size: 14px;">
            Код действителен 1 час. Если вы не запрашивали сброс — проигнорируйте это письмо.
        </p>
    </div>
    """

    text_body = f"Ваш код для сброса пароля: {code}"

    return send_email(to_email, subject, html_body, text_body)