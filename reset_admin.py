import os
import secrets
import sqlite3
import sys

from werkzeug.security import generate_password_hash

base = os.path.dirname(os.path.abspath(__file__))
data_dir = os.environ.get("ADMISSIONS_DATA", os.path.join(base, "data"))
db_path = os.path.join(data_dir, "admissions.db")

if not os.path.exists(db_path):
    print("No database found at", db_path)
    sys.exit(1)

username = sys.argv[1] if len(sys.argv) > 1 else "admin"
password = secrets.token_urlsafe(9)
db = sqlite3.connect(db_path)
row = db.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()
if not row:
    print("No user named", username)
    sys.exit(1)
db.execute(
    "UPDATE users SET password_hash=?, must_change=1, active=1, failed_attempts=0, locked_until=NULL WHERE id=?",
    (generate_password_hash(password), row[0]),
)
db.commit()
db.close()
print("New temporary password for", username + ":", password)
print("You will be asked to change it at next sign-in.")
