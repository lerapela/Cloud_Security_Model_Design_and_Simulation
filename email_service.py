import smtplib
from email.mime.text import MIMEText


def send_approval_email(email, password):
    msg = MIMEText(f"Your account has been approved!\n\nEmail: {email}\nPassword: {password}")
    msg['Subject'] = 'Your CloudVM Account Approval'
    msg['From'] = 'noreply@cloudvm.com'
    msg['To'] = email

    with smtplib.SMTP('your-smtp-server.com', 587) as server:
        server.login('your-email@example.com', 'your-password')
        server.send_message(msg)