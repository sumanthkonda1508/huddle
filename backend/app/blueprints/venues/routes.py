from flask import request, jsonify, g
from firebase_admin import firestore
from google.cloud.firestore import FieldFilter
from . import venues_bp
from app.middleware import login_required, validate_request
from app.schemas import VenueCreate, VenueUpdate, BookingRequest
from app import limiter
import uuid
import datetime

db = firestore.client()

@venues_bp.route('', methods=['POST'])
@login_required
@validate_request(VenueCreate)
def create_venue():
    try:
        data = g.validated_data
        uid = g.user['uid']
        
        # Check User Plan limits
        user_doc = db.collection('users').document(uid).get()
        user_data = user_doc.to_dict() if user_doc.exists else {}
        plan = user_data.get('venue_plan', 'basic')
        
        # Count existing venues
        venues_ref = db.collection('venues')
        existing_count = 0
        docs = venues_ref.where(filter=FieldFilter('owner_id', '==', uid)).stream()
        for _ in docs:
            existing_count += 1
            
        if plan == 'basic' and existing_count >= 1:
            return jsonify({"error": "Basic plan limit reached. precise_error: LIMIT_REACHED"}), 403

        venue_id = str(uuid.uuid4())
        venue_data = {
            'id': venue_id,
            'name': data['name'],
            'location': data['location'],
            'city': data['city'],
            'capacity': data['capacity'],
            'price_per_hour': data.get('price_per_hour', 0),
            'description': data.get('description', ''),
            'images': data.get('images', []),
            'owner_id': uid,
            'amenities': data.get('amenities', []),
            'catering': data.get('catering', 'none'),
            'contact_email': data['contact_email'],
            'contact_phone': data['contact_phone'],
            'website': data.get('website', ''),
            'created_at': datetime.datetime.utcnow().isoformat()
        }

        db.collection('venues').document(venue_id).set(venue_data)
        
        return jsonify(venue_data), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@venues_bp.route('', methods=['GET'])
