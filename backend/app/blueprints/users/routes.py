from flask import request, jsonify, g
from firebase_admin import firestore
from app.middleware import login_required
from app.utils import format_doc
from . import users_bp
from datetime import datetime

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
        user_data['role'] = 'participant' # Default role
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
    docs = events_ref.where('hostId', '==', uid).stream()
    
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
    docs = events_ref.where('participants', 'array_contains', uid).stream()
    
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
    plan = data.get('plan', 'basic') # basic or pro
    
    users_ref.document(uid).set({
        'plan': plan,
        'updatedAt': firestore.SERVER_TIMESTAMP
    }, merge=True)
    
    return jsonify({'message': 'Plan selected', 'plan': plan}), 200

@users_bp.route('/me/verify_request', methods=['POST'])
@login_required
def request_verification():
    uid = g.user['uid']
    data = request.get_json()
    doc_url = data.get('documentUrl')
    
    if not doc_url:
        return jsonify({'error': 'Document URL required'}), 400
        
    users_ref.document(uid).set({
        'verificationStatus': 'pending',
        'verificationDocument': doc_url,
        'updatedAt': firestore.SERVER_TIMESTAMP
    }, merge=True)
    
    return jsonify({'message': 'Verification requested'}), 200

@users_bp.route('/<uid>/approve', methods=['POST'])
@login_required
def approve_host(uid):
    # In real app, check if g.user is admin
    users_ref.document(uid).set({
        'isVerified': True,
        'verificationStatus': 'approved',
        'updatedAt': firestore.SERVER_TIMESTAMP
    }, merge=True)
    
    return jsonify({'message': 'User verified'}), 200

@users_bp.route('/pending', methods=['GET'])
@login_required
def get_pending_users():
    # Only allow admin? For MVP let anyone view pending list or check role.
    # Assuming internal use.
    docs = users_ref.where('verificationStatus', '==', 'pending').stream()
    users = []
    for doc in docs:
        d = doc.to_dict()
        d['uid'] = doc.id
        users.append(format_doc(d))
    return jsonify(users), 200
