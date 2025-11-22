import streamlit as st
import requests

# Cấu hình API và UI
API_URL = "http://localhost:8000"  # Backend FastAPI của bạn

# --- Cấu hình Trang (Page Configuration) ---
# Sử dụng emoji, layout rộng rãi hơn để hiển thị nội dung tốt hơn
st.set_page_config(
    page_title="🤖 Trợ Lý Pháp Lý AI",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# --- Tiêu đề Chính (Header) ---
st.markdown(
    """
    <style>
    .stApp {
        background-color: #f0f2f6; /* Màu nền nhẹ nhàng */
    }
    .stButton>button {
        background-color: #004d99; /* Màu xanh đậm cho nút chính */
        color: white;
        border-radius: 8px;
        padding: 10px 20px;
        font-weight: bold;
    }
    .stButton>button:hover {
        background-color: #007bff; /* Thay đổi màu khi di chuột */
    }
    .main-title {
        text-align: center;
        color: #004d99;
        font-size: 2.5em;
        margin-bottom: 0.5em;
    }
    .stTextInput>div>div>input {
        border-radius: 8px;
        border: 1px solid #ccc;
        padding: 12px;
    }
    </style>
    """,
    unsafe_allow_html=True
)

st.markdown('<p class="main-title">⚖️ Trợ Lý Pháp Lý AI – Giao Diện Demo</p>', unsafe_allow_html=True)
st.markdown("---")


# --- Layout Chia Cột ---
# Chia giao diện thành 2 cột để có bố cục sạch sẽ hơn
col1, col2 = st.columns([1, 1])

# ================================
# 1) Ô chat đơn giản (Cột 1)
# ================================
with col1:
    st.header("💬 Hỗ Trợ Hỏi Đáp Pháp Lý Nhanh")
    st.info("Nhập câu hỏi pháp lý của bạn và nhận phản hồi tức thì từ AI. **Ví dụ:** *Quy định về hợp đồng lao động mới nhất là gì?*")

    query = st.text_input("Nhập câu hỏi pháp lý của bạn tại đây:", key="chat_input_key")

    if st.button("🚀 Gửi Câu Hỏi & Nhận Tư Vấn"):
        if not query:
            st.warning("⚠️ Vui lòng nhập câu hỏi pháp lý để bắt đầu!")
        else:
            with st.spinner("Đang xử lý câu hỏi... AI đang tìm kiếm thông tin..."):
                try:
                    res = requests.post(f"{API_URL}/chat", json={"query": query})
                    if res.status_code == 200:
                        st.success("✨ Phản hồi của AI:")
                        # Hiển thị nội dung bằng st.markdown cho định dạng tốt hơn
                        st.markdown(res.text)
                    else:
                        st.error(f"❌ Lỗi API (Mã {res.status_code}): Không thể kết nối hoặc xử lý yêu cầu. Chi tiết: {res.text}")
                except requests.exceptions.ConnectionError:
                    st.error(f"❌ Lỗi Kết Nối: Không thể kết nối đến backend FastAPI tại địa chỉ {API_URL}. Vui lòng kiểm tra server!")

    # Thêm một Expander để hiển thị ví dụ
    with st.expander("💡 Gợi ý Chủ đề Pháp lý"):
        st.markdown(
            """
            * Luật Hợp đồng
            * Luật Lao động
            * Luật Đất đai
            * Quyền sở hữu trí tuệ
            """
        )

# ================================
# 2) Upload hợp đồng (Cột 2)
# ================================
with col2:
    st.header("📝 Phân Tích & Rà Soát Tài Liệu")
    st.warning("Hiện tại chỉ hỗ trợ phân tích các tài liệu **.docx**.")

    uploaded = st.file_uploader("📂 Tải file Hợp đồng/Tài liệu (.docx) lên đây:", type=["docx"])

    if uploaded:
        # --- Quá trình Upload ---
        with st.spinner("Đang tải file lên server..."):
            try:
                files = {"file": (uploaded.name, uploaded.getvalue())}
                resp = requests.post(f"{API_URL}/upload", files=files)

                if resp.status_code == 200:
                    file_path = resp.json().get("file_path")
                    st.success(f"✅ Upload thành công! File đã sẵn sàng để phân tích.")

                    # --- Quá trình Phân tích ---
                    if st.button("🔍 Bắt Đầu Phân Tích Hợp Đồng"):
                        with st.spinner("🧠 AI đang đọc và phân tích hợp đồng... Vui lòng đợi trong giây lát."):
                            data = {
                                "query": f"Phân tích chuyên sâu hợp đồng: {uploaded.name}", # Cung cấp thêm context cho AI
                                "file_path": file_path
                            }
                            result = requests.post(f"{API_URL}/chat", json=data)

                            if result.status_code == 200:
                                st.subheader("📊 Kết Quả Phân Tích từ AI")
                                st.markdown(result.text)
                            else:
                                st.error(f"❌ Lỗi Phân Tích API (Mã {result.status_code}): {result.text}")
                else:
                    st.error(f"❌ Lỗi Upload API (Mã {resp.status_code}): {resp.text}")

            except requests.exceptions.ConnectionError:
                st.error(f"❌ Lỗi Kết Nối: Không thể kết nối đến backend FastAPI tại địa chỉ {API_URL}. Vui lòng kiểm tra server!")

# ================================
# 3) Footer
# ================================
st.markdown("---")
st.caption("🛠️ Giao diện demo được xây dựng bằng Streamlit. Backend hỗ trợ bởi FastAPI/AI Legal Model.")
st.caption("Lưu ý: Đây chỉ là công cụ hỗ trợ và không thay thế cho tư vấn pháp lý chuyên nghiệp.")