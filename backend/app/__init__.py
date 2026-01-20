from flask import Flask
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials

def create_app():
    app = Flask(__name__)
    CORS(app) # Enable CORS for all routes

    # Initialize Firebase Admin SDK
    # For MVP local dev, we might assume GOOGLE_APPLICATION_CREDENTIALS is set
    # or use a placeholder if not yet provided.
    if not firebase_admin._apps:
        try:
            # Check for local service account key
            import os
            from dotenv import load_dotenv
            dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
            load_dotenv(dotenv_path)
            key_path = os.getenv('SVC_ACC_PATH', 'service-account.json')
            
            if os.path.exists(key_path):
                cred = credentials.Certificate(key_path)
                firebase_admin.initialize_app(cred)
                print(f"Firebase Admin Initialized with {key_path}")
            else:
                # Fallback to default credentials (cloud env or GOOGLE_APPLICATION_CREDENTIALS set)
                firebase_admin.initialize_app()
                print("Firebase Admin Initialized with Default Credentials")
        except Exception as e:
            print(f"Warning: Firebase Admin failed to initialize: {e}")

    @app.route('/health')
    def health_check():
        return {'status': 'ok', 'service': 'event-ticketing-backend'}

    # Register Blueprints
    from app.blueprints.users import users_bp
    from app.blueprints.events import events_bp
    from app.blueprints.notifications import notifications_bp
    
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(events_bp, url_prefix='/api/events')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    
    return app
