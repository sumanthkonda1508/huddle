from flask import request, jsonify, g
from firebase_admin import firestore
from google.cloud.firestore import FieldFilter
from app.middleware import login_required, validate_request
from app.schemas import EventCreate, EventUpdate, CommentCreate
from app.utils import format_doc
from app import limiter
from . import events_bp
from datetime import datetime

db = firestore.client()
events_ref = db.collection('events')

@events_bp.route('', methods=['POST'])
@login_required
@validate_request(EventCreate)
def create_event():
    uid = g.user['uid']
    user_doc = db.collection('users').document(uid).get()
    
    data = g.validated_data

    event_data = {
        'hostId': uid,
        'title': data['title'],
        'description': data.get('description', ''),
        'city': data['city'],
        'address': data.get('address', ''),
        'coordinates': data.get('coordinates', None),
        'hobby': data['hobby'],
        'venue': data['venue'],
        'price': data.get('price', 0),
        'date': data['date'],
        'maxParticipants': data['maxParticipants'],
        'participants': [],
        'attendeeCount': 0,
        'eventType': data.get('eventType', 'solo'),
        'maxTicketsPerUser': data.get('maxTicketsPerUser') or (4 if data.get('eventType', 'solo') == 'solo' else 10),
        'allowCancellation': data.get('allowCancellation', True),
        'mediaUrls': data.get('mediaUrls', []),
        'is_paid': data.get('is_paid', False),
        'ticket_price': data.get('ticket_price', 0.0),
        'currency': data.get('currency', 'INR'),
        'max_tickets': data.get('max_tickets', data['maxParticipants']),
        'tickets_sold': 0,
        'createdAt': firestore.SERVER_TIMESTAMP
    }
    
    _, doc_ref = events_ref.add(event_data)
    # Add ID to the response
    event_data['id'] = doc_ref.id
    
    # Notify Wishlisters (Async/Background ideally, but inline for MVP)
    try:
        # ... existing notification logic ...
        # (omitted for brevity in replacement, but should preserve if not replacing whole block)
        # Actually I need to be careful not to delete logic.
        # Let's replace just the event_data construction block first.
        pass
    except: pass # Logic handled in next chunk or separate

    # Re-writing the notification logic to be safe since I consumed the lines
    try:
         # 1. Wishlisted Host
        host_wishlists = db.collection_group('wishlist').where(filter=FieldFilter('type', '==', 'host')).where(filter=FieldFilter('targetId', '==', uid)).stream()
        
        # 2. Wishlisted Venue
        venue_wishlists = db.collection_group('wishlist').where(filter=FieldFilter('type', '==', 'place')).where(filter=FieldFilter('targetId', '==', data['venue'])).stream()
        
        notified_users = set()
        
        def send_notif(w_doc, msg_type):
            recipient_id = w_doc.reference.parent.parent.id
            if recipient_id == uid: return
            if recipient_id in notified_users: return
            
            user_name = g.user.get('name', 'A Host')
            msg = ""
            if msg_type == 'host':
                msg = f"{user_name} hosted a new event: {data['title']}"
            else:
                msg = f"New event at {data['venue']}: {data['title']}"
                
            create_notification(
                recipient_id=recipient_id,
                title='Wishlist Update',
                message=msg,
                type='wishlist_alert',
                related_event_id=doc_ref.id
            )
            notified_users.add(recipient_id)

        for w in host_wishlists:
            send_notif(w, 'host')
            
        for w in venue_wishlists:
            send_notif(w, 'place')
    except Exception as e:
        print(f"Failed to send wishlist notifications: {e}")

    return jsonify({'message': 'Event created', 'eventId': doc_ref.id}), 201

# ... list_events ...

# ... get_event ...



