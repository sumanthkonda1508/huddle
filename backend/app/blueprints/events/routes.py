from flask import request, jsonify, g
from firebase_admin import firestore
from app.middleware import login_required
from app.utils import format_doc
from . import events_bp
from datetime import datetime

db = firestore.client()
events_ref = db.collection('events')

@events_bp.route('', methods=['POST'])
@login_required
def create_event():
    # Only hosts can create? MVP says "Host can create an event".
    # User roles are in their profile. We should check it.
    uid = g.user['uid']
    user_doc = db.collection('users').document(uid).get()
    
    # Optional: Role check (enforce later or now? Let's be lenient for MVP or just check logic)
    # if user_doc.exists and user_doc.to_dict().get('role') != 'host':
    #     return jsonify({'error': 'Only hosts can create events'}), 403
    
    data = request.get_json()
    required = ['title', 'city', 'hobby', 'date', 'maxParticipants', 'venue']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing required fields'}), 400

    # Parse date (expect ISO string)
    try:
        # Simple ISO parse or let frontend send timestamp?
        # Let's assume frontend sends ISO8601 string.
        # Python 3.7+ fromisoformat handles some, but depends on format.
        # For simplicity, we store what we get or validate basic presence.
        pass 
    except ValueError:
        pass

    event_data = {
        'hostId': uid,
        'title': data['title'],
        'description': data.get('description', ''),
        'city': data['city'],
        'hobby': data['hobby'],
        'venue': data['venue'],
        'date': data['date'], # formatted string or timestamp
        'maxParticipants': int(data['maxParticipants']),
        'participants': [],
        'allowCancellation': data.get('allowCancellation', True),
        'createdAt': firestore.SERVER_TIMESTAMP
    }
    
    _, doc_ref = events_ref.add(event_data)
    # Add ID to the response
    event_data['id'] = doc_ref.id
    # Serialize timestamp if needed (Flask jsonify might struggle with server_timestamp sentinel)
    # But usually .add() returns a ref. We can just return the ID.
    
    return jsonify({'message': 'Event created', 'eventId': doc_ref.id}), 201

@events_bp.route('', methods=['GET'])
def list_events():
    city = request.args.get('city')
    hobby = request.args.get('hobby')
    q = request.args.get('q')
    
    query = events_ref
    # Removed strict Firestore filters to allow partial matching in Python
        
    # Order by date?
    # query = query.order_by('date')
    
    docs = query.stream()
    events = []
    for doc in docs:
        d = doc.to_dict()
        d['id'] = doc.id
        
        # Filter Logic (Case-insensitive partial match)
        
        # 1. City
        doc_city = str(d.get('city') or '').lower()
        if city and city.lower() not in doc_city:
            continue
            
        # 2. Hobby/Category
        doc_hobby = str(d.get('hobby') or '').lower()
        if hobby and hobby.lower() not in doc_hobby:
            continue
        
        # 3. General Search (q)
        if q:
            term = q.lower()
            # Safely concatenate fields, handling None
            title = str(d.get('title') or '')
            desc = str(d.get('description') or '')
            hobb = str(d.get('hobby') or '')
            
            searchable_text = (title + ' ' + desc + ' ' + hobb).lower()
            if term not in searchable_text:
                continue
        
        events.append(format_doc(d))
        
    return jsonify(events), 200

@events_bp.route('/<event_id>', methods=['GET'])
def get_event(event_id):
    doc = events_ref.document(event_id).get()
    if not doc.exists:
        return jsonify({'error': 'Event not found'}), 404
    data = doc.to_dict()
    data['id'] = doc.id
    return jsonify(format_doc(data)), 200

@firestore.transactional
def join_transaction(transaction, event_ref, uid):
    snapshot = event_ref.get(transaction=transaction)
    if not snapshot.exists:
        return {'error': 'Event not found', 'code': 404}
    
    data = snapshot.to_dict()
    participants = data.get('participants', [])
    max_p = data.get('maxParticipants', 0)
    
    if uid in participants:
        return {'error': 'Already joined', 'code': 400}
        
    if len(participants) >= max_p:
        return {'error': 'Event is full', 'code': 400}
    
    transaction.update(event_ref, {
        'participants': firestore.ArrayUnion([uid])
    })
    return {'message': 'Joined successfully', 'code': 200}

@events_bp.route('/<event_id>/join', methods=['POST'])
@login_required
def join_event(event_id):
    uid = g.user['uid']
    user_name = g.user.get('name', 'Someone')
    
    event_ref = events_ref.document(event_id)
    
    transaction = db.transaction()
    try:
        result = join_transaction(transaction, event_ref, uid)
        
        # Notify Host if successful
        if result.get('code') == 200:
            # We need event data to notify host. snapshot was read in transaction but not returned fully.
            # Ideally we refactor logic or just read again (read is cheap). 
            # Or make transaction return data.
            # Let's read outside transaction for notification (async/eventual consistency is fine for notifs)
            evt = event_ref.get().to_dict()
            if evt and evt.get('hostId') != uid:
                create_notification(
                    recipient_id=evt.get('hostId'),
                    title='New Attendee',
                    message=f"{user_name} joined {evt.get('title')}",
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
        # Get event first for notification details
        evt_doc = event_ref.get()
        if evt_doc.exists:
            evt = evt_doc.to_dict()
            
            event_ref.update({
                'participants': firestore.ArrayRemove([uid])
            })
            
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

# ... Update Event ...

# ... Delete Event ...

@events_bp.route('/<event_id>/comments', methods=['GET'])
def list_comments(event_id):
    # ... existing implementation ...
    comments_ref = events_ref.document(event_id).collection('comments')
    # Sort Oldest First (ASCENDING) so conversation reads naturally
    docs = comments_ref.order_by('createdAt', direction=firestore.Query.ASCENDING).stream()
    comments = []
    for doc in docs:
        d = doc.to_dict()
        d['id'] = doc.id
        comments.append(format_doc(d))
    return jsonify(comments), 200

@events_bp.route('/<event_id>/comments', methods=['POST'])
@login_required
def add_comment(event_id):
    uid = g.user['uid']
    user_name = g.user.get('name', 'Someone')
    data = request.get_json()
    text = data.get('text')
    
    if not text:
        return jsonify({'error': 'Comment text is required'}), 400
        
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
