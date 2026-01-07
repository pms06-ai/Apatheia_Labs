import sqlite3
import os

db_path = r'C:\Users\pstep\AppData\Roaming\com.apatheia.phronesis\phronesis.db'
storage_path = r'C:\Users\pstep\AppData\Roaming\com.apatheia.phronesis\storage'

print("=" * 60)
print("PHRONESIS UPLOAD SYSTEM DIAGNOSTIC")
print("=" * 60)

# Check storage directories
print("\n[1] STORAGE DIRECTORY ANALYSIS")
print(f"Storage root: {storage_path}")
print(f"  Exists: {os.path.exists(storage_path)}")

documents_dir = os.path.join(storage_path, 'documents')
print(f"Documents dir: {documents_dir}")
print(f"  Exists: {os.path.exists(documents_dir)}")

if os.path.exists(documents_dir):
    contents = os.listdir(documents_dir)
    print(f"  Contents: {contents if contents else '(empty)'}")
    
    # Check if any case subdirectories exist
    for item in contents[:5]:
        item_path = os.path.join(documents_dir, item)
        if os.path.isdir(item_path):
            sub_contents = os.listdir(item_path)
            print(f"    {item}/: {len(sub_contents)} files")

# Check database
print("\n[2] DATABASE ANALYSIS")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get cases
cursor.execute("SELECT id, name, reference FROM cases")
cases = cursor.fetchall()
print(f"\nCases ({len(cases)}):")
for case in cases:
    print(f"  - {case[0]}: {case[1]} ({case[2]})")
    
    # Count docs for this case
    cursor.execute("SELECT COUNT(*) FROM documents WHERE case_id = ?", (case[0],))
    doc_count = cursor.fetchone()[0]
    print(f"    Documents: {doc_count}")

# Check documents with internal storage paths vs external
print("\n[3] DOCUMENT STORAGE PATH ANALYSIS")
app_data_prefix = r'C:\Users\pstep\AppData\Roaming\com.apatheia.phronesis'

cursor.execute("SELECT storage_path FROM documents")
all_paths = [row[0] for row in cursor.fetchall()]

internal_count = sum(1 for p in all_paths if p.startswith(app_data_prefix))
external_count = len(all_paths) - internal_count

print(f"Total documents: {len(all_paths)}")
print(f"  Internal storage (app_data): {internal_count}")
print(f"  External paths: {external_count}")

# Show sample external paths
external_paths = [p for p in all_paths if not p.startswith(app_data_prefix)]
if external_paths:
    print("\nSample external paths:")
    for p in external_paths[:5]:
        print(f"  - {p}")

# Check for any documents with pending status
print("\n[4] DOCUMENT STATUS BREAKDOWN")
cursor.execute("SELECT status, COUNT(*) FROM documents GROUP BY status")
for status, count in cursor.fetchall():
    print(f"  {status}: {count}")

# Check most recent documents
print("\n[5] MOST RECENT DOCUMENTS")
cursor.execute("""
    SELECT filename, status, storage_path, created_at 
    FROM documents 
    ORDER BY created_at DESC 
    LIMIT 5
""")
for row in cursor.fetchall():
    print(f"  {row[3]}: {row[0]}")
    print(f"    Status: {row[1]}")
    print(f"    Path: {row[2][:80]}...")

conn.close()

print("\n" + "=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)
