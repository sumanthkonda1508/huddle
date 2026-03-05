from flask import request, jsonify, g
from firebase_admin import firestore
from google.cloud.firestore import FieldFilter
from app.middleware import login_required
from app.utils import format_doc
from . import notifications_bp

db = firestore.client()
users_ref = db.collection('users')

# Helper function to create notification (Internal use)
def create_notification(recipient_id, title, message, type, related_event_id=None):
    if not recipient_id:
        return
        
    notification_data = {
        'recipientId': recipient_id,
        'title': title,
        'message': message,
        'type': type,
        'relatedEventId': related_event_id,
        'read': False,
        'createdAt': firestore.SERVER_TIMESTAMP
    }
    
    # Add to 'notifications' subcollection of the user or a root collection?
    # Root collection 'notifications' + where(recipientId) is better for querying all notifications for a user easily index-wise, 
    # but subcollection `users/{uid}/notifications` is cleaner for permissions.
    # Let's use root collection for simplicity in querying if we ever need cross-user stats, 
    # but strictly filtering by recipientId.
    
    db.collection('notifications').add(notification_data)

@notifications_bp.route('', methods=['GET'])
@login_required
def get_notifications():
    uid = g.user['uid']
    limit = min(int(request.args.get('limit', 20)), 50)
    last_doc_id = request.args.get('last_doc_id')
    
    query = db.collection('notifications')\
            .where(filter=FieldFilter('recipientId', '==', uid))
    
    if last_doc_id:
        last_doc = db.collection('notifications').document(last_doc_id).get()
        if last_doc.exists:
            query = query.start_after(last_doc)
    
    docs = query.limit(limit + 1).stream()
    
    notifications = []
    for doc in docs:
        d = doc.to_dict()
        d['id'] = doc.id
        notifications.append(format_doc(d))
    
    # Sort in memory (newest first)
    notifications.sort(key=lambda x: str(x.get('createdAt') or ''), reverse=True)
    
    has_more = len(notifications) > limit
    if has_more:
        notifications = notifications[:limit]
    
    last_id = notifications[-1]['id'] if notifications else None
    
    return jsonify({'data': notifications, 'hasMore': has_more, 'lastDocId': last_id}), 200

@notifications_bp.route('/<notification_id>/read', methods=['PUT'])
@login_required
def mark_read(notification_id):
    uid = g.user['uid']
    
    ref = db.collection('notifications').document(notification_id)
    doc = ref.get()
    
    if not doc.exists:
        return jsonify({'error': 'Notification not found'}), 404
        
    if doc.to_dict().get('recipientId') != uid:
        return jsonify({'error': 'Unauthorized'}), 403
        
    ref.update({'read': True})
    return jsonify({'message': 'Marked as read'}), 200

@notifications_bp.route('/read-all', methods=['PUT'])
@login_required
def mark_all_read():
    uid = g.user['uid']
    
    # Batch update?
    batch = db.batch()
    docs = db.collection('notifications')\
            .where(filter=FieldFilter('recipientId', '==', uid))\
            .where(filter=FieldFilter('read', '==', False))\
            .stream()
            
    count = 0
    for doc in docs:
        batch.update(doc.reference, {'read': True})
        count += 1
        
    if count > 0:
        batch.commit()
        
    return jsonify({'message': f'Marked {count} notifications as read'}), 200
