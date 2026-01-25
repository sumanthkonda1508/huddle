from flask import request, jsonify, g
from firebase_admin import firestore
from google.cloud.firestore import FieldFilter
from . import venues_bp
from app.middleware import login_required
import uuid
import datetime

db = firestore.client()

@venues_bp.route('', methods=['POST'])
@login_required
def create_venue():
    try:
        data = request.json
        uid = g.user['uid']
        
        # Check User Plan limits
        user_doc = db.collection('users').document(uid).get()
        user_data = user_doc.to_dict() if user_doc.exists else {}
        # Check venue_plan specifically
        plan = user_data.get('venue_plan', 'basic')
        
        # Count existing venues
        venues_ref = db.collection('venues')
        # Note: In a real app with many venues, we might want an aggregation query or counter in user doc
        # For MVP, a count query is fine.
        existing_count = 0
        docs = venues_ref.where(filter=FieldFilter('owner_id', '==', uid)).stream()
        for _ in docs:
            existing_count += 1
            
        # Limit Logic
        if plan == 'basic' and existing_count >= 1:
            return jsonify({"error": "Basic plan limit reached. precise_error: LIMIT_REACHED"}), 403
            
        # Basic validation
        required_fields = ['name', 'location', 'capacity', 'contact_email', 'contact_phone', 'city']
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                return jsonify({"error": f"Missing required field: {field}"}), 400

        venue_id = str(uuid.uuid4())
        venue_data = {
            'id': venue_id,
            'name': data['name'],
            'location': data['location'], # Exact address
            'city': data['city'], # For filtering
            'capacity': int(data.get('capacity') or 0),
            'price_per_hour': float(data.get('price_per_hour') or 0),
            'description': data.get('description', ''),
            'images': data.get('images', []),
            'owner_id': g.user['uid'],
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
        venues_ref = db.collection('venues')
        docs = venues_ref.stream()
        venues = []
        for doc in docs:
            venues.append(doc.to_dict())
        return jsonify(venues), 200
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
def book_venue(venue_id):
    try:
        # Check if venue exists and owner
        venue_doc = db.collection('venues').document(venue_id).get()
        if not venue_doc.exists:
            return jsonify({"error": "Venue not found"}), 404
            
        venue_data = venue_doc.to_dict()
        if venue_data.get('owner_id') == g.user['uid']:
             return jsonify({"error": "You cannot book your own venue"}), 400

        data = request.json
        # booking payload: { event_name, date, start_time, end_time, user_id, user_email }
        
        request_id = str(uuid.uuid4())
        booking_data = {
            'id': request_id,
            'venue_id': venue_id,
            'event_name': data.get('event_name'),
            'date': data.get('date'),
            'start_time': data.get('start_time'),
            'end_time': data.get('end_time'),
            'requester_id': data.get('user_id'),
            'requester_email': data.get('user_email'), # helpful for contact
            'status': 'pending', # pending, approved, rejected
            'created_at': datetime.datetime.utcnow().isoformat()
        }
        
        # Store in a subcollection or root collection? Root is easier for queries usually.
        db.collection('venue_requests').document(request_id).set(booking_data)
        
        return jsonify(booking_data), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@venues_bp.route('/<venue_id>', methods=['PUT'])
@login_required
def update_venue(venue_id):
    try:
        uid = g.user['uid']
        venue_ref = db.collection('venues').document(venue_id)
        venue_doc = venue_ref.get()
        
        if not venue_doc.exists:
            return jsonify({"error": "Venue not found"}), 404
            
        if venue_doc.to_dict().get('owner_id') != uid:
             return jsonify({"error": "Unauthorized"}), 403

        data = request.json
        # Only allow updating specific fields
        allowed_fields = ['name', 'location', 'city', 'capacity', 'price_per_hour', 'description', 'images', 'amenities', 'catering', 'contact_email', 'contact_phone', 'website']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if 'capacity' in update_data:
             update_data['capacity'] = int(update_data['capacity'] or 0)
        if 'price_per_hour' in update_data:
             update_data['price_per_hour'] = float(update_data['price_per_hour'] or 0)

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
