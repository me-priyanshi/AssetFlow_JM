-- setup_db.sql
-- Run this script in your MySQL shell (e.g., mysql -u root -p < setup_db.sql)

CREATE DATABASE IF NOT EXISTS assetflow_db;

-- Optional: Create a dedicated user for the app (uncomment and modify if needed)
-- CREATE USER IF NOT EXISTS 'assetflow_user'@'localhost' IDENTIFIED BY 'assetflow_pass';
-- GRANT ALL PRIVILEGES ON assetflow_db.* TO 'assetflow_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Note: User insertion is best done via Django so passwords are hashed correctly. 
-- We will provide a seed_db.py script for you to run after migrations.
