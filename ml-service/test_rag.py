import requests
import json

URL = "http://localhost:8000/retrieve-hint"

def test_normal():
    print("Testing Normal Retrieval...")
    payload = {
      "sessionId": "S001",
      "pairId": "P001",
      "predictedState": "LOGIC_STRUGGLE",
      "interventionType": "LOGIC_HINT",
      "questionConceptTags": ["arrays", "loops"],
      "recentErrorContext": "index out of bounds error while looping through array",
      "recentCodeSnippet": "for (int i = 0; i <= numbers.length; i++)"
    }
    try:
        response = requests.post(URL, json=payload)
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Error: {e}")

def test_fallback():
    print("\nTesting Fallback Retrieval...")
    payload = {
      "sessionId": "S001",
      "pairId": "P001",
      "predictedState": "LOGIC_STRUGGLE",
      "interventionType": "LOGIC_HINT",
      "questionConceptTags": [],
      "recentErrorContext": "",
      "recentCodeSnippet": ""
    }
    try:
        response = requests.post(URL, json=payload)
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_normal()
    test_fallback()
