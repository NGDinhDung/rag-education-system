from fastapi.testclient import TestClient
from app.main import app
from app.core.jwt import create_access_token
from app.database import SessionLocal
from app.models.user import User

client = TestClient(app)

def test_admin_settings():
    # 1. Tạo token cho admin (giả sử user id 1 là admin)
    db = SessionLocal()
    admin = db.query(User).filter(User.role == "admin").first()
    db.close()
    
    if not admin:
        print("Không tìm thấy admin user.")
        return
        
    token = create_access_token({"sub": str(admin.id)})
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Test GET /admin/settings/config
    print("Testing GET /admin/settings/config")
    response = client.get("/admin/settings/config", headers=headers)
    print("Status code:", response.status_code)
    print("Response JSON:", response.json() if response.status_code == 200 else response.text)

if __name__ == "__main__":
    test_admin_settings()
