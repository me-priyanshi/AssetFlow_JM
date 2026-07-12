"""One-off script to create the MySQL database."""
from dotenv import load_dotenv
import os
import MySQLdb

load_dotenv('.env')

conn = MySQLdb.connect(
    host=os.getenv('DB_HOST'),
    user=os.getenv('DB_USER'),
    passwd=os.getenv('DB_PASSWORD', '').strip('"'),
    port=int(os.getenv('DB_PORT', 3307)),
)
cur = conn.cursor()
cur.execute(
    'CREATE DATABASE IF NOT EXISTS assetflow_db '
    'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
)
conn.commit()
print('Database assetflow_db ready')