@events_bp.route('', methods=['GET'])
def list_events():
    city = request.args.get('city')
    hobby = request.args.get('hobby')
    q = request.args.get('q')
    date_filter = request.args.get('date_filter')
    is_paid = request.args.get('is_paid')
    max_price = request.args.get('max_price')
    sort_by = request.args.get('sort_by', 'date')
    sort_dir = request.args.get('sort_dir', 'asc')
    
    limit = min(int(request.args.get('limit', 20)), 50)
    last_doc_id = request.args.get('last_doc_id')
    
    query = events_ref
    
    # 1. Equality Filters
    if city:
        query = query.where(filter=FieldFilter('city', '==', city))
    if hobby:
        query = query.where(filter=FieldFilter('hobby', '==', hobby))
        
    if is_paid is not None and is_paid != '':
        is_paid_bool = str(is_paid).lower() == 'true'
        query = query.where(filter=FieldFilter('is_paid', '==', is_paid_bool))

    # 2. Sorting
    direction = firestore.Query.ASCENDING if sort_dir == 'asc' else firestore.Query.DESCENDING
    if sort_by == 'price':
        query = query.order_by('ticket_price', direction=direction)
    elif sort_by == 'popularity':
        query = query.order_by('attendeeCount', direction=direction)
    else:
        # Default date
        query = query.order_by('date', direction=direction)
        
    # Order by document ID for stable cursor pagination
    from google.cloud.firestore_v1.field_path import FieldPath
    query = query.order_by(FieldPath.document_id(), direction=direction)

    if last_doc_id:
        last_doc = events_ref.document(last_doc_id).get()
        if last_doc.exists:
            query = query.start_after(last_doc)
            
    # Use generator to find matches
    docs = query.stream()
    
    from datetime import datetime
    now_iso = datetime.utcnow().isoformat()
    today_date = datetime.utcnow().date().isoformat()
    
    events = []
    
    for doc in docs:
        if len(events) >= limit + 1:
            break
            
        d = doc.to_dict()
        d['id'] = doc.id
        
        # Date Filter
        doc_date = d.get('date', '')
        if date_filter == 'upcoming':
            if doc_date < now_iso: continue
        elif date_filter == 'past':
            if doc_date >= now_iso: continue
        elif date_filter == 'today':
            if not doc_date.startswith(today_date): continue
        elif date_filter and len(date_filter) == 10:
            if not doc_date.startswith(date_filter): continue
            
        # Price Filter
        if max_price:
            try:
                if float(d.get('ticket_price', 0)) > float(max_price):
                    continue
            except: pass
            
        # General Search (q)
        if q:
            term = q.lower()
            title = str(d.get('title') or '')
            desc = str(d.get('description') or '')
            hobb = str(d.get('hobby') or '')
            
            searchable_text = (title + ' ' + desc + ' ' + hobb).lower()
            if term not in searchable_text:
                continue
        
        events.append(format_doc(d))
    
    has_more = len(events) > limit
    if has_more:
        events = events[:limit]
    
    last_id = events[-1]['id'] if events else None
        
    return jsonify({'data': events, 'hasMore': has_more, 'lastDocId': last_id}), 200

@events_bp.route('/<event_id>', methods=['GET'])
def get_event(event_id):
    doc = events_ref.document(event_id).get()
    if not doc.exists:
        return jsonify({'error': 'Event not found'}), 404
    data = doc.to_dict()
    data['id'] = doc.id
    
    # Fetch Host Details
    host_id = data.get('hostId')
    if host_id:
        host_doc = db.collection('users').document(host_id).get()
        if host_doc.exists:
            host_data = host_doc.to_dict()
            data['hostName'] = host_data.get('displayName', 'Unknown Host')
            data['hostPhoto'] = host_data.get('photoURL', None)
            
    return jsonify(format_doc(data)), 200

@firestore.transactional
def join_transaction(transaction, event_ref, uid, guests):
    snapshot = event_ref.get(transaction=transaction)
    if not snapshot.exists:
        return {'error': 'Event not found', 'code': 404}
    
    data = snapshot.to_dict()
    participants = data.get('participants', [])
    attendee_count = data.get('attendeeCount', len(participants)) # Fallback for old events
    max_p = data.get('maxParticipants', 0)
    event_type = data.get('eventType', 'solo')
    
    # Calculate spots needed
    spots_needed = 1 + len(guests)
    
    if uid in participants:
         return {'error': 'Already joined', 'code': 400}
         
    # NEW: Max Tickets Per User
    # Default to 4 (Solo legacy) or 10 (Group logic) if missing
    default_max = 4 if event_type == 'solo' else 10
    max_tickets_per_user = data.get('maxTicketsPerUser', default_max)

    if spots_needed > max_tickets_per_user:
        return {'error': f'This event allows a maximum of {max_tickets_per_user} tickets per booking', 'code': 400}
    
    # Group events: No specific booking limit, just capacity check

    if attendee_count + spots_needed > max_p:
        return {'error': 'Not enough spots available', 'code': 400}
    
    # Create Booking Doc in Subcollection
    booking_ref = event_ref.collection('bookings').document(uid)
    booking_data = {
        'userId': uid,
        'guestCount': len(guests),
        'guests': guests, # List of {name, info}
        'totalSpots': spots_needed,
        'createdAt': firestore.SERVER_TIMESTAMP
    }
    transaction.set(booking_ref, booking_data)

    # Update Event
    transaction.update(event_ref, {
        'participants': firestore.ArrayUnion([uid]),
        'attendeeCount': attendee_count + spots_needed
    })
    return {'message': 'Joined successfully', 'code': 200}

