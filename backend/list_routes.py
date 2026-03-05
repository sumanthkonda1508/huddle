import sys
import os

# Set current directory to backend
os.chdir(r"d:\event ticketing application\backend")
sys.path.insert(0, os.getcwd())

from app import create_app

app = create_app()

print("Listing all registered routes:")
for rule in app.url_map.iter_rules():
    print(f"{rule.endpoint}: {rule}")

print("\nChecking analytics blueprint:")
print(f"Analytics blueprint registered: {'analytics' in app.blueprints}")
