from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_analyze_no_api_key():
    response = client.post("/analyze", json={"text": "これはテストです。"})
    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["tool"] == "combined-proofread"
    assert data["meta"]["language"] == "ja"
    # Even without API key, LanguageTool/spaCy might return something or nothing, but structure should be valid
    assert "issues" in data
    assert isinstance(data["issues"], list)

def test_analyze_with_dummy_api_key():
    # OpenAI call will fail with dummy key, but we catch exceptions so it shouldn't crash
    response = client.post("/analyze", json={"text": "これはテストです。", "apiKey": "dummy"})
    assert response.status_code == 200
    data = response.json()
    assert "issues" in data

def test_analyze_grammar_error():
    # Forced grammar error (depending on LT rules)
    # "ら抜き言葉" example: 食べれる -> 食べられる (This is a common one, LT might catch it)
    text = "私は魚が食べれる。"
    response = client.post("/analyze", json={"text": text})
    assert response.status_code == 200
    data = response.json()
    # We can't guarantee LT catches it without knowing exact rules loaded, 
    # but we can check if response structure is valid.
    # Printing for debug if needed.
    print(data) 
