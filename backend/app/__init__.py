from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import firebase_admin
from firebase_admin import credentials

# Module-level limiter instance — imported by route files
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "60 per hour"],
    storage_uri="memory://",
)

def create_app():
    app = Flask(__name__)
    from werkzeug.exceptions import HTTPException

    # CORS Config Phase 0.7
    CORS(app, 
         origins=["http://localhost:5173", "https://huddle-five-omega.vercel.app"], # Replace with actual prod domain
         allow_headers=["Authorization", "Content-Type"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

    # Attach limiter to app
    limiter.init_app(app)

    # Custom 429 response
    @app.errorhandler(429)
    def ratelimit_handler(e):
        response = jsonify({
            'error': 'Rate limit exceeded',
            'message': str(e.description),
            'code': 429
        })
        response.status_code = 429
        response.headers['Retry-After'] = str(e.description) if hasattr(e, 'description') else '60'
        return response

    # Global Error Handlers Phase 0.6
    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        response = jsonify({
            "error": e.name,
            "message": e.description,
            "code": e.code
        })
        response.status_code = e.code
        return response

    @app.errorhandler(Exception)
    def handle_exception(e):
        # Prevent stack trace leakage in prod
        print(f"Unhandled Exception: {str(e)}")
        response = jsonify({
            "error": "Internal Server Error",
            "message": "An unexpected error occurred.",
            "code": 500
        })
        response.status_code = 500
        return response

    # Initialize Firebase Admin SDK
    if not firebase_admin._apps:
        try:
            import os
            import json
            from dotenv import load_dotenv
            
            # Load .env if present (local dev)
            dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env') # Adjusted path to root
            load_dotenv(dotenv_path)

            # 1. Check for Env Var with JSON content (Production/Render)
            firebase_creds_json = os.getenv('FIREBASE_CREDENTIALS')
            
            # 2. Check for local file
            key_path = os.getenv('SVC_ACC_PATH', 'service-account.json')
            
            if firebase_creds_json:
                print("Initializing Firebase with FIREBASE_CREDENTIALS env var")
                cred_dict = json.loads(firebase_creds_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
            elif os.path.exists(key_path):
                print(f"Initializing Firebase with local file: {key_path}")
                cred = credentials.Certificate(key_path)
                firebase_admin.initialize_app(cred)
            else:
                # 3. Fallback to Google Cloud automatic discovery
                print("Initializing Firebase with Default Credentials")
                firebase_admin.initialize_app()
                
        except Exception as e:
            print(f"Warning: Firebase Admin failed to initialize: {e}")

    @app.route('/health')
    @limiter.exempt
    def health_check():
        return {'status': 'ok', 'service': 'event-ticketing-backend'}

    # Register Blueprints
    from app.blueprints.users import users_bp
    from app.blueprints.events import events_bp
    from app.blueprints.notifications import notifications_bp
    from app.blueprints.venues import venues_bp
    from app.blueprints.payments import payments_bp
    from app.blueprints.tickets import tickets_bp
    from app.blueprints.analytics import analytics_bp
    
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(events_bp, url_prefix='/api/events')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(venues_bp, url_prefix='/api/venues')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    app.register_blueprint(tickets_bp, url_prefix='/api/tickets')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    
    # Initialize background scheduler
    try:
        from app.scheduler import init_scheduler
        init_scheduler(app)
    except Exception as e:
        print(f"Failed to start scheduler: {str(e)}")
        
    return app
