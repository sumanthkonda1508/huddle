from flask import jsonify, g
from firebase_admin import firestore
from app.middleware import login_required, require_role
from . import analytics_bp

db = firestore.client()

@analytics_bp.route('/platform', methods=['GET'])
@login_required
@require_role('admin')
def get_platform_analytics():
    try:
        users_count = len(list(db.collection('users').stream()))
        events_count = len(list(db.collection('events').stream()))
        venues_count = len(list(db.collection('venues').stream()))
        
        # Count Pending Verifications
        pending_hosts = len(list(db.collection('host_requests').where(filter=firestore.FieldFilter('status', '==', 'pending')).stream()))
        pending_venues = len(list(db.collection('venue_requests').where(filter=firestore.FieldFilter('status', '==', 'pending')).stream()))
        
        # Calculate Total Revenue Mock (sum of tickets sold * price)
        total_revenue = 0
        events = db.collection('events').stream()
        for evt in events:
            data = evt.to_dict()
            if data.get('is_paid'):
               price = float(data.get('ticket_price', 0))
               sold = int(data.get('tickets_sold', 0))
               total_revenue += (price * sold)

        return jsonify({
            'totalUsers': users_count,
            'totalEvents': events_count,
            'totalVenues': venues_count,
            'pendingVerifications': pending_hosts + pending_venues,
            'totalRevenue': total_revenue
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/host', methods=['GET'])
@login_required
def get_host_analytics():
    try:
        uid = g.user['uid']
        # Check if they are actually a host first
        user_doc = db.collection('users').document(uid).get()
        if not user_doc.exists or not user_doc.to_dict().get('isVerifiedHost'):
             return jsonify({'error': 'Unauthorized, not a verified host'}), 403

        events = db.collection('events').where(filter=firestore.FieldFilter('hostId', '==', uid)).stream()
        
        active_events_count = 0
        total_tickets_sold = 0
        total_revenue = 0
        
        from datetime import datetime
        now_iso = datetime.utcnow().isoformat()
        
        for evt in events:
            data = evt.to_dict()
            
            # Robust date check (handles string or Timestamp)
            event_date = data.get('date', "")
            if hasattr(event_date, 'isoformat'):
                event_date = event_date.isoformat()
            
            # Count active upcoming events
            if str(event_date) >= now_iso:
                active_events_count += 1
                
            sold = int(data.get('tickets_sold', 0))
            # Also legacy fallback for free events that track via participants array
            parts = len(data.get('participants', []))
            
            total_tickets_sold += max(sold, parts)
            
            if data.get('is_paid'):
                price = float(data.get('ticket_price', 0))
                total_revenue += (price * sold)

        return jsonify({
            'activeEvents': active_events_count,
            'totalTicketsSold': total_tickets_sold,
            'totalRevenue': total_revenue
        }), 200
        
    except Exception as e:
         return jsonify({'error': str(e)}), 500
