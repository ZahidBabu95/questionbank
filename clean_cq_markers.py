import mysql.connector
import re

def clean_db():
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="questionshaper"
    )
    cursor = conn.cursor()
    
    # Select all CQ questions
    cursor.execute("SELECT id, question_text FROM questions WHERE type='CQ'")
    rows = cursor.fetchall()
    
    update_count = 0
    for row in rows:
        qid, qtext = row
        if not qtext: continue
        
        # We need to find the <span class="cq-text">...</span> and strip markers inside it.
        # It's easier to just use regex substitution on the whole HTML string, 
        # looking for `<span class="cq-text">` followed by the marker.
        
        # Regex to match `<span class="cq-text">` optionally followed by whitespace, then (k) or k.
        pattern = r'(<span class="cq-text">\s*)(?:\(|\[)?\s*(?:[\d০-৯]+|[a-zA-Zক-ষ]+)\s*(?:\)|\]|[\.\-:])\s*'
        
        new_qtext = re.sub(pattern, r'\1', qtext)
        
        if new_qtext != qtext:
            cursor.execute("UPDATE questions SET question_text=%s WHERE id=%s", (new_qtext, qid))
            update_count += 1

    conn.commit()
    print(f"Cleaned {update_count} CQ questions in the database.")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    clean_db()
