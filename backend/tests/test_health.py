from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)


def test_root():
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == settings.APP_NAME
    assert data["version"] == settings.APP_VERSION


def test_health_check():
    """Test health check endpoint."""
    response = client.get(f"{settings.API_V1_PREFIX}/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_liveness_check():
    """Test liveness check endpoint."""
    response = client.get(f"{settings.API_V1_PREFIX}/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"
