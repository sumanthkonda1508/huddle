from flask import Flask
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials

def create_app():
    app = Flask(__name__)
    CORS(app) # Enable CORS for all routes

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
