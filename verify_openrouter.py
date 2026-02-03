import requests
import json
import time

def verify_openrouter():
    url = "https://openrouter.ai/api/v1/chat/completions"
    api_key = "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"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Verification Script"
    }
    
    data = {
        "model": "google/gemini-2.5-flash-lite",
        "messages": [
            {"role": "user", "content": "Hello, are you working?"}
        ]
    }
    
    print(f"Sending request to {url}...")
    start_time = time.time()
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        end_time = time.time()
        print(f"Request took: {end_time - start_time:.2f}s")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("Success!")
            print("Response:", json.dumps(response.json(), indent=2))
        else:
            print("Failed!")
            print("Response Text:", response.text)
            
    except Exception as e:
        print(f"Exception occurred: {str(e)}")

if __name__ == "__main__":
    verify_openrouter()
