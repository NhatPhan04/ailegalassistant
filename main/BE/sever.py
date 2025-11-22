import os
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import PlainTextResponse

from typing import Optional, List

# Import Class Orchestrator từ file chính của bạn (ví dụ tên file là test.py)
# Lưu ý: File chứa class LegalOrchestrator nên đổi tên thành 'core_engine.py' để import cho chuẩn
from test import LegalOrchestrator 

app = FastAPI(title="AI Legal Assistant API")

# Cấu hình CORS cho Frontend (Vite/React thường chạy port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo AI Engine 1 lần duy nhất
ai_engine = LegalOrchestrator()

# --- DATA MODELS ---
class ChatRequest(BaseModel):
    query: str
    file_path: Optional[str] = None
    history: Optional[List[dict]] = []

# --- ENDPOINTS ---

@app.post("/chat", response_class=PlainTextResponse)
async def chat_endpoint(req: ChatRequest):
    """
    API nhận câu hỏi và trả về câu trả lời pháp lý (markdown thuần).
    """
    try:
        response_text = ai_engine.process(req.query, req.file_path)
        # Trả về text/plain, KHÔNG JSON-encode nữa
        return response_text
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    API upload file hợp đồng để phân tích.
    """
    try:
        upload_dir = "contracts"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_location = f"{upload_dir}/{file.filename}"
        
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"file_path": file_location, "message": "Upload thành công"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Chạy server: uvicorn server:app --reload
if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting API Server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)