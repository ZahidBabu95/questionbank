import mysql.connector

def check():
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="questionshaper"
    )
    cursor = conn.cursor()
    
    with open("db_output.txt", "w", encoding="utf-8") as f:
        # Check if there are topics with no chunks and no questions
        query = """
        SELECT t.id, t.name, t.chapter_id 
        FROM topics t 
        WHERE t.id NOT IN (SELECT topic_id FROM curriculum_document_chunks WHERE topic_id IS NOT NULL)
        AND t.id NOT IN (SELECT topic_id FROM questions WHERE topic_id IS NOT NULL)
        """
        cursor.execute(query)
        unused = cursor.fetchall()
        
        f.write(f"Total Unused Topics: {len(unused)}\n")
        if unused:
            f.write("First 5 unused topics:\n")
            for r in unused[:5]:
                f.write(str(r) + "\n")
                
        # Also check if any of these unused topics are referenced in source_book_index
        if unused:
            topic_ids = [r[0] for r in unused]
            format_strings = ','.join(['%s'] * len(topic_ids))
            cursor.execute(f"SELECT id, index_name, mapped_topic_id FROM source_book_index WHERE mapped_topic_id IN ({format_strings})", tuple(topic_ids))
            referenced = cursor.fetchall()
            f.write(f"Unused topics referenced in source_book_index: {len(referenced)}\n")
            for r in referenced:
                f.write(str(r) + "\n")
                
        # Check chunks for the specific book
        book_id = "00f57133-504f-4e9d-bf56-5d0237fa7d1f"
        cursor.execute("SELECT COUNT(*) FROM curriculum_document_chunks WHERE source_book_id = %s", (book_id,))
        chunks_count = cursor.fetchone()[0]
        f.write(f"Total chunks for book {book_id}: {chunks_count}\n")
        
        # Check topics for the specific book's chapters
        cursor.execute("SELECT c.id, c.name FROM chapters c JOIN source_book_index s ON s.mapped_chapter_id = c.id WHERE s.source_book_id = %s", (book_id,))
        chapters = cursor.fetchall()
        f.write(f"Chapters in book {book_id}: {len(chapters)}\n")
        for ch in chapters:
            cursor.execute("SELECT COUNT(*) FROM topics WHERE chapter_id = %s", (ch[0],))
            topics_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM curriculum_document_chunks WHERE topic_id IN (SELECT id FROM topics WHERE chapter_id = %s)", (ch[0],))
            ch_chunks_count = cursor.fetchone()[0]
            
            f.write(f"Chapter {ch[0]} ({ch[1]}): Topics={topics_count}, Chunks mapped to these topics={ch_chunks_count}\n")
            
            if ch_chunks_count > 0:
                cursor.execute("SELECT DISTINCT source_book_id FROM curriculum_document_chunks WHERE topic_id IN (SELECT id FROM topics WHERE chapter_id = %s)", (ch[0],))
                other_books = cursor.fetchall()
                f.write(f"   -> These chunks belong to book IDs: {other_books}\n")

if __name__ == "__main__":
    check()
