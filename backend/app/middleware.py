from functools import wraps
from flask import request, jsonify, g
from firebase_admin import auth, firestore
from pydantic import ValidationError


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
            g.user = decoded_token  # Store user info in flask global context
        except IndexError:
            return jsonify({'error': 'Invalid token format. Bearer <token> expected'}), 401
        except Exception as e:
            # In production, log the error
            print(f"Auth Error: {e}")
            return jsonify({'error': 'Invalid or expired token'}), 401

        return f(*args, **kwargs)
    return decorated_function


def require_role(*allowed_roles):
    """
    RBAC decorator — must be applied AFTER @login_required.

    Usage:
        @users_bp.route('/admin-only')
        @login_required
        @require_role("admin")
        def admin_endpoint():
            ...

    Flow: Verify JWT (login_required) → Fetch user doc → Compare role → 403 if unauthorized.
    Stores the full user document dict in g.user_doc for downstream handlers.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            uid = g.user['uid']

            # Re-use cached user doc if already fetched in this request
            if not getattr(g, 'user_doc', None):
                db = firestore.client()
                user_doc = db.collection('users').document(uid).get()
                if not user_doc.exists:
                    return jsonify({'error': 'User profile not found'}), 404
                g.user_doc = user_doc.to_dict()

            user_role = g.user_doc.get('role', 'user')

            if user_role not in allowed_roles:
                return jsonify({'error': 'Forbidden: Insufficient role'}), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator


def validate_request(schema_class, exclude_unset=False):
    """
    Pydantic validation decorator — validates request JSON against a schema.

    Usage:
        @events_bp.route('', methods=['POST'])
        @login_required
        @validate_request(EventCreate)
        def create_event():
            data = g.validated_data  # clean, validated dict

    For update endpoints, use exclude_unset=True to only include fields
    that were actually sent in the request:
        @validate_request(EventUpdate, exclude_unset=True)

    On failure → 400 with field-level error details.
    On success → stores validated dict in g.validated_data.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            json_data = request.get_json(silent=True)
            if json_data is None:
                return jsonify({
                    'error': 'Validation failed',
                    'details': [{'field': 'body', 'message': 'Request body must be valid JSON'}]
                }), 400

            try:
                model = schema_class(**json_data)
                if exclude_unset:
                    g.validated_data = model.model_dump(exclude_unset=True)
                else:
                    g.validated_data = model.model_dump()
            except ValidationError as e:
                details = []
                for err in e.errors():
                    field = '.'.join(str(loc) for loc in err['loc'])
                    details.append({
                        'field': field,
                        'message': err['msg']
                    })
                return jsonify({'error': 'Validation failed', 'details': details}), 400

            return f(*args, **kwargs)
        return decorated_function
    return decorator
