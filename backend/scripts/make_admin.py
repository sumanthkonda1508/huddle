import firebase_admin
from firebase_admin import credentials, firestore
import sys
import os

# Initialize Firebase Admin
# Assuming run from backend/ directory or root with pythonpath
# Adjust path to service-account.json as needed
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(__file__), '../service-account.json')

if not os.path.exists(SERVICE_ACCOUNT_PATH):
    print(f"Error: service-account.json not found at {SERVICE_ACCOUNT_PATH}")
    sys.exit(1)

if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()

def make_admin(email):
    print(f"Looking for user with email: {email}")
    users_ref = db.collection('users')
    query = users_ref.where('email', '==', email).limit(1).stream()
    
    found = False
    for doc in query:
        found = True
        print(f"Found user: {doc.id} ({doc.to_dict().get('displayName')})")
        users_ref.document(doc.id).update({'role': 'admin'})
        print(f"Successfully updated role to 'admin' for {email}")
        
    if not found:
        print("User not found. Please ensure the user has logged in at least once.")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    make_admin(email)
