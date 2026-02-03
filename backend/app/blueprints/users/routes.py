from flask import request, jsonify, g
from firebase_admin import firestore
from google.cloud.firestore import FieldFilter
from app.middleware import login_required
from app.utils import format_doc
from . import users_bp
from datetime import datetime
from app.blueprints.notifications.routes import create_notification

db = firestore.client()
users_ref = db.collection('users')

@users_bp.route('/sync', methods=['POST'])
@login_required
def sync_user():
    """
    Syncs the authenticated user to Firestore.
    Creates the document if it doesn't existing, acts as a 'signup' or 'login' hook.
    """
    uid = g.user['uid']
    user_doc_ref = users_ref.document(uid)
    user_doc = user_doc_ref.get()

    data = request.get_json() or {}
    
    # Basic fields from auth token or request
    email = g.user.get('email')
    display_name = data.get('displayName') or g.user.get('name')
    
    # Define default structure
    user_data = {
        'uid': uid,
        'email': email,
        'displayName': display_name,
        'updatedAt': firestore.SERVER_TIMESTAMP
    }

    if not user_doc.exists:
        # New User
        user_data['createdAt'] = firestore.SERVER_TIMESTAMP
        user_data['role'] = 'attendee' # Default role
        user_data['isVerified'] = False # Host verification
        user_data['isVenueVerified'] = False # Venue verification
        user_data['city'] = data.get('city', '')
        user_data['hobbies'] = data.get('hobbies', [])
        user_doc_ref.set(user_data)
        # Manually format for response (SERVER_TIMESTAMP is not datetime yet, but let's just return what we have or re-fetch)
        # Re-fetching is safer for server_timestamp, but for now we return user_data essentially.
        return jsonify({'message': 'User created', 'user': format_doc(user_data)}), 201
    else:
        # Existing User - update basic info if provided, but don't overwrite role unless admin
        user_doc_ref.update(user_data)
        return jsonify({'message': 'User synced', 'user': format_doc(user_doc.to_dict())}), 200

@users_bp.route('/<uid>', methods=['GET'])
@login_required
def get_user(uid):
    # Optional: Check if requesting user is the same as uid or is admin
    # For MVP, assuming public profiles are okay? Or strict privacy?
    # Context says "Community-first", so likely public profiles.
    
    doc = users_ref.document(uid).get()
    if not doc.exists:
        return jsonify({'error': 'User not found'}), 404
        
    return jsonify(format_doc(doc.to_dict())), 200

@users_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    uid = g.user['uid']
    return get_user(uid)

@users_bp.route('/me', methods=['PUT'])
@login_required
def update_current_user():
    uid = g.user['uid']
    return update_user(uid)

@users_bp.route('/me/events/hosted', methods=['GET'])
@login_required
def get_hosted_events():
    uid = g.user['uid']
    # Query events where hostId == uid
    events_ref = db.collection('events')
    docs = events_ref.where(filter=FieldFilter('hostId', '==', uid)).stream()
    
    events = []
    for doc in docs:
        d = doc.to_dict()
        d['id'] = doc.id
        events.append(format_doc(d))
    return jsonify(events), 200

@users_bp.route('/me/events/joined', methods=['GET'])
@login_required
def get_joined_events():
    uid = g.user['uid']
    # Query events where participants array contains uid
    events_ref = db.collection('events')
    docs = events_ref.where(filter=FieldFilter('participants', 'array_contains', uid)).stream()
    
    events = []
    for doc in docs:
        d = doc.to_dict()
        d['id'] = doc.id
        events.append(format_doc(d))
    return jsonify(events), 200

@users_bp.route('/<uid>', methods=['PUT'])
@login_required
def update_user(uid):
    if g.user['uid'] != uid:
        return jsonify({'error': 'Permission denied'}), 403
    
    data = request.get_json()
    # Allowed fields: displayName, city, hobbies, bio, avatarUrl
    allowed_fields = ['displayName', 'city', 'hobbies', 'bio', 'avatarUrl']
    
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data['updatedAt'] = firestore.SERVER_TIMESTAMP
    
    # Use set with merge=True to ensure document exists if it was somehow missed
    users_ref.document(uid).set(update_data, merge=True)
    
    return jsonify({'message': 'Profile updated', 'updates': format_doc(update_data)}), 200

