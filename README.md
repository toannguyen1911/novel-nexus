# Novel-Nexus (Novel & E-Book Platform)

Novel-Nexus is a mobile-first Web App platform designed for managing and reading plain text novels (`.txt`) and electronic books (`.epub`). The project automatically splits chapters, saves reading progress intelligently as you scroll or turn pages, and can be easily run for local testing.

---

## Project Structure

- `/backend`: Written in FastAPI (Python), utilizing SQLite as a local database. Supports parsing `.txt` files with regex and `.epub` files with `ebooklib` + `beautifulsoup4`.
- `/frontend`: Written in React (Vite, JS) and integrates the latest **Tailwind CSS v4** for high performance and a clean, modern design (dark mode, glassmorphism).

---

## Setup & Running Locally

### 1. System Requirements
- Python 3.10 or higher
- Node.js 18 or higher (to run the frontend using npm)

---

### 2. Backend Setup

Navigate to the `backend/` directory from your command line:

1. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   # On Windows (cmd / powershell):
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Launch the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The backend server will run at: [http://localhost:8000](http://localhost:8000)*
   *Swagger API documentation will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)*

---

### 3. Frontend Setup

Navigate to the `frontend/` directory from a new terminal window:

1. Install package dependencies:
   ```bash
   npm install
   ```

2. Start the Vite Dev Server:
   ```bash
   npm run dev
   ```
   *The website will run at: [http://localhost:5173](http://localhost:5173)*

*Note: The frontend has been configured with an automatic proxy forwarding requests for `/api` and `/static` to the backend server at port 8000.*

---

### ⚡ Quick Start Both Servers (Windows Only)

To avoid opening multiple terminal windows and changing directories manually, you can simply run the `run.bat` script at the root directory:

- Via **Command Prompt (cmd)** or double-clicking the `run.bat` file.
- Or running it inside **PowerShell / VS Code terminal**:
  ```powershell
  .\run.bat
  ```

This script will automatically:
1. Open a new cmd window running the FastAPI backend (`localhost:8000`).
2. Run the Vite frontend dev server (`localhost:5173 --host`) in the current terminal window.
