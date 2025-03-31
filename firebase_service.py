import firebase_admin
from firebase_admin import credentials, auth, firestore

def initialize_firebase():
    # Initialize Firebase with the credentials file
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_app = firebase_admin.initialize_app(cred)
    db = firestore.client()
    return db

def verify_login(email, password):
    try:
        # Check if email and password are valid using Firebase Authentication
        user = auth.get_user_by_email(email)
        # You can compare the password if you have Firebase Authentication rules set up
        # Firebase doesn't allow direct password checks, but you could implement custom verification here
        # For now, we'll assume the password check happens elsewhere (e.g., in your frontend app or via custom authentication)
        return user
    except auth.AuthError as e:
        # If there is an error (user not found, invalid credentials, etc.)
        print(f"Login failed: {str(e)}")
        return None

# Initialize Firebase and get db instance
db = initialize_firebase()