@users_bp.route('/me/subscribe', methods=['POST'])
@login_required
def subscribe_user():
    uid = g.user['uid']
    data = request.get_json()
    plan_type = data.get('type', 'host') # 'host' or 'venue'
    plan_name = data.get('plan', 'basic') 
    
    update_data = {
        'updatedAt': firestore.SERVER_TIMESTAMP
    }
    
    if plan_type == 'venue':
        update_data['venue_plan'] = plan_name
    else:
        update_data['host_plan'] = plan_name
        
    users_ref.document(uid).set(update_data, merge=True)
    
    return jsonify({'message': f'{plan_type.capitalize()} plan updated', 'plan': plan_name, 'type': plan_type}), 200

@users_bp.route('/me/verify_request', methods=['POST'])
@login_required
def request_verification():
    uid = g.user['uid']
    data = request.get_json()
    doc_url = data.get('documentUrl')
    ver_type = data.get('type', 'host') # 'host' or 'venue'
    
    if not doc_url:
        return jsonify({'error': 'Document URL required'}), 400
        
    update_data = {
        'updatedAt': firestore.SERVER_TIMESTAMP
    }

    if ver_type == 'venue':
        update_data['venueVerificationStatus'] = 'pending'
        update_data['venueVerificationDocument'] = doc_url
    else:
        update_data['verificationStatus'] = 'pending'
        update_data['verificationDocument'] = doc_url

    users_ref.document(uid).set(update_data, merge=True)
    
    return jsonify({'message': f'{ver_type.capitalize()} verification requested'}), 200

@users_bp.route('/<uid>/approve', methods=['POST'])
@login_required
def approve_host(uid):
    # Check Admin Role
    requester_uid = g.user['uid']
    requester_doc = users_ref.document(requester_uid).get()
    if not requester_doc.exists or requester_doc.to_dict().get('role') != 'admin':
        return jsonify({'error': 'Unauthorized: Admin access required'}), 403

    data = request.get_json() or {}
    ver_type = data.get('type', 'host')

    update_data = {
        'updatedAt': firestore.SERVER_TIMESTAMP
    }

    if ver_type == 'venue':
        update_data['isVenueVerified'] = True
        update_data['venueVerificationStatus'] = 'approved'
        notification_msg = 'Your request to verify as a venue owner has been approved.'
    else:
        update_data['isVerified'] = True
        update_data['verificationStatus'] = 'approved'
        notification_msg = 'Your account has been verified as a host.'

    users_ref.document(uid).set(update_data, merge=True)
    
    create_notification(uid, 'Verification Approved', notification_msg, 'system')
    return jsonify({'message': f'User {ver_type} verification approved'}), 200

@users_bp.route('/<uid>/reject', methods=['POST'])
@login_required
def reject_host(uid):
    # Check Admin Role
    requester_uid = g.user['uid']
    requester_doc = users_ref.document(requester_uid).get()
    if not requester_doc.exists or requester_doc.to_dict().get('role') != 'admin':
        return jsonify({'error': 'Unauthorized: Admin access required'}), 403

    data = request.get_json() or {}
    ver_type = data.get('type', 'host')

    update_data = {
        'updatedAt': firestore.SERVER_TIMESTAMP
    }

    if ver_type == 'venue':
        update_data['isVenueVerified'] = False
        update_data['venueVerificationStatus'] = 'rejected'
        notification_msg = 'Your request to verify as a venue owner has been rejected. Please update your documents and try again.'
    else:
        update_data['isVerified'] = False
        update_data['verificationStatus'] = 'rejected'
        notification_msg = 'Your request to become a host has been rejected. Please update your documents and try again.'

    users_ref.document(uid).set(update_data, merge=True)
    
    create_notification(uid, 'Verification Rejected', notification_msg, 'system')
    return jsonify({'message': f'User {ver_type} verification rejected'}), 200

@users_bp.route('/pending', methods=['GET'])
@login_required
def get_pending_users():
    # Check Admin Role
    requester_uid = g.user['uid']
    requester_doc = users_ref.document(requester_uid).get()
    if not requester_doc.exists or requester_doc.to_dict().get('role') != 'admin':
        return jsonify({'error': 'Unauthorized: Admin access required'}), 403

    docs = users_ref.where(filter=FieldFilter('verificationStatus', '==', 'pending')).stream()
    users = []
    for doc in docs:
        d = doc.to_dict()
        d['uid'] = doc.id
        users.append(format_doc(d))
    return jsonify(users), 200

@users_bp.route('/pending_venues', methods=['GET'])
@login_required
def get_pending_venues():
    # Check Admin Role
    requester_uid = g.user['uid']
    requester_doc = users_ref.document(requester_uid).get()
    if not requester_doc.exists or requester_doc.to_dict().get('role') != 'admin':
        return jsonify({'error': 'Unauthorized: Admin access required'}), 403

    docs = users_ref.where(filter=FieldFilter('venueVerificationStatus', '==', 'pending')).stream()
    users = []
    for doc in docs:
        d = doc.to_dict()
        d['uid'] = doc.id
        users.append(format_doc(d))
    return jsonify(users), 200

