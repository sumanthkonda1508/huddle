import os
import time
import uuid
import razorpay
from flask import request, jsonify, g
from firebase_admin import firestore
from . import payments_bp
from app.middleware import login_required, require_role, validate_request
from app.schemas import PaymentInit, PaymentVerify, RefundRequest

db = firestore.client()

# Setup Razorpay client securely based on ENV presence
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET')

# Using a flag to determine if we are in mock mode
USE_MOCK = not (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)

if not USE_MOCK:
    rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
else:
    print("WARNING: Razorpay keys not found. Running in MOCK Mode.")


# ---------------------------------------------------------------------------
# Helper: Issue ticket + increment tickets_sold atomically
# ---------------------------------------------------------------------------
def _issue_ticket_for_order(order_data, payment_id, uid):
    """
    Creates a ticket document and atomically increments tickets_sold on the
    event.  Returns the ticket_id on success, or raises on capacity overflow.

    This is called from both /verify and /webhook to ensure idempotency — if
    the order already has a linked_ticket_id we skip re-creation.
    """
    event_id = order_data['event_id']
    event_ref = db.collection('events').document(event_id)

    ticket_id = f"tkt_{uuid.uuid4().hex}"

    @firestore.transactional
    def _txn(transaction):
        event_snap = event_ref.get(transaction=transaction)
        if not event_snap.exists:
            raise ValueError("Event not found")

        evt = event_snap.to_dict()
        sold = int(evt.get('tickets_sold', 0))
        max_t = evt.get('max_tickets') or evt.get('maxParticipants', 0)

        if max_t and sold >= int(max_t):
            raise ValueError("Event is sold out — no tickets available")

        # Create ticket inside transaction scope for atomicity
        ticket_ref = db.collection('tickets').document(ticket_id)
        transaction.set(ticket_ref, {
            'id': ticket_id,
            'event_id': event_id,
            'user_id': uid,
            'payment_id': payment_id,
            'order_id': order_data.get('order_id', ''),
            'status': 'active',
            'created_at': int(time.time()),
            'is_mock': USE_MOCK
        })

        # Compute new values explicitly (Increment sentinels don't work in transactions)
        current_participants = evt.get('participants', [])
        new_participants = list(set(current_participants + [uid]))
        current_attendee_count = int(evt.get('attendeeCount', len(current_participants)))

        transaction.update(event_ref, {
            'tickets_sold': sold + 1,
            'participants': new_participants,
            'attendeeCount': current_attendee_count + 1
        })

    transaction = db.transaction()
    _txn(transaction)
    return ticket_id


# ---------------------------------------------------------------------------
# POST /api/payments/create-order
# ---------------------------------------------------------------------------
@payments_bp.route('/create-order', methods=['POST'])
@login_required
@validate_request(PaymentInit)
def create_order():
    """
    Initializes a new payment order. Either returns a real Razorpay Order ID
    or a Mock Order ID for testing environments.
    """
    data = g.validated_data
    uid = g.user['uid']

    amount = data['amount']
    currency = data.get('currency', 'INR')
    event_id = data['event_id']

    # Amount must be in subunits (Paise for INR).
    amount_in_paise = int(amount * 100)

    try:
        order_meta = {
            "amount": amount_in_paise,
            "currency": currency,
            "receipt": f"rcpt_{uuid.uuid4().hex[:8]}",
            "notes": {
                "event_id": event_id,
                "user_id": uid
            }
        }

        if not USE_MOCK:
            order = rzp_client.order.create(data=order_meta)
            order_id = order['id']
        else:
            order_id = f"order_mock_{uuid.uuid4().hex[:12]}"

        # Store in DB
        db.collection('payment_orders').document(order_id).set({
            'order_id': order_id,
            'user_id': uid,
            'event_id': event_id,
            'amount': amount,
            'currency': currency,
            'status': 'created',
            'created_at': int(time.time()),
            'is_mock': USE_MOCK
        })

        return jsonify({
            'order_id': order_id,
            'amount': amount_in_paise,
            'currency': currency,
            'mock': USE_MOCK
        }), 200

    except Exception as e:
        print("Payment Creation Error:", e)
        return jsonify({'error': str(e)}), 500


