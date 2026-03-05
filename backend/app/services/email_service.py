import os
import threading
import time

class EmailService:
    """
    Mock Email Service for MVP Phase 4.
    In a real implementation, this would use an SMTP client like SendGrid or Mailgun.
    """
    
    @staticmethod
    def _render_template(template_name, context):
        """
        Renders a basic HTML template with the given context.
        """
        if template_name == 'payment_success':
            return f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                    <h2 style="color: #10b981;">Payment Successful!</h2>
                    <p>Hi {context.get('user_name', 'there')},</p>
                    <p>Your payment of {context.get('amount', 0)} for the event <strong>{context.get('event_name')}</strong> was successful.</p>
                    <p>Transaction ID: {context.get('transaction_id')}</p>
                    <p>Please log in to your dashboard to view your tickets.</p>
                    <br/>
                    <p>Best,<br/>The Huddle Team</p>
                </body>
            </html>
            """
        elif template_name == 'verification_approved':
            return f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                    <h2 style="color: #10b981;">Account Verified!</h2>
                    <p>Hi {context.get('user_name', 'there')},</p>
                    <p>Great news! Your account has been verified for <strong>{context.get('verification_type', 'Host')}</strong> features.</p>
                    <p>You can now start listing and managing your events/venues on Huddle.</p>
                    <br/>
                    <p>Best,<br/>The Huddle Team</p>
                </body>
            </html>
            """
        elif template_name == 'verification_rejected':
            return f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                    <h2 style="color: #ef4444;">Verification Update</h2>
                    <p>Hi {context.get('user_name', 'there')},</p>
                    <p>Unfortunately, your request for <strong>{context.get('verification_type', 'Host')}</strong> verification could not be approved at this time.</p>
                    <p>Reason: {context.get('reason', 'Provided details did not meet our criteria.')}</p>
                    <p>You may update your information and try again later.</p>
                    <br/>
                    <p>Best,<br/>The Huddle Team</p>
                </body>
            </html>
            """
        elif template_name == 'booking_approved':
            return f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                    <h2 style="color: #10b981;">Venue Booking Approved!</h2>
                    <p>Hi {context.get('user_name', 'there')},</p>
                    <p>Your booking request for <strong>{context.get('venue_name')}</strong> on <strong>{context.get('date')}</strong> from {context.get('start_time')} to {context.get('end_time')} has been approved by the host!</p>
                    <p>We hope you have a wonderful event.</p>
                    <br/>
                    <p>Best,<br/>The Huddle Team</p>
                </body>
            </html>
            """
        elif template_name == 'booking_rejected':
            return f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                    <h2 style="color: #ef4444;">Venue Booking Update</h2>
                    <p>Hi {context.get('user_name', 'there')},</p>
                    <p>Unfortunately, your booking request for <strong>{context.get('venue_name')}</strong> on <strong>{context.get('date')}</strong> was declined by the host.</p>
                    <p>Please explore other venues on Huddle for your event.</p>
                    <br/>
                    <p>Best,<br/>The Huddle Team</p>
                </body>
            </html>
            """
        elif template_name == 'refund_processed':
            return f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                    <h2 style="color: #f59e0b;">Refund Processed</h2>
                    <p>Hi {context.get('user_name', 'there')},</p>
                    <p>Your refund for the event <strong>{context.get('event_name')}</strong> has been processed.</p>
                    <p>Refund Amount: <strong>{context.get('amount', 'N/A')}</strong></p>
                    <p>Payment Reference: {context.get('payment_id', 'N/A')}</p>
                    <p>The refund will reflect in your account within 5-7 business days.</p>
                    <br/>
                    <p>Best,<br/>The Huddle Team</p>
                </body>
            </html>
            """
        return f"<p>{str(context)}</p>"

    @staticmethod
    def _simulate_send(recipient_email, subject, html_content):
        """
        Simulates network latency and logs the email to the backend terminal.
        """
        time.sleep(1) # Simulate SMTP latency
        
        separator = "=" * 60
        mock_log = f"""\n{separator}
[MOCK EMAIL DISPATCHED]
To:      {recipient_email}
Subject: {subject}
{separator}
{html_content.strip()}
{separator}\n"""
        
        print(mock_log)

    @classmethod
    def send_email(cls, to_email, subject, template_name, context=None):
        """
        Public method to dispatch an email. Handles the rendering and async sending.
        """
        if not context:
            context = {}
            
        html_body = cls._render_template(template_name, context)
        
        # Fire and forget thread so we don't block the API response
        thread = threading.Thread(
            target=cls._simulate_send, 
            args=(to_email, subject, html_body)
        )
        thread.daemon = True
        thread.start()
        
        return True
