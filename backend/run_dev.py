"""Dev: run the API on port 8000 with reload. Frontend runs separately with `npm run dev`."""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
