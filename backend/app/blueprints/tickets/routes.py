import io
import qrcode
from flask import send_file, jsonify, request, g
from firebase_admin import firestore
from . import tickets_bp
from app.middleware import login_required, validate_request

db = firestore.client()

@tickets_bp.route('/my', methods=['GET'])
@login_required
def get_my_tickets():
    uid = g.user['uid']
    tickets_ref = db.collection('tickets').where('user_id', '==', uid)
    
    # We should join event details with the ticket
    results = []
    for doc in tickets_ref.get():
        td = doc.to_dict()
        td['id'] = doc.id
        
        # Hydrate event
        event_doc = db.collection('events').document(td['event_id']).get()
        if event_doc.exists:
            event_data = event_doc.to_dict()
            td['eventTitle'] = event_data.get('title')
            td['eventDate'] = event_data.get('date')
            td['eventVenue'] = event_data.get('venue')
            td['mediaUrls'] = event_data.get('mediaUrls', [])
            
        results.append(td)
        
    # Sort locally to avoid needing a Firestore Composite Index
    results.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return jsonify(results), 200

@tickets_bp.route('/<ticket_id>', methods=['GET'])
@login_required
def get_ticket(ticket_id):
    uid = g.user['uid']
    doc_ref = db.collection('tickets').document(ticket_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        return jsonify({'error': 'Ticket not found'}), 404
        
    td = doc.to_dict()
    # Check if the user owns this ticket or is the host of the event
    event_doc = db.collection('events').document(td['event_id']).get()
    
    is_owner = td['user_id'] == uid
    is_host = event_doc.exists and event_doc.to_dict().get('hostId') == uid
    
    if not (is_owner or is_host):
        return jsonify({'error': 'Unauthorized'}), 403
        
    td['id'] = doc.id
    if event_doc.exists:
        event_data = event_doc.to_dict()
        td['event'] = {
            'title': event_data.get('title'),
            'date': event_data.get('date'),
            'venue': event_data.get('venue'),
            'city': event_data.get('city'),
            'price': event_data.get('ticket_price', 0),
            'mediaUrls': event_data.get('mediaUrls', [])
        }
        
    return jsonify(td), 200

@tickets_bp.route('/<ticket_id>/qr', methods=['GET'])
# Notice: Can make it accessible without auth if we want to embed the image in an email, 
# but making it login_required is safer.
@login_required
def generate_ticket_qr(ticket_id):
    uid = g.user['uid']
    
    # Verify ownership
    doc_ref = db.collection('tickets').document(ticket_id)
    doc = doc_ref.get()
    
    if not doc.exists or doc.to_dict().get('user_id') != uid:
        return jsonify({'error': 'Unauthorized or Not Found'}), 403
        
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    
    # We will embed a verification URL or JSON string. 
    # For phase 1, we just embed the ticket ID.
    qr.add_data(f"ticket:{ticket_id}")
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Send as image via BytesIO
    img_io = io.BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    
    return send_file(img_io, mimetype='image/png')


@tickets_bp.route('/<ticket_id>/checkin', methods=['POST'])
@login_required
def checkin_ticket(ticket_id):
    """
    Check in a ticket at event entry.
    Only the event HOST can perform check-in.
    Validates: ticket exists, is 'active', and not already used or refunded.
    """
    uid = g.user['uid']

    doc_ref = db.collection('tickets').document(ticket_id)
    doc = doc_ref.get()

    if not doc.exists:
        return jsonify({'error': 'Ticket not found'}), 404

    td = doc.to_dict()
    event_id = td.get('event_id')

    # Verify caller is the event host
    event_doc = db.collection('events').document(event_id).get()
    if not event_doc.exists:
        return jsonify({'error': 'Associated event not found'}), 404

    if event_doc.to_dict().get('hostId') != uid:
        return jsonify({'error': 'Only the event host can check in tickets'}), 403

    # Check ticket status
    status = td.get('status')

    if status == 'used':
        return jsonify({'error': 'Ticket has already been checked in'}), 400

    if status == 'refunded':
        return jsonify({'error': 'Ticket has been refunded and is no longer valid'}), 400

    if status != 'active':
        return jsonify({'error': f'Ticket is in "{status}" state and cannot be checked in'}), 400

    # Mark as used
    import time
    doc_ref.update({
        'status': 'used',
        'checked_in_at': int(time.time()),
        'checked_in_by': uid
    })

    return jsonify({'message': 'Ticket checked in successfully', 'ticket_id': ticket_id}), 200