@events_bp.route('/<event_id>/join', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def join_event(event_id):
    uid = g.user['uid']
    user_name = g.user.get('name', 'Someone')
    data = request.get_json() or {}
    guests = data.get('guests', []) # Expect list of objects or strings? Let's say list of {name: "John"}
    
    if not isinstance(guests, list):
        return jsonify({'error': 'Invalid guests format'}), 400

    event_ref = events_ref.document(event_id)
    
    transaction = db.transaction()
    try:
        result = join_transaction(transaction, event_ref, uid, guests)
        
        # Generate Free Ticket Document if payment is missing
        if result.get('code') == 200:
            payment_id = data.get('payment_id')
            if not payment_id:
                import time
                import uuid
                ticket_id = f"tkt_free_{uuid.uuid4().hex}"
                db.collection('tickets').document(ticket_id).set({
                    'id': ticket_id,
                    'event_id': event_id,
                    'user_id': uid,
                    'payment_id': 'free',
                    'order_id': 'none',
                    'status': 'active',
                    'created_at': int(time.time()),
                    'is_mock': True
                })
        
        # Notify Host if successful
        if result.get('code') == 200:
            evt = event_ref.get().to_dict()
            if evt and evt.get('hostId') != uid:
                msg = f"{user_name} joined {evt.get('title')}"
                if guests:
                    msg += f" with {len(guests)} guests"
                    
                create_notification(
                    recipient_id=evt.get('hostId'),
                    title='New Attendee',
                    message=msg,
                    type='event_joined',
                    related_event_id=event_id
                )
                
        return jsonify(result), result.get('code', 200)
    except Exception as e:
        print(f"Transaction failed: {e}")
        return jsonify({'error': 'Transaction failed'}), 500

@events_bp.route('/<event_id>/leave', methods=['POST'])
@login_required
def leave_event(event_id):
    uid = g.user['uid']
    user_name = g.user.get('name', 'Someone')
    event_ref = events_ref.document(event_id)
    
    try:
        # Get booking first to know how many spots to free
        booking_ref = event_ref.collection('bookings').document(uid)
        booking_doc = booking_ref.get()
        spots_to_free = 1 # Default if no booking doc (legacy)
        
        if booking_doc.exists:
            spots_to_free = booking_doc.to_dict().get('totalSpots', 1)
            
        evt_doc = event_ref.get()
        if evt_doc.exists:
            evt = evt_doc.to_dict()
            
            # Atomic Decrement
            # We can use increment(-amount) but let's be careful with 0.
            # Ideally transaction, but straightforward update is okay for leave if not highly concurrent on same doc
            
            event_ref.update({
                'participants': firestore.ArrayRemove([uid]),
                'attendeeCount': firestore.Increment(-spots_to_free)
            })
            
            # Delete booking
            booking_ref.delete()
            
            if evt.get('hostId') != uid:
                create_notification(
                    recipient_id=evt.get('hostId'),
                    title='Attendee Left',
                    message=f"{user_name} left {evt.get('title')}",
                    type='event_left',
                    related_event_id=event_id
                )
            
            return jsonify({'message': 'Left event'}), 200
        else:
             return jsonify({'error': 'Event not found'}), 404
             
    except Exception as e:
        return jsonify({'error': f'Failed to leave: {str(e)}'}), 500

@events_bp.route('/<event_id>', methods=['PUT'])
@login_required
@validate_request(EventUpdate, exclude_unset=True)
def update_event(event_id):
    uid = g.user['uid']
    event_ref = events_ref.document(event_id)
    doc = event_ref.get()
    
    if not doc.exists:
        return jsonify({'error': 'Event not found'}), 404
        
    data = doc.to_dict()
    if data.get('hostId') != uid:
        return jsonify({'error': 'Unauthorized. Only the host can edit this event.'}), 403
        
    update_data = g.validated_data
    update_data['updatedAt'] = firestore.SERVER_TIMESTAMP
    
    # Optional: Logic to handle maxParticipants reduction vs current attendees
    current_attendees = data.get('attendeeCount', 0)
    if 'maxParticipants' in update_data:
        new_max = int(update_data['maxParticipants'])
        if new_max < current_attendees:
            return jsonify({'error': f'Cannot reduce max participants below current attendee count ({current_attendees})'}), 400
            
    event_ref.update(update_data)
    
    return jsonify({'message': 'Event updated successfully'}), 200

@events_bp.route('/<event_id>', methods=['DELETE'])
@login_required
def delete_event(event_id):
    uid = g.user['uid']
    event_ref = events_ref.document(event_id)
    doc = event_ref.get()
    
    if not doc.exists:
        return jsonify({'error': 'Event not found'}), 404
        
    data = doc.to_dict()
    if data.get('hostId') != uid:
        return jsonify({'error': 'Unauthorized. Only the host can delete this event.'}), 403

    # Auto-refund active tickets for paid events
    if data.get('is_paid'):
        try:
            active_tickets = db.collection('tickets')\
                .where('event_id', '==', event_id)\
                .where('status', '==', 'active')\
                .stream()
            
            import time as _time
            from app.services.email_service import EmailService

            for ticket_doc in active_tickets:
                td = ticket_doc.to_dict()
                ticket_holder = td.get('user_id')

                # Mark ticket as refunded
                ticket_doc.reference.update({
                    'status': 'refunded',
                    'refunded_at': int(_time.time()),
                    'refund_reason': 'event_cancelled'
                })

                # Mark payment order as refunded if exists
                order_id = td.get('order_id')
                if order_id and order_id not in ('none', ''):
                    order_ref = db.collection('payment_orders').document(order_id)
                    order_doc_snap = order_ref.get()
                    if order_doc_snap.exists and order_doc_snap.to_dict().get('status') == 'paid':
                        order_ref.update({
                            'status': 'refunded',
                            'refunded_at': int(_time.time()),
                            'refund_reason': 'event_cancelled'
                        })

                # Notify ticket holder
                if ticket_holder:
                    create_notification(
                        recipient_id=ticket_holder,
                        title='Event Cancelled — Refund Issued',
                        message=f'"{data.get("title")}" has been cancelled. Your ticket has been refunded.',
                        type='refund',
                        related_event_id=event_id
                    )

                    # Send refund email
                    holder_doc = db.collection('users').document(ticket_holder).get()
                    if holder_doc.exists:
                        order_data = {}
                        if order_id and order_id not in ('none', ''):
                            od = db.collection('payment_orders').document(order_id).get()
                            if od.exists:
                                order_data = od.to_dict()

                        EmailService.send_email(
                            to_email=holder_doc.to_dict().get('email'),
                            subject="Event Cancelled — Refund Processed",
                            template_name="refund_processed",
                            context={
                                "user_name": holder_doc.to_dict().get('displayName') or 'User',
                                "event_name": data.get('title', 'Event'),
                                "amount": f"{order_data.get('currency', 'INR')} {order_data.get('amount', 0)}",
                                "payment_id": td.get('payment_id', 'N/A')
                            }
                        )
        except Exception as e:
            print(f"Auto-refund error during event cancellation: {e}")
            # Continue with deletion even if refund notifications fail

    event_ref.delete()
    
    return jsonify({'message': 'Event deleted successfully'}), 200

@events_bp.route('/<event_id>/comments', methods=['GET'])
def list_comments(event_id):
    limit = min(int(request.args.get('limit', 20)), 50)
    last_doc_id = request.args.get('last_doc_id')
    
    event_ref = events_ref.document(event_id)
    if not event_ref.get().exists:
        return jsonify({'error': 'Event not found'}), 404
        
    comments_ref = event_ref.collection('comments')
    # Sort Oldest First (ASCENDING) so conversation reads naturally
    query = comments_ref.order_by('createdAt', direction=firestore.Query.ASCENDING)
    
    if last_doc_id:
        last_doc = comments_ref.document(last_doc_id).get()
        if last_doc.exists:
            query = query.start_after(last_doc)
            
    docs = query.limit(limit + 1).stream()
    comments = []
    for doc in docs:
        d = doc.to_dict()
        d['id'] = doc.id
        comments.append(format_doc(d))
        
    has_more = len(comments) > limit
    if has_more:
        comments = comments[:limit]
        
    last_id = comments[-1]['id'] if comments else None
        
    return jsonify({'data': comments, 'hasMore': has_more, 'lastDocId': last_id}), 200

@events_bp.route('/<event_id>/comments', methods=['POST'])
@login_required
@validate_request(CommentCreate)
@limiter.limit("20 per minute")
def add_comment(event_id):
    uid = g.user['uid']
    user_name = g.user.get('name', 'Someone')
    data = g.validated_data
    text = data['text']
        
    user_doc = db.collection('users').document(uid).get()
    display_name = 'Unknown User'
    photo_url = None
    if user_doc.exists:
        ud = user_doc.to_dict()
        display_name = ud.get('displayName') or 'User'
        photo_url = ud.get('photoURL')
        # Update user_name for notification
        user_name = display_name

    comment_data = {
        'userId': uid,
        'displayName': display_name,
        'photoURL': photo_url,
        'text': text,
        'createdAt': firestore.SERVER_TIMESTAMP
    }
    
    comments_ref = events_ref.document(event_id).collection('comments')
    _, doc_ref = comments_ref.add(comment_data)
    
    # Notify Host
    event_doc = events_ref.document(event_id).get()
    if event_doc.exists:
        evt = event_doc.to_dict()
        if evt.get('hostId') != uid: # Don't notify self
             create_notification(
                recipient_id=evt.get('hostId'),
                title='New Comment',
                message=f"{user_name} commented on {evt.get('title')}",
                type='new_comment',
                related_event_id=event_id
            )
    
    return jsonify({'message': 'Comment added', 'commentId': doc_ref.id}), 201

@events_bp.route('/<event_id>/comments/<comment_id>', methods=['DELETE'])
@login_required
def delete_comment(event_id, comment_id):
    uid = g.user['uid']
    
    event_doc = events_ref.document(event_id).get()
    if not event_doc.exists:
        return jsonify({'error': 'Event not found'}), 404
    event_data = event_doc.to_dict()
    
    comment_ref = events_ref.document(event_id).collection('comments').document(comment_id)
    comment_doc = comment_ref.get()
    
    if not comment_doc.exists:
        return jsonify({'error': 'Comment not found'}), 404
        
    comment_data = comment_doc.to_dict()
    
    # Authorization: Allow if current user is the Event Host OR the Comment Author
    is_host = event_data.get('hostId') == uid
    is_author = comment_data.get('userId') == uid
    
    if not (is_host or is_author):
        return jsonify({'error': 'Unauthorized'}), 403
        
    comment_ref.delete()
    return jsonify({'message': 'Comment deleted'}), 200

# Import create_notification here to avoid circular imports at top level if init causes issues, 
# or just import from the module.
from app.blueprints.notifications.routes import create_notification

@events_bp.route('/<event_id>/participants', methods=['GET'])
def list_participants(event_id):
    event_doc = events_ref.document(event_id).get()
    if not event_doc.exists:
        return jsonify({'error': 'Event not found'}), 404
    
    data = event_doc.to_dict()
    participant_uids = data.get('participants', [])
    
    if not participant_uids:
        return jsonify([]), 200
        
    # Fetch user details
    # Firestore 'in' query supports max 10, but this is array of IDs.
    # Better to do a GetAll if possible, or loop if small.
    # For MVP, loop is fine, or db.get_all(refs).
    
    users_ref = db.collection('users')
    # Create refs
    # refs = [users_ref.document(uid) for uid in participant_uids] 
    # docs = db.get_all(refs) # Not always available in standard python admin sdk easily without looking up syntax
    
    # Simple loop for now (optimize later for scale)
    participants = []
    for uid in participant_uids:
        udoc = users_ref.document(uid).get()
        if udoc.exists:
            udata = udoc.to_dict()
            participants.append({
                'uid': uid,
                'displayName': udata.get('displayName') or 'User',
                'photoURL': udata.get('photoURL')
            })
            
    return jsonify(participants), 200

@events_bp.route('/<event_id>/participants/<user_id>', methods=['DELETE'])
@login_required
def remove_participant(event_id, user_id):
    # Kick a user (Host only)
    uid = g.user['uid']
    
    event_ref = events_ref.document(event_id)
    doc = event_ref.get()
    
    if not doc.exists:
        return jsonify({'error': 'Event not found'}), 404
        
    data = doc.to_dict()
    if data.get('hostId') != uid:
        return jsonify({'error': 'Only the host can remove participants'}), 403
        
    event_ref.update({
        'participants': firestore.ArrayRemove([user_id])
    })
    
    # Notify the removed user? (Maybe later)
    
    return jsonify({'message': 'Participant removed'}), 200