@users_bp.route('/approved', methods=['GET'])
@login_required
def get_approved_users():
    # Check Admin Role
    requester_uid = g.user['uid']
    requester_doc = users_ref.document(requester_uid).get()
    if not requester_doc.exists or requester_doc.to_dict().get('role') != 'admin':
        return jsonify({'error': 'Unauthorized: Admin access required'}), 403

    docs = users_ref.where(filter=FieldFilter('verificationStatus', '==', 'approved')).stream()
    users = []
    for doc in docs:
        d = doc.to_dict()
        d['uid'] = doc.id
        users.append(format_doc(d))
    
    # Also fetch approved venues? Maybe separates lists is better, or merge.
    # For now, let's keep approved list as just 'verified hosts' to avoid UI clutter, or we need a new approved tab.
    return jsonify(users), 200

@users_bp.route('/approved_venues', methods=['GET'])
@login_required
def get_approved_venues():
    # Check Admin Role
    requester_uid = g.user['uid']
    requester_doc = users_ref.document(requester_uid).get()
    if not requester_doc.exists or requester_doc.to_dict().get('role') != 'admin':
        return jsonify({'error': 'Unauthorized: Admin access required'}), 403

    docs = users_ref.where(filter=FieldFilter('venueVerificationStatus', '==', 'approved')).stream()
    users = []
    for doc in docs:
        d = doc.to_dict()
        d['uid'] = doc.id
        users.append(format_doc(d))
    return jsonify(users), 200

@users_bp.route('/rejected', methods=['GET'])
@login_required
def get_rejected_users():
    # Check Admin Role
    requester_uid = g.user['uid']
    requester_doc = users_ref.document(requester_uid).get()
    if not requester_doc.exists or requester_doc.to_dict().get('role') != 'admin':
        return jsonify({'error': 'Unauthorized: Admin access required'}), 403

    docs = users_ref.where(filter=FieldFilter('verificationStatus', '==', 'rejected')).stream()
    users = []
    for doc in docs:
        d = doc.to_dict()
        d['uid'] = doc.id
        users.append(format_doc(d))
    return jsonify(users), 200

@users_bp.route('/rejected_venues', methods=['GET'])
@login_required
def get_rejected_venues():
    # Check Admin Role
    requester_uid = g.user['uid']
    requester_doc = users_ref.document(requester_uid).get()
    if not requester_doc.exists or requester_doc.to_dict().get('role') != 'admin':
        return jsonify({'error': 'Unauthorized: Admin access required'}), 403

    docs = users_ref.where(filter=FieldFilter('venueVerificationStatus', '==', 'rejected')).stream()
    users = []
    for doc in docs:
        d = doc.to_dict()
        d['uid'] = doc.id
        users.append(format_doc(d))
    return jsonify(users), 200

@users_bp.route('/me/wishlist', methods=['GET'])
@login_required
def get_wishlist():
    uid = g.user['uid']
    docs = users_ref.document(uid).collection('wishlist').stream()
    wishlist = []
    for doc in docs:
        d = doc.to_dict()
        d['id'] = doc.id
        wishlist.append(format_doc(d))
    return jsonify(wishlist), 200

@users_bp.route('/me/wishlist', methods=['POST'])
@login_required
def add_wishlist_item():
    uid = g.user['uid']
    data = request.get_json()
    
    # Expected: type ('host' or 'place'), targetId, name, etc.
    if not data.get('targetId') or not data.get('type'):
        return jsonify({'error': 'Missing targetId or type'}), 400
        
    wi = {
        'type': data.get('type'), # 'host' or 'place'
        'targetId': data.get('targetId'),
        'name': data.get('name'),
        'details': data.get('details', {}), # Any extra info
        'createdAt': firestore.SERVER_TIMESTAMP
    }
    
    # Check if exists? Or just add.
    # To prevent duplicates, we can query or use a deterministic ID (e.g., type_targetId)
    doc_id = f"{wi['type']}_{wi['targetId']}"
    users_ref.document(uid).collection('wishlist').document(doc_id).set(wi)
    
    return jsonify({'message': 'Added to wishlist'}), 201

@users_bp.route('/me/wishlist/<item_id>', methods=['DELETE'])
@login_required
def remove_wishlist_item(item_id):
    uid = g.user['uid']
    users_ref.document(uid).collection('wishlist').document(item_id).delete()
    return jsonify({'message': 'Removed from wishlist'}), 200
