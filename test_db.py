import mysql.connector

def test_db():
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="questionshaper"
    )
    cursor = conn.cursor()
    cursor.execute("SELECT question_text FROM questions WHERE type='CQ' LIMIT 10")
    rows = cursor.fetchall()
    
    with open("db_cq_dump.txt", "w", encoding="utf-8") as f:
        for row in rows:
            f.write("-------\n")
            if row[0]:
                f.write(row[0] + "\n")

if __name__ == "__main__":
    test_db()
