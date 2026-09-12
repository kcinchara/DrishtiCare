import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "retinal_triage.db")

def migrate():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    tables_and_columns = {
        "users": [
            ("hospital_id", "VARCHAR(100) DEFAULT 'HOSP-001'"),
        ],
        "patients": [
            ("owner_user_id", "INTEGER"),
            ("hospital_id", "VARCHAR(100) DEFAULT 'HOSP-001'"),
            ("assigned_doctor_id", "INTEGER"),
            ("medical_history", "TEXT"),
            ("current_medications", "TEXT"),
            ("risk_factors", "TEXT"),
        ],
        "screenings": [
            ("performed_by", "INTEGER"),
            ("doctor_id", "INTEGER"),
            ("hospital_id", "VARCHAR(100) DEFAULT 'HOSP-001'"),
            ("submission_status", "VARCHAR(50) DEFAULT 'DRAFT'"),
            ("doctor_clinical_assessment", "TEXT"),
            ("both_eyes_data", "JSON"),
        ],
        "referrals": [
            ("hospital_name", "VARCHAR(200)"),
            ("hospital_address", "VARCHAR(300)"),
            ("hospital_contact", "VARCHAR(50)"),
            ("hospital_distance", "VARCHAR(50)"),
            ("directions_url", "VARCHAR(300)"),
            ("referring_doctor_id", "INTEGER"),
            ("place_id", "VARCHAR(100)"),
            ("referral_status", "VARCHAR(50) DEFAULT 'Recommended'"),
            ("referral_date", "DATETIME"),
            ("ai_grade", "INTEGER"),
            ("doctor_final_grade", "INTEGER"),
        ]
    }

    # Ensure screening_comparisons table exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS screening_comparisons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comparison_id VARCHAR(50) UNIQUE NOT NULL,
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        previous_screening_id INTEGER NOT NULL REFERENCES screenings(id),
        current_screening_id INTEGER NOT NULL REFERENCES screenings(id),
        previous_grade INTEGER NOT NULL,
        current_grade INTEGER NOT NULL,
        change_status VARCHAR(50) NOT NULL,
        comparison_summary TEXT,
        doctor_previous_grade INTEGER,
        doctor_current_grade INTEGER,
        findings_diff JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    for table_name, cols in tables_and_columns.items():
        try:
            cursor.execute(f"PRAGMA table_info({table_name})")
            existing_cols = {col[1] for col in cursor.fetchall()}
            for col_name, col_type in cols:
                if col_name not in existing_cols:
                    print(f"Adding column {col_name} to {table_name}...")
                    cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")
                else:
                    print(f"Column {col_name} in {table_name} already exists.")
        except Exception as e:
            print(f"Error checking {table_name}: {e}")

    # Set default owner_user_id for legacy demo patients to demo user (id 1)
    cursor.execute("UPDATE patients SET owner_user_id = 1 WHERE owner_user_id IS NULL;")
    cursor.execute("UPDATE screenings SET performed_by = 1 WHERE performed_by IS NULL;")
    cursor.execute("UPDATE referrals SET referring_doctor_id = 2 WHERE referring_doctor_id IS NULL;")

    conn.commit()
    conn.close()
    print("Migration completed successfully.")

if __name__ == "__main__":
    migrate()
