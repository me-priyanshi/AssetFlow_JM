# AssetFlow — Enterprise Asset & Resource Management System

AssetFlow is a robust system designed for tracking company assets, allocating them to employees or departments, handling role-based access control, and managing transfer requests.

This guide will take you from absolute zero to having the entire system running seamlessly on your local machine. 

---

## 🛠️ Phase 1: Prerequisites

Before you start, you must install the core engines that run this project. If you don't have them, download and install them with their default settings:

1. **[Python (3.10+)](https://www.python.org/downloads/)**: The language for the backend.
   - *Important (Windows)*: During installation, make sure to check the box that says **"Add python.exe to PATH"**.
2. **[Node.js (18+)](https://nodejs.org/)**: The environment for the React frontend. (Download the "LTS" version).
3. **[MySQL Server](https://dev.mysql.com/downloads/installer/)**: The database engine. 
   - Write down the `root` password you set during installation!

---

## 💾 Phase 2: Database Setup

AssetFlow uses MySQL. We need to create a database for it to use.

1. Open your terminal or Command Prompt.
2. Log into MySQL by typing:
   ```bash
   mysql -u root -p
   ```
   *(Enter the password you created when installing MySQL).*
3. Create the database by running this exact command inside MySQL:
   ```sql
   CREATE DATABASE assetflow_db;
   EXIT;
   ```

---

## ⚙️ Phase 3: Backend Setup (Django)

The backend handles all the logic, database communication, and APIs. 

1. **Open a terminal** and navigate to the project folder:
   ```bash
   cd path/to/project
   ```

2. **Create a Virtual Environment** (This creates a sandbox so project libraries don't mess with your computer's global Python):
   ```bash
   python -m venv venv
   ```

3. **Activate the Virtual Environment**:
   - **Windows (Command Prompt):** `venv\Scripts\activate.bat`
   - **Windows (PowerShell):** `.\venv\Scripts\activate`
   - **Mac/Linux:** `source venv/bin/activate`
   *(You should see `(venv)` appear at the beginning of your terminal prompt).*

4. **Install Backend Dependencies**:
   *(Make sure you are in the `project` folder, not `backend` yet)*
   ```bash
   pip install django djangorestframework djangorestframework-simplejwt django-cors-headers mysqlclient python-dotenv pillow
   ```
   *(Note: If `mysqlclient` fails to install on Windows, download the appropriate `.whl` file from [here](https://www.lfd.uci.edu/~gohlke/pythonlibs/#mysqlclient) and install it using `pip install <filename>.whl`)*

5. **Create the Environment File (`.env`)**:
   Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
   Create a file named exactly `.env` inside the `backend` folder and paste the following into it. Update `DB_PASSWORD` with your actual MySQL root password:
   ```ini
   SECRET_KEY=django-insecure-local-dev-key-change-in-prod
   DEBUG=True
   
   DB_ENGINE=django.db.backends.mysql
   DB_NAME=assetflow_db
   DB_USER=root
   DB_PASSWORD=your_mysql_password_here
   DB_HOST=localhost
   DB_PORT=3306
   ```

6. **Initialize the Database (Migrations)**:
   This creates all the necessary tables in your MySQL database.
   ```bash
   python manage.py migrate
   ```

7. **Start the Backend Server**:
   ```bash
   python manage.py runserver
   ```
   Leave this terminal window open! The backend is now running at `http://localhost:8000`.

---

## 🎨 Phase 4: Frontend Setup (React/Vite)

The frontend is what you see and interact with in your browser.

1. **Open a NEW terminal window** (keep the backend terminal running).
2. Navigate to the `frontend` directory inside the project:
   ```bash
   cd path/to/project/frontend
   ```

3. **Install Frontend Dependencies**:
   ```bash
   npm install
   ```

4. **Start the Frontend Server**:
   ```bash
   npm run dev
   ```

---

## 🎉 Phase 5: You're Done!

You should now see a link in your frontend terminal (usually `http://localhost:5173/`). 
1. `Ctrl + Click` (or `Cmd + Click`) the link to open the app in your browser.
2. Click **Sign Up** to create your first account.
   *(Password requirement: Minimum 7 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character).*
3. Enjoy using AssetFlow!

---

### 💡 Quick Troubleshooting

- **"Command not found" for python or npm**: You forgot to check "Add to PATH" during installation, or you need to restart your computer after installing them.
- **Backend says "Access denied for user 'root'@'localhost'"**: Your MySQL password in the `backend/.env` file is incorrect.
- **Image/PDF uploads aren't working**: Ensure you have a `media` folder inside your `backend` directory. (Django will usually create this automatically upon your first upload).
