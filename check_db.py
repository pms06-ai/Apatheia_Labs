import sqlite3
import os

db_path = r'C:\Users\pstep\AppData\Roaming\com.apatheia.phronesis\phronesis.db'

print(f"Database exists: {os.path.exists(db_path)}")
print(f"Database size: {os.path.getsize(db_path)} bytes")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print(f"\nTables: {tables}")

# Check documents table
if 'documents' in tables:
    cursor.execute("SELECT COUNT(*) FROM documents")
    count = cursor.fetchone()[0]
    print(f"\nDocuments count: {count}")
    
    if count > 0:
        cursor.execute("SELECT id, filename, status, storage_path FROM documents LIMIT 5")
        for row in cursor.fetchall():
            print(f"  - {row}")
else:
    print("\nNo 'documents' table found!")

# Check cases table
if 'cases' in tables:
    cursor.execute("SELECT COUNT(*) FROM cases")
    count = cursor.fetchone()[0]
    print(f"\nCases count: {count}")
    
    cursor.execute("SELECT id, name FROM cases LIMIT 5")
    for row in cursor.fetchall():
        print(f"  - {row}")

conn.close()
