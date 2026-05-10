import pandas as pd
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load env from api/.env
load_dotenv('../api/.env')

MONGODB_URI = os.getenv('MONGODB_URI')
DB_NAME = 'pairprogramming_ml'

def export_to_csv():
    if not MONGODB_URI:
        print("[ERROR] MONGODB_URI not found")
        return

    client = MongoClient(MONGODB_URI)
    
    # Note: In our seeder we used 'pairprogramming_ml' db and 'ml_events' collection
    db = client['pairprogramming_ml']
    collection = db['ml_events']
    
    # Fetch all events with features
    events = list(collection.find({"features": {"$exists": True}}))
    print(f"[INFO] Fetched {len(events)} events from MongoDB")
    
    if not events:
        print("[ERROR] No events found to export")
        return

    rows = []
    for e in events:
        row = e['features']
        row['session_id'] = e['sessionId']
        row['label'] = e['prediction']['predictedState']
        rows.append(row)
    
    df = pd.DataFrame(rows)
    
    output_path = 'data/extracted/pair_state_features_mongodb.csv'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[SUCCESS] Exported to {output_path}")

if __name__ == "__main__":
    export_to_csv()
