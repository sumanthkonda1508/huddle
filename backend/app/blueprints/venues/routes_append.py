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