def get_venues():
    try:
        city = request.args.get('city')
        min_capacity = request.args.get('min_capacity')
        min_price = request.args.get('min_price')
        max_price = request.args.get('max_price')
        q = request.args.get('q')
        sort_by = request.args.get('sort_by', 'created_at')
        sort_dir = request.args.get('sort_dir', 'desc')
        
        limit = min(int(request.args.get('limit', 20)), 50)
        last_doc_id = request.args.get('last_doc_id')
        
        venues_ref = db.collection('venues')
        query = venues_ref
        
        # 1. Equality Filters
        if city:
            query = query.where(filter=FieldFilter('city', '==', city))
            
        # 2. Sorting
        direction = firestore.Query.ASCENDING if sort_dir == 'asc' else firestore.Query.DESCENDING
        if sort_by == 'price':
            query = query.order_by('price_per_hour', direction=direction)
        elif sort_by == 'capacity':
            query = query.order_by('capacity', direction=direction)
        else:
            query = query.order_by('created_at', direction=direction)
            
        # Tie breaker
        from google.cloud.firestore_v1.field_path import FieldPath
        query = query.order_by(FieldPath.document_id(), direction=direction)
        
        if last_doc_id:
            last_doc = venues_ref.document(last_doc_id).get()
            if last_doc.exists:
                query = query.start_after(last_doc)
        
        # Stream without limit in DB so we can filter in Python
        docs = query.stream()
        venues = []
        
        for doc in docs:
            if len(venues) >= limit + 1:
                break
                
            d = doc.to_dict()
            
            # Python-side filtering
            if min_capacity:
                try:
                    if int(d.get('capacity', 0)) < int(min_capacity):
                        continue
                except: pass
                
            if min_price:
                try:
                    if float(d.get('price_per_hour', 0)) < float(min_price):
                        continue
                except: pass
                
            if max_price:
                try:
                    if float(d.get('price_per_hour', 0)) > float(max_price):
                        continue
                except: pass
                
            # Text Search
            if q:
                term = q.lower()
                name = str(d.get('name') or '')
                loc = str(d.get('location') or '')
                searchable = (name + ' ' + loc).lower()
                if term not in searchable:
                    continue
            
            venues.append(d)
        
        has_more = len(venues) > limit
        if has_more:
            venues = venues[:limit]
        
        last_id = venues[-1]['id'] if venues else None
        
        return jsonify({'data': venues, 'hasMore': has_more, 'lastDocId': last_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@venues_bp.route('/my', methods=['GET'])
@login_required
def get_my_venues():
    try:
        uid = g.user['uid']
        venues_ref = db.collection('venues')
        docs = venues_ref.where(filter=FieldFilter('owner_id', '==', uid)).stream()
        venues = []
        for doc in docs:
            venues.append(doc.to_dict())
        return jsonify(venues), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@venues_bp.route('/<venue_id>', methods=['GET'])
def get_venue_details(venue_id):
    try:
        doc = db.collection('venues').document(venue_id).get()
        if not doc.exists:
            return jsonify({"error": "Venue not found"}), 404
        return jsonify(doc.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@venues_bp.route('/<venue_id>/book', methods=['POST'])
@login_required
@validate_request(BookingRequest)
@limiter.limit("5 per minute")
def book_venue(venue_id):
    try:
        # Check if venue exists and owner
        venue_doc = db.collection('venues').document(venue_id).get()
        if not venue_doc.exists:
            return jsonify({"error": "Venue not found"}), 404
            
        venue_data = venue_doc.to_dict()
        if venue_data.get('owner_id') == g.user['uid']:
             return jsonify({"error": "You cannot book your own venue"}), 400

        data = g.validated_data
        
        request_id = str(uuid.uuid4())
        booking_data = {
            'id': request_id,
            'venue_id': venue_id,
            'event_name': data['event_name'],
            'date': data['date'],
            'start_time': data['start_time'],
            'end_time': data['end_time'],
            'requester_id': data.get('user_id') or g.user['uid'],
            'requester_email': data.get('user_email') or g.user.get('email'),
            'status': 'pending',
            'created_at': datetime.datetime.utcnow().isoformat()
        }
        
        db.collection('venue_requests').document(request_id).set(booking_data)
        
        return jsonify(booking_data), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@venues_bp.route('/<venue_id>', methods=['PUT'])
@login_required
@validate_request(VenueUpdate, exclude_unset=True)
def update_venue(venue_id):
    try:
        uid = g.user['uid']
        venue_ref = db.collection('venues').document(venue_id)
        venue_doc = venue_ref.get()
        
        if not venue_doc.exists:
            return jsonify({"error": "Venue not found"}), 404
            
        if venue_doc.to_dict().get('owner_id') != uid:
             return jsonify({"error": "Unauthorized"}), 403

        update_data = g.validated_data

        venue_ref.update(update_data)
        
        return jsonify({"message": "Venue updated", "id": venue_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@venues_bp.route('/<venue_id>', methods=['DELETE'])
@login_required
def delete_venue(venue_id):
    try:
        uid = g.user['uid']
        venue_ref = db.collection('venues').document(venue_id)
        venue_doc = venue_ref.get()
        
        if not venue_doc.exists:
            return jsonify({"error": "Venue not found"}), 404
            
        if venue_doc.to_dict().get('owner_id') != uid:
             return jsonify({"error": "Unauthorized"}), 403

        venue_ref.delete()
        return jsonify({"message": "Venue deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# Booking State Machine
# ---------------------------------------------------------------------------
VALID_TRANSITIONS = {
    'pending':         ['approved', 'rejected', 'cancelled'],
    'approved':        ['payment_pending', 'cancelled'],
    'payment_pending': ['confirmed', 'cancelled'],
    'confirmed':       ['completed', 'cancelled'],
    # Terminal states — no outgoing transitions
    'rejected':        [],
    'cancelled':       [],
    'completed':       [],
}

def _add_transition_history(req_ref, from_status, to_status, actor_uid, reason=''):
    """Append an audit entry to the booking's status_history subcollection."""
    req_ref.collection('status_history').add({
        'from': from_status,
        'to': to_status,
        'actor': actor_uid,
        'reason': reason,
        'timestamp': datetime.datetime.utcnow().isoformat()
    })


def _check_time_overlap(venue_id, date, start_time, end_time, exclude_request_id=None):
    """
    Returns True if there is an overlapping approved/confirmed booking
    for the given venue, date, and time range.
    """
    existing = db.collection('venue_requests')\
        .where('venue_id', '==', venue_id)\
        .where('date', '==', date)\
        .stream()

    for doc in existing:
        d = doc.to_dict()
        if d.get('id') == exclude_request_id:
            continue
        if d.get('status') not in ('approved', 'confirmed', 'payment_pending'):
            continue

        ex_start = d.get('start_time', '')
        ex_end = d.get('end_time', '')

        # Overlap: new_start < existing_end AND new_end > existing_start
        if start_time < ex_end and end_time > ex_start:
            return True, d

    return False, None


# ---------------------------------------------------------------------------
# POST /api/venues/requests/<id>/approve  (owner only, with conflict check)
# ---------------------------------------------------------------------------
@venues_bp.route('/requests/<request_id>/approve', methods=['POST'])
@login_required
def approve_booking(request_id):
    try:
        uid = g.user['uid']
        req_ref = db.collection('venue_requests').document(request_id)
        req_doc = req_ref.get()
        if not req_doc.exists:
            return jsonify({'error': 'Request not found'}), 404
            
        req_data = req_doc.to_dict()
        current_status = req_data.get('status', 'pending')

        # Validate transition
        if 'approved' not in VALID_TRANSITIONS.get(current_status, []):
            return jsonify({'error': f'Cannot approve a booking in "{current_status}" state'}), 400
        
        venue_ref = db.collection('venues').document(req_data['venue_id'])
        venue_doc = venue_ref.get()
        if not venue_doc.exists:
            return jsonify({'error': 'Venue not found'}), 404
        if venue_doc.to_dict().get('owner_id') != uid:
             return jsonify({'error': 'Unauthorized'}), 403

        # Conflict detection — check for overlapping bookings
        has_conflict, conflicting = _check_time_overlap(
            req_data['venue_id'],
            req_data.get('date'),
            req_data.get('start_time'),
            req_data.get('end_time'),
            exclude_request_id=request_id
        )
        if has_conflict:
            return jsonify({
                'error': 'Time conflict: another booking exists for this slot',
                'conflict': {
                    'event_name': conflicting.get('event_name'),
                    'start_time': conflicting.get('start_time'),
                    'end_time': conflicting.get('end_time'),
                    'status': conflicting.get('status')
                }
            }), 409

        # Calculate booking duration and total price
        fmt = '%H:%M'
        start_dt = datetime.datetime.strptime(req_data.get('start_time'), fmt)
        end_dt = datetime.datetime.strptime(req_data.get('end_time'), fmt)
        if end_dt <= start_dt:
            end_dt += datetime.timedelta(days=1)
        
        duration_hours = (end_dt - start_dt).total_seconds() / 3600.0
        price_per_hour = venue_doc.to_dict().get('price_per_hour', 0)
        total_price = float(duration_hours * price_per_hour)
        
        new_status = 'payment_pending' if total_price > 0 else 'confirmed'

        req_ref.update({
            'status': new_status,
            'approved_at': datetime.datetime.utcnow().isoformat(),
            'approved_by': uid,
            'total_price': total_price,
            'duration_hours': duration_hours
        })

        _add_transition_history(req_ref, current_status, new_status, uid)
        
        # Notify requester
        from app.blueprints.notifications.routes import create_notification
        create_notification(
            recipient_id=req_data.get('requester_id'),
            title='Booking Approved',
            message=f'Your booking for "{venue_doc.to_dict().get("name")}" on {req_data.get("date")} has been approved!',
            type='booking_approved',
            related_event_id=None
        )

        # Email Dispatch
        from app.services.email_service import EmailService
        user_doc = db.collection('users').document(req_data['requester_id']).get()
        if user_doc.exists:
            EmailService.send_email(
                to_email=user_doc.to_dict().get('email'),
                subject="Venue Booking Approved",
                template_name="booking_approved",
                context={
                    "user_name": user_doc.to_dict().get('displayName') or 'User',
                    "venue_name": venue_doc.to_dict().get('name'),
                    "date": req_data.get('date'),
                    "start_time": req_data.get('start_time'),
                    "end_time": req_data.get('end_time')
                }
            )
            
        return jsonify({'message': f'Booking approved (status: {new_status})'}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# POST /api/venues/requests/<id>/create_order  (Razorpay prep)
# ---------------------------------------------------------------------------
@venues_bp.route('/requests/<request_id>/create_order', methods=['POST'])
@login_required
def create_order(request_id):
    try:
        uid = g.user['uid']
        req_ref = db.collection('venue_requests').document(request_id)
        req_doc = req_ref.get()
        
        if not req_doc.exists:
            return jsonify({'error': 'Booking request not found'}), 404
            
        req_data = req_doc.to_dict()
        
        if req_data.get('requester_id') != uid:
            return jsonify({'error': 'Unauthorized'}), 403
            
        if req_data.get('status') != 'payment_pending':
            return jsonify({'error': 'Booking is not pending payment'}), 400
            
        total_price = req_data.get('total_price', 0)
        if total_price <= 0:
            return jsonify({'error': 'Invalid price for payment'}), 400

        from app.blueprints.payments.routes import rzp_client, IS_MOCK
        amount_paise = int(total_price * 100)
        
        if IS_MOCK:
            order_id = f"mock_order_{uuid.uuid4().hex[:10]}"
            return jsonify({
                "order_id": order_id,
                "amount": amount_paise,
                "currency": "INR",
                "is_mock": True
            }), 200

        # Live Razorpay
        order_data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"receipt_v_{request_id}",
            "notes": {
                "booking_id": request_id,
                "venue_id": req_data.get('venue_id'),
                "user_id": uid
            }
        }
        
        order = rzp_client.order.create(data=order_data)
        return jsonify({
            "order_id": order['id'],
            "amount": order['amount'],
            "currency": order['currency'],
            "is_mock": False
        }), 200
        
    except Exception as e:
        print(f"Checkout Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# POST /api/venues/requests/<id>/verify_payment
# ---------------------------------------------------------------------------
@venues_bp.route('/requests/<request_id>/verify_payment', methods=['POST'])
@login_required
def verify_payment(request_id):
    try:
        uid = g.user['uid']
        data = request.json
        
        req_ref = db.collection('venue_requests').document(request_id)
        req_doc = req_ref.get()
        
        if not req_doc.exists:
            return jsonify({'error': 'Booking request not found'}), 404
            
        req_data = req_doc.to_dict()
        if req_data.get('requester_id') != uid:
            return jsonify({'error': 'Unauthorized'}), 403
            
        if req_data.get('status') != 'payment_pending':
            return jsonify({'error': 'Booking is not pending payment'}), 400
            
        from app.blueprints.payments.routes import rzp_client, IS_MOCK
        
        if not IS_MOCK:
            rzp_payment_id = data.get('razorpay_payment_id')
            rzp_order_id = data.get('razorpay_order_id')
            rzp_signature = data.get('razorpay_signature')
            
            if not all([rzp_payment_id, rzp_order_id, rzp_signature]):
                 return jsonify({"error": "Missing payment verification payload"}), 400
                 
            try:
                rzp_client.utility.verify_payment_signature({
                    'razorpay_order_id': rzp_order_id,
                    'razorpay_payment_id': rzp_payment_id,
                    'razorpay_signature': rzp_signature
                })
            except Exception as e:
                print(f"Signature Verification Failed: {e}")
                return jsonify({"error": "Payment signature verification failed"}), 400
        
        # Payment valid — transition to confirmed
        req_ref.update({
            'status': 'confirmed',
            'payment_verified_at': datetime.datetime.utcnow().isoformat(),
            'payment_id': data.get('razorpay_payment_id', f"mock_pay_{uuid.uuid4().hex[:10]}"),
            'order_id': data.get('razorpay_order_id', 'mock_order')
        })
        
        _add_transition_history(req_ref, 'payment_pending', 'confirmed', uid)
        
        # Notify Venue Owner
        venue_doc = db.collection('venues').document(req_data.get('venue_id')).get()
        from app.blueprints.notifications.routes import create_notification
        create_notification(
            recipient_id=venue_doc.to_dict().get('owner_id'),
            title='Booking Payment Received',
            message=f'Payment received for booking on {req_data.get("date")}. Status is now Confirmed.',
            type='booking_paid',
            related_event_id=None
        )
        
        # Email Dispatch (Receipt)
        from app.services.email_service import EmailService
        user_doc = db.collection('users').document(uid).get()
        if user_doc.exists:
            EmailService.send_email(
                to_email=user_doc.to_dict().get('email'),
                subject="Venue Booking Payment Receipt",
                template_name="payment_receipt",
                context={
                    "user_name": user_doc.to_dict().get('displayName') or 'User',
                    "event_title": f"Venue Booking: {venue_doc.to_dict().get('name')}",
                    "amount": req_data.get('total_price'),
                    "transaction_id": data.get('razorpay_payment_id', 'MOCK')
                }
            )

        return jsonify({'message': 'Payment successful, booking confirmed'}), 200
        
    except Exception as e:
        print(f"Verify Payment Error: {str(e)}")
        return jsonify({"error": str(e)}), 500
# ---------------------------------------------------------------------------
# POST /api/venues/requests/<id>/reject  (owner only, requires reason)
# ---------------------------------------------------------------------------
@venues_bp.route('/requests/<request_id>/reject', methods=['POST'])
@login_required
def reject_booking(request_id):
    try:
        uid = g.user['uid']
        data = request.get_json() or {}
        reason = data.get('reason', '').strip()

        if not reason:
            return jsonify({'error': 'A reason is required when rejecting a booking'}), 400

        req_ref = db.collection('venue_requests').document(request_id)
        req_doc = req_ref.get()
        if not req_doc.exists:
            return jsonify({'error': 'Request not found'}), 404
            
        req_data = req_doc.to_dict()
        current_status = req_data.get('status', 'pending')

        if 'rejected' not in VALID_TRANSITIONS.get(current_status, []):
            return jsonify({'error': f'Cannot reject a booking in "{current_status}" state'}), 400
        
        venue_ref = db.collection('venues').document(req_data['venue_id'])
        venue_doc = venue_ref.get()
        if not venue_doc.exists:
            return jsonify({'error': 'Venue not found'}), 404
        if venue_doc.to_dict().get('owner_id') != uid:
             return jsonify({'error': 'Unauthorized'}), 403
             
        req_ref.update({
            'status': 'rejected',
            'rejection_reason': reason,
            'rejected_at': datetime.datetime.utcnow().isoformat(),
            'rejected_by': uid
        })

        _add_transition_history(req_ref, current_status, 'rejected', uid, reason)

        # Notify requester
        from app.blueprints.notifications.routes import create_notification
        create_notification(
            recipient_id=req_data.get('requester_id'),
            title='Booking Rejected',
            message=f'Your booking for "{venue_doc.to_dict().get("name")}" was rejected. Reason: {reason}',
            type='booking_rejected',
            related_event_id=None
        )
        
        # Email
        from app.services.email_service import EmailService
        user_doc = db.collection('users').document(req_data['requester_id']).get()
        if user_doc.exists:
            EmailService.send_email(
                to_email=user_doc.to_dict().get('email'),
                subject="Venue Booking Rejected",
                template_name="booking_rejected",
                context={
                    "user_name": user_doc.to_dict().get('displayName') or 'User',
                    "venue_name": venue_doc.to_dict().get('name'),
                    "date": req_data.get('date'),
                    "reason": reason
                }
            )
            
        return jsonify({'message': 'Booking rejected'}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# POST /api/venues/requests/<id>/cancel  (requester only)
# ---------------------------------------------------------------------------
@venues_bp.route('/requests/<request_id>/cancel', methods=['POST'])
@login_required
def cancel_booking(request_id):
    try:
        uid = g.user['uid']
        req_ref = db.collection('venue_requests').document(request_id)
        req_doc = req_ref.get()
        if not req_doc.exists:
            return jsonify({'error': 'Request not found'}), 404

        req_data = req_doc.to_dict()

        # Only the requester can cancel
        if req_data.get('requester_id') != uid:
            return jsonify({'error': 'Only the booking requester can cancel'}), 403

        current_status = req_data.get('status', 'pending')
        if 'cancelled' not in VALID_TRANSITIONS.get(current_status, []):
            return jsonify({'error': f'Cannot cancel a booking in "{current_status}" state'}), 400

        req_ref.update({
            'status': 'cancelled',
            'cancelled_at': datetime.datetime.utcnow().isoformat(),
            'cancelled_by': uid
        })

        _add_transition_history(req_ref, current_status, 'cancelled', uid)

        # Notify venue owner
        from app.blueprints.notifications.routes import create_notification
        venue_doc = db.collection('venues').document(req_data['venue_id']).get()
        if venue_doc.exists:
            owner_id = venue_doc.to_dict().get('owner_id')
            create_notification(
                recipient_id=owner_id,
                title='Booking Cancelled',
                message=f'Booking for "{req_data.get("event_name")}" on {req_data.get("date")} was cancelled by the requester.',
                type='booking_cancelled',
                related_event_id=None
            )

        return jsonify({'message': 'Booking cancelled'}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# GET /api/venues/requests/incoming  (all bookings for the owner's venues)
# ---------------------------------------------------------------------------
@venues_bp.route('/requests/incoming', methods=['GET'])
@login_required
def get_incoming_bookings():
    try:
        uid = g.user['uid']
        status_filter = request.args.get('status')  # optional: pending, approved, etc.

        # First, get all venues owned by this user
        my_venues = db.collection('venues')\
            .where('owner_id', '==', uid)\
            .stream()

        venue_ids = []
        venue_map = {}
        for v in my_venues:
            vd = v.to_dict()
            venue_ids.append(vd['id'])
            venue_map[vd['id']] = vd.get('name', 'Unknown Venue')

        if not venue_ids:
            return jsonify({'data': []}), 200

        # Firestore 'in' queries support max 30 items
        results = []
        for i in range(0, len(venue_ids), 30):
            chunk = venue_ids[i:i+30]
            query = db.collection('venue_requests')\
                .where('venue_id', 'in', chunk)
            
            if status_filter:
                query = query.where('status', '==', status_filter)

            for doc in query.stream():
                d = doc.to_dict()
                d['venue_name'] = venue_map.get(d.get('venue_id'), 'Unknown')
                results.append(d)

        # Sort by created_at descending
        results.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        return jsonify({'data': results}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# GET /api/venues/requests/my  (user's own booking requests)
# ---------------------------------------------------------------------------
@venues_bp.route('/requests/my', methods=['GET'])
@login_required
def get_my_bookings():
    try:
        uid = g.user['uid']

        docs = db.collection('venue_requests')\
            .where('requester_id', '==', uid)\
            .stream()

        results = []
        for doc in docs:
            d = doc.to_dict()
            # Hydrate venue name
            venue_doc = db.collection('venues').document(d.get('venue_id', '')).get()
            if venue_doc.exists:
                d['venue_name'] = venue_doc.to_dict().get('name', 'Unknown')
                d['venue_location'] = venue_doc.to_dict().get('location', '')
            results.append(d)

        results.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        return jsonify({'data': results}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# GET /api/venues/<id>/bookings  (confirmed bookings for calendar view)
# ---------------------------------------------------------------------------
@venues_bp.route('/<venue_id>/bookings', methods=['GET'])
@login_required
def get_venue_bookings(venue_id):
    try:
        # Verify venue exists
        venue_doc = db.collection('venues').document(venue_id).get()
        if not venue_doc.exists:
            return jsonify({'error': 'Venue not found'}), 404

        # Only the venue owner can see all bookings
        uid = g.user['uid']
        if venue_doc.to_dict().get('owner_id') != uid:
            return jsonify({'error': 'Unauthorized'}), 403

        docs = db.collection('venue_requests')\
            .where('venue_id', '==', venue_id)\
            .stream()

        results = []
        for doc in docs:
            d = doc.to_dict()
            # Only include non-terminal active bookings for calendar
            if d.get('status') in ('pending', 'approved', 'payment_pending', 'confirmed'):
                results.append({
                    'id': d.get('id'),
                    'event_name': d.get('event_name'),
                    'date': d.get('date'),
                    'start_time': d.get('start_time'),
                    'end_time': d.get('end_time'),
                    'status': d.get('status')
                })

        results.sort(key=lambda x: (x.get('date', ''), x.get('start_time', '')))

        return jsonify({'data': results}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

