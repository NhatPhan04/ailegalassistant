import os
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles  # <--- Mới thêm
from fastapi.responses import PlainTextResponse, FileResponse

from typing import Optional, List

# Import Class Orchestrator từ file chính của bạn (ví dụ tên file là test.py)
# Lưu ý: File chứa class LegalOrchestrator nên đổi tên thành 'core_engine.py' để import cho chuẩn
from test import LegalOrchestrator 


# Mount thư mục static để load css/js nếu file html có link tới


app = FastAPI(title="AI Legal Assistant API")

import pathlib
BASE_DIR = pathlib.Path(__file__).resolve().parent
print("Process CWD:", os.getcwd())
print("BASE_DIR (file location):", BASE_DIR)
print("Static dir exists:", (BASE_DIR / "static").exists())

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

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

@app.get("/")
async def read_index():
    """
    Route trang chủ: Trả về file index.html khi truy cập http://localhost:8000/
    """
    # Đường dẫn tới file index.html nằm trong thư mục static
    file_path = BASE_DIR / "static" / "index.html"
    
    if os.path.exists(file_path):
        return FileResponse(file_path)
    else:
        return PlainTextResponse("Chưa tìm thấy file static/index.html. Vui lòng tạo thư mục 'static' và copy file index.html vào đó.")

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