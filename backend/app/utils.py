from datetime import datetime

def format_doc(doc_dict):
    """
    Converts a dictionary (from Firestore) to a JSON-serializable dict.
    Handles datetime objects by converting them to ISO strings.
    """
    if not doc_dict:
        return {}
    
    data = doc_dict.copy()
    for key, value in data.items():
        if isinstance(value, datetime):
            data[key] = value.isoformat()
        # Handle Firestore Sentinels (like SERVER_TIMESTAMP) which are not JSON serializable
        elif hasattr(value, '__class__') and value.__class__.__name__ == 'Sentinel':
            # Replace with current time estimate or None. 
            # For 'createdAt', current time is a good enough proxy for the immediate response.
            data[key] = datetime.utcnow().isoformat() + 'Z'
    return data