# ---------------------------------------------------------------------------
# POST /api/payments/verify
# ---------------------------------------------------------------------------
@payments_bp.route('/verify', methods=['POST'])
@login_required
@validate_request(PaymentVerify)
def verify_payment():
    """
    Client calls this after receiving success from Razorpay frontend SDK.
    Server verifies signature cryptographically (or accepts mock format).
    Issues ticket atomically and prevents overselling.
    """
    data = g.validated_data
    razorpay_order_id = data['razorpay_order_id']
    razorpay_payment_id = data['razorpay_payment_id']
    razorpay_signature = data['razorpay_signature']

    uid = g.user['uid']

    try:
        # Prevent double-processing
        order_ref = db.collection('payment_orders').document(razorpay_order_id)
        order_doc = order_ref.get()

        if not order_doc.exists:
            return jsonify({'error': 'Order not found'}), 404

        order_data = order_doc.to_dict()

        # Idempotency: already verified
        if order_data.get('status') == 'paid':
            return jsonify({
                'message': 'Payment already verified',
                'ticket_id': order_data.get('linked_ticket_id')
            }), 200

        # Verify the order belongs to this user
        if order_data.get('user_id') != uid:
            return jsonify({'error': 'Order does not belong to this user'}), 403

        # Signature verification
        if not USE_MOCK:
            rzp_client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            })
        else:
            if razorpay_signature != f"mock_sig_{razorpay_order_id}":
                return jsonify({'error': 'Invalid mock signature'}), 400

        # Issue ticket atomically (increments tickets_sold inside transaction)
        ticket_id = _issue_ticket_for_order(order_data, razorpay_payment_id, uid)

        # Mark order as paid
        order_ref.update({
            'status': 'paid',
            'payment_id': razorpay_payment_id,
            'linked_ticket_id': ticket_id,
            'verified_at': int(time.time())
        })

        # Send receipt email
        _send_payment_email(uid, order_data)

        return jsonify({
            'message': 'Payment verified successfully',
            'ticket_id': ticket_id
        }), 200

    except ValueError as ve:
        # Capacity / event-not-found errors from transaction
        return jsonify({'error': str(ve)}), 400
    except razorpay.errors.SignatureVerificationError:
        return jsonify({'error': 'Payment verification failed — invalid signature'}), 400
    except Exception as e:
        print("Payment Verification Error:", e)
        return jsonify({'error': str(e)}), 500


# ---------------------------------------------------------------------------
# POST /api/payments/webhook   (Razorpay server-to-server)
# ---------------------------------------------------------------------------
@payments_bp.route('/webhook', methods=['POST'])
def razorpay_webhook():
    """
    Receives server-to-server notifications from Razorpay.
    Handles payment.captured (ticket issuing fallback) and refund.processed.
    """
    webhook_secret = os.getenv('RAZORPAY_WEBHOOK_SECRET', '')
    webhook_signature = request.headers.get('X-Razorpay-Signature')
    payload = request.get_data(as_text=True)

    if not USE_MOCK:
        if not webhook_signature or not webhook_secret:
            return jsonify({'error': 'Invalid webhook configuration'}), 400

        try:
            rzp_client.utility.verify_webhook_signature(
                payload, webhook_signature, webhook_secret
            )
        except razorpay.errors.SignatureVerificationError:
            return jsonify({'error': 'Webhook signature validation failed'}), 400

    data = request.json
    event_type = data.get('event')

    # ------ payment.captured ------
    if event_type == 'payment.captured':
        payment_entity = data.get('payload', {}).get('payment', {}).get('entity', {})
        order_id = payment_entity.get('order_id')
        payment_id = payment_entity.get('id')

        if order_id:
            order_ref = db.collection('payment_orders').document(order_id)
            order_doc = order_ref.get()

            if order_doc.exists and order_doc.to_dict().get('status') != 'paid':
                order_data = order_doc.to_dict()
                uid = order_data.get('user_id')

                try:
                    ticket_id = _issue_ticket_for_order(order_data, payment_id, uid)
                    order_ref.update({
                        'status': 'paid',
                        'payment_id': payment_id,
                        'linked_ticket_id': ticket_id,
                        'verified_at': int(time.time())
                    })
                    _send_payment_email(uid, order_data)
                except Exception as e:
                    print(f"Webhook ticket creation failed for order {order_id}: {e}")

    # ------ refund.processed ------
    elif event_type in ('refund.processed', 'payment.refunded'):
        refund_entity = data.get('payload', {}).get('refund', {}).get('entity', {})
        payment_id = refund_entity.get('payment_id')

        if payment_id:
            # Find the order by payment_id
            orders = db.collection('payment_orders')\
                .where('payment_id', '==', payment_id)\
                .limit(1).stream()
            order_doc = next(orders, None)
            if order_doc and order_doc.to_dict().get('status') != 'refunded':
                order_ref = order_doc.reference
                order_ref.update({'status': 'refunded', 'refunded_at': int(time.time())})

    return jsonify({'status': 'ok'}), 200


