import sys
import os
from datetime import datetime

# Set current directory to backend
os.chdir(r"d:\event ticketing application\backend")
sys.path.insert(0, os.getcwd())

from app import create_app
from firebase_admin import firestore

app = create_app()
db = firestore.client()

# Find a verified host to test with
users = db.collection('users').where(filter=firestore.FieldFilter('isVerifiedHost', '==', True)).limit(1).stream()
host = next(users, None)

if not host:
    print("No verified hosts found in DB to test with!")
    sys.exit(0)

uid = host.id
print(f"Testing analytics for host: {uid}")

try:
    events = db.collection('events').where(filter=firestore.FieldFilter('hostId', '==', uid)).stream()
    
    active_events_count = 0
    total_tickets_sold = 0
    total_revenue = 0
    now_iso = datetime.utcnow().isoformat()
    
    for evt in events:
        data = evt.to_dict()
        print(f"Processing event: {data.get('title')}")
        if data.get('date', "") >= now_iso:
            active_events_count += 1
        sold = int(data.get('tickets_sold', 0))
        parts = len(data.get('participants', []))
        total_tickets_sold += max(sold, parts)
        if data.get('is_paid'):
            price = float(data.get('ticket_price', 0))
            total_revenue += (price * sold)

    print(f"Results: Active={active_events_count}, Tickets={total_tickets_sold}, Revenue={total_revenue}")
except Exception as e:
    print(f"Error during aggregation: {e}")
