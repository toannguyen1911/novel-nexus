import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routers import stories, chapters, progress

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Novel-Nexus API",
    description="Backend API for reading novels (.txt) and e-books (.epub)",
    version="1.0.0"
)

# CORS configurations (allow Vite React default ports and generic setups)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    origins.extend([origin.strip() for origin in env_origins.split(",") if origin.strip()])


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads folder exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "covers"), exist_ok=True)

# Mount uploads directory to /static
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

# Include Routers
app.include_router(stories.router)
app.include_router(chapters.router)
app.include_router(progress.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Novel-Nexus API. Access /docs for swagger documentation."}
