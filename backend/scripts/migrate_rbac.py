"""
Migration Script: Phase 0.1 RBAC — Update existing user documents.

Changes applied:
  1. Adds 'role' field (default: "user") if missing — preserves "admin" if already set
  2. Renames 'isVerified'       → 'isVerifiedHost'  (preserves value)
  3. Renames 'isVenueVerified'  → 'isVerifiedVenue'  (preserves value)

Safe to run multiple times (idempotent).

Usage:
  cd backend
  python -m scripts.migrate_rbac
"""

import os
import sys
import json

# Add parent dir so `app` package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

# --- Firebase Init (same logic as app/__init__.py) ---
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

if not firebase_admin._apps:
    firebase_creds_json = os.getenv('FIREBASE_CREDENTIALS')
    key_path = os.getenv('SVC_ACC_PATH', 'service-account.json')

    if firebase_creds_json:
        cred = credentials.Certificate(json.loads(firebase_creds_json))
        firebase_admin.initialize_app(cred)
    elif os.path.exists(key_path):
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

db = firestore.client()


def migrate_users():
    users_ref = db.collection('users')
    docs = users_ref.stream()

    updated = 0
    skipped = 0

    for doc in docs:
        data = doc.to_dict()
        updates = {}

        # --- 1. Role field ---
        if 'role' not in data:
            updates['role'] = 'user'
        elif data['role'] == 'attendee':
            updates['role'] = 'user'  # Align old default with new spec

        # --- 2. isVerified → isVerifiedHost ---
        if 'isVerified' in data and 'isVerifiedHost' not in data:
            updates['isVerifiedHost'] = data['isVerified']
            # We don't delete old field to be safe — can clean up later

        if 'isVerifiedHost' not in data and 'isVerified' not in data:
            updates['isVerifiedHost'] = False

        # --- 3. isVenueVerified → isVerifiedVenue ---
        if 'isVenueVerified' in data and 'isVerifiedVenue' not in data:
            updates['isVerifiedVenue'] = data['isVenueVerified']

        if 'isVerifiedVenue' not in data and 'isVenueVerified' not in data:
            updates['isVerifiedVenue'] = False

        # --- Apply ---
        if updates:
            users_ref.document(doc.id).update(updates)
            updated += 1
            print(f"  ✔ Updated {doc.id}: {list(updates.keys())}")
        else:
            skipped += 1

    print(f"\nDone. Updated: {updated}, Skipped (no changes needed): {skipped}")


if __name__ == '__main__':
    print("=== RBAC Migration: Updating user documents ===\n")
    migrate_users()
