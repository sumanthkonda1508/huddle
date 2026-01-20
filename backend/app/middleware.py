from functools import wraps
from flask import request, jsonify, g
from firebase_admin import auth

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Authorization header is missing'}), 401

        try:
            # Expected format: "Bearer <token>"
            token = auth_header.split(" ")[1]
            decoded_token = auth.verify_id_token(token)
            g.user = decoded_token # Store user info in flask global context
        except IndexError:
            return jsonify({'error': 'Invalid token format. Bearer <token> expected'}), 401
        except Exception as e:
            # In production, log the error
            print(f"Auth Error: {e}")
            return jsonify({'error': 'Invalid or expired token'}), 401

        return f(*args, **kwargs)
    return decorated_function