# ---------------------------------------------------------------------------
# POST /api/payments/<payment_id>/refund
# ---------------------------------------------------------------------------
@payments_bp.route('/<payment_id>/refund', methods=['POST'])
@login_required
def refund_payment(payment_id):
    """
    Initiates a refund for a specific payment.
    Only the event host or an admin can initiate refunds.
    """
    uid = g.user['uid']

    try:
        # Find the order linked to this payment
        orders = db.collection('payment_orders')\
            .where('payment_id', '==', payment_id)\
            .limit(1).stream()
        order_doc = next(orders, None)

        if not order_doc:
            return jsonify({'error': 'Payment order not found'}), 404

        order_data = order_doc.to_dict()

        if order_data.get('status') == 'refunded':
            return jsonify({'message': 'Already refunded'}), 200

        if order_data.get('status') != 'paid':
            return jsonify({'error': 'Payment is not in a refundable state'}), 400

        # Authorization: must be event host or admin
        event_id = order_data.get('event_id')
        event_doc = db.collection('events').document(event_id).get()

        user_doc = db.collection('users').document(uid).get()
        user_role = user_doc.to_dict().get('role', 'user') if user_doc.exists else 'user'
        is_host = event_doc.exists and event_doc.to_dict().get('hostId') == uid
        is_admin = user_role == 'admin'

        if not (is_host or is_admin):
            return jsonify({'error': 'Only the event host or an admin can issue refunds'}), 403

        # Process refund
        if not USE_MOCK:
            rzp_client.payment.refund(payment_id, {
                'amount': int(order_data.get('amount', 0) * 100),  # paise
                'speed': 'normal'
            })

        # Update order status
        order_doc.reference.update({
            'status': 'refunded',
            'refunded_at': int(time.time()),
            'refunded_by': uid
        })

        # Update ticket status
        ticket_id = order_data.get('linked_ticket_id')
        if ticket_id:
            ticket_ref = db.collection('tickets').document(ticket_id)
            ticket_doc = ticket_ref.get()
            if ticket_doc.exists and ticket_doc.to_dict().get('status') != 'refunded':
                ticket_ref.update({'status': 'refunded', 'refunded_at': int(time.time())})

                # Decrement tickets_sold atomically
                if event_doc.exists:
                    db.collection('events').document(event_id).update({
                        'tickets_sold': firestore.Increment(-1)
                    })

        # Notify the ticket holder
        ticket_holder_uid = order_data.get('user_id')
        if ticket_holder_uid:
            from app.blueprints.notifications.routes import create_notification
            event_title = event_doc.to_dict().get('title', 'Event') if event_doc.exists else 'Event'
            create_notification(
                recipient_id=ticket_holder_uid,
                title='Refund Processed',
                message=f'Your payment for "{event_title}" has been refunded.',
                type='refund',
                related_event_id=event_id
            )

            # Send refund email
            from app.services.email_service import EmailService
            holder_doc = db.collection('users').document(ticket_holder_uid).get()
            if holder_doc.exists:
                EmailService.send_email(
                    to_email=holder_doc.to_dict().get('email'),
                    subject="Refund Processed - Huddle",
                    template_name="refund_processed",
                    context={
                        "user_name": holder_doc.to_dict().get('displayName') or 'User',
                        "event_name": event_title,
                        "amount": f"{order_data.get('currency', 'INR')} {order_data.get('amount', 0)}",
                        "payment_id": payment_id
                    }
                )

        return jsonify({'message': 'Refund processed successfully'}), 200

    except Exception as e:
        print(f"Refund Error: {e}")
        return jsonify({'error': str(e)}), 500


# ---------------------------------------------------------------------------
# Helper: send payment receipt email
# ---------------------------------------------------------------------------
def _send_payment_email(uid, order_data):
    """Fire-and-forget payment receipt email."""
    try:
        from app.services.email_service import EmailService
        event_doc = db.collection('events').document(order_data['event_id']).get()
        user_doc = db.collection('users').document(uid).get()
        if event_doc.exists and user_doc.exists:
            EmailService.send_email(
                to_email=user_doc.to_dict().get('email'),
                subject="Payment Receipt - Huddle",
                template_name="payment_success",
                context={
                    "user_name": user_doc.to_dict().get('displayName') or 'User',
                    "event_name": event_doc.to_dict().get('title', 'Event'),
                    "amount": f"{order_data.get('currency', 'INR')} {order_data.get('amount', 0)}",
                    "transaction_id": order_data.get('payment_id', 'N/A')
                }
            )
    except Exception as e:
        print(f"Email sending failed (non-fatal): {e}")
