from flask_apscheduler import APScheduler
import datetime
from firebase_admin import firestore

scheduler = APScheduler()

def cancel_unpaid_bookings():
    """
    Background job that runs every hour.
    Finds all bookings in 'payment_pending' state where 'approved_at' is older than 24 hours.
    Transitions them to 'cancelled' and notifies the requester.
    """
    try:
        db = firestore.client()
        now = datetime.datetime.utcnow()
        cutoff_time = now - datetime.timedelta(hours=24)
        cutoff_iso = cutoff_time.isoformat()

        # Query bookings pending payment
        docs = db.collection('venue_requests')\
            .where('status', '==', 'payment_pending')\
            .stream()

        cancelled_count = 0
        from app.blueprints.notifications.routes import create_notification

        for doc in docs:
            d = doc.to_dict()
            approved_at_iso = d.get('approved_at')
            if not approved_at_iso:
                continue
                
            if approved_at_iso < cutoff_iso:
                # Cancel this booking
                req_ref = db.collection('venue_requests').document(doc.id)
                reason = "Payment timeout (24 hours exceeded)"
                
                req_ref.update({
                    'status': 'cancelled',
                    'rejection_reason': reason,  # reuse this field for notes
                    'cancelled_at': now.isoformat(),
                    'cancelled_by': 'system'
                })

                # Audit trail
                req_ref.collection('status_history').add({
                    'from': 'payment_pending',
                    'to': 'cancelled',
                    'actor': 'system',
                    'reason': reason,
                    'timestamp': now.isoformat()
                })

                # Notify Requester
                venue_doc = db.collection('venues').document(d.get('venue_id', '')).get()
                venue_name = venue_doc.to_dict().get('name', 'Venue') if venue_doc.exists else 'Venue'

                create_notification(
                    recipient_id=d.get('requester_id'),
                    title='Booking Cancelled - Payment Timeout',
                    message=f'Your booking for "{venue_name}" was cancelled because payment was not completed within 24 hours.',
                    type='booking_timeout',
                    related_event_id=None
                )
                
                # Notify Owner
                if venue_doc.exists:
                     create_notification(
                        recipient_id=venue_doc.to_dict().get('owner_id'),
                        title='Booking Cancelled - Payment Timeout',
                        message=f'The booking by {d.get("requester_email")} for "{venue_name}" was cancelled due to payment timeout.',
                        type='booking_timeout',
                        related_event_id=None
                    )

                cancelled_count += 1

        if cancelled_count > 0:
            print(f"[Scheduler] Auto-cancelled {cancelled_count} unpaid venue bookings.")

    except Exception as e:
        print(f"[Scheduler Error] cancel_unpaid_bookings: {e}")


def init_scheduler(app):
    """Integrates APScheduler with Flask app"""
    # Run every hour
    scheduler.add_job(id='cancel_unpaid_bookings_job', func=cancel_unpaid_bookings, trigger='interval', hours=1)
    
    scheduler.init_app(app)
    scheduler.start()
    print("[Scheduler] Started background jobs.")
