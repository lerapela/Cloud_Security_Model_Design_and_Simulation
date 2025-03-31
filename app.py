from flask import Flask, render_template, redirect, url_for, session, request, jsonify
from vm_manager import VirtualBoxManager
from flask_wtf.csrf import CSRFProtect
from flask_wtf.csrf import generate_csrf
from firebase_service import db, auth
from datetime import timedelta
import logging
from firebase_admin import firestore
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import requests





app = Flask(__name__)

app.config.update(
    SESSION_COOKIE_SECURE=True,  # Only send cookies over HTTPS
    SESSION_COOKIE_HTTPONLY=True,  # Prevent JavaScript access to cookies
    SESSION_COOKIE_SAMESITE='Lax',  # CSRF protection
    PERMANENT_SESSION_LIFETIME=timedelta(minutes=30)  # Session timeout
)

@app.before_request
def make_session_permanent():
    session.permanent = True
vbox_manager = VirtualBoxManager()
app.secret_key = 'your-very-secret-key-here'
csrf = CSRFProtect(app)


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)

    return decorated_function


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_admin'):
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)

    return decorated_function


def approved_user_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_approved'):
            return redirect(url_for('pending_approval'))
        return f(*args, **kwargs)

    return decorated_function


# Add this new route
@app.route('/pending-approval')
def pending_approval():
    if session.get('authenticated') and session.get('is_approved'):
        return redirect(url_for('dashboard'))
    return render_template('pending_approval.html')

#login route
@app.route('/login', methods=['POST'])
def login():
    try:
        email = request.form.get('email')
        password = request.form.get('password')

        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required'}), 400

        # First check Firestore status
        user_ref = db.collection('users').where('email', '==', email).limit(1)
        user_docs = user_ref.get()

        if not user_docs:
            return jsonify({'success': False, 'error': 'Account not found or not approved'}), 404

        user_data = user_docs[0].to_dict()

        if user_data.get('status') != 'approved':
            return jsonify({'success': False, 'error': 'Account not yet approved'}), 403

        # Authenticate with Firebase
        FIREBASE_WEB_API_KEY = "AIzaSyDgoWpAxmM7S6e1kpw2hSqOw6aTo9tEVxg"
        rest_api_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_WEB_API_KEY}"

        response = requests.post(
            rest_api_url,
            json={
                'email': email,
                'password': password,
                'returnSecureToken': True
            }
        )
        response_data = response.json()

        if 'error' in response_data:
            error_msg = response_data['error'].get('message', 'Invalid credentials')
            return jsonify({'success': False, 'error': error_msg}), 401

        # Set session data
        is_admin = user_data.get('role') == 'admin'
        session.update({
            'user_email': email,
            'user_id': user_docs[0].id,
            'authenticated': True,
            'is_approved': True,
            'is_admin': is_admin,
            'firebase_id_token': response_data.get('idToken')
        })

        # Debug logging
        logger.info(f"User {email} logged in. Admin: {is_admin}")
        logger.info(f"Session data: {dict(session)}")

        # Determine redirect URL based on admin status
        redirect_url = url_for('admin_dashboard' if is_admin else 'dashboard')

        return jsonify({
            'success': True,
            'redirect': redirect_url,
            'is_admin': is_admin  # Add this for client-side verification
        })

    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/get-csrf-token', methods=['GET'])
def get_csrf_token():
    try:
        return jsonify({
            'success': True,
            'csrf_token': generate_csrf()
        })
    except Exception as e:
        logger.error(f"Error generating CSRF token: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate CSRF token'
        }), 500

@app.route('/')
def base():
    """Serve the main dashboard page"""
    return render_template('base.html')


@app.route('/dashboard')
@login_required
@approved_user_required
def dashboard():
    if not session.get('authenticated'):
        return redirect(url_for('login'))

    try:
        # Get user data from Firestore
        user_ref = db.collection('users').document(session['user_id'])
        user_doc = user_ref.get()
        user_data = user_doc.to_dict() if user_doc.exists else {}

        vms_response = get_vms()
        if vms_response.status_code != 200:
            raise Exception("Failed to fetch VM data")

        vms_data = vms_response.get_json()
        return render_template('dashboard.html',
                            user_data=user_data,
                            user_email=session['user_email'],
                            vms=vms_data.get('vms', []),
                            stats=vms_data.get('stats', {}))
    except Exception as e:
        logger.error(f"Dashboard error: {str(e)}")
        return render_template('error.html',
                            message="Dashboard loading failed"), 500


@app.route('/admin')
@login_required
@admin_required
def admin_dashboard():
    """Serve the admin dashboard page"""
    try:
        # Debug logging
        logger.info(f"Admin dashboard accessed by {session.get('user_email')}")
        logger.info(f"Session data: {dict(session)}")

        # Verify admin status again for safety
        if not session.get('is_admin'):
            logger.warning(f"Non-admin user {session.get('user_email')} attempted to access admin dashboard")
            return redirect(url_for('dashboard'))

        # Get user data from Firestore
        user_ref = db.collection('users').document(session['user_id'])
        user_doc = user_ref.get()
        user_data = user_doc.to_dict() if user_doc.exists else {}

        return render_template('admin.html',
                           user_email=session.get('user_email'),
                           user_data=user_data)

    except Exception as e:
        logger.error(f"Error in admin dashboard: {str(e)}")
        return redirect(url_for('logout'))








app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)

@app.route('/logout')
def logout():
    session.clear()
    return render_template('base.html')


@app.route('/register', methods=['POST'])
def register():
    try:
        password = request.form.get('password')
        if not password or len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400

        user_data = {
            'fullname': request.form.get('fullname'),
            'email': request.form.get('email'),
            'organization': request.form.get('organization', ''),
            'reason': request.form.get('reason'),
            'password': password,
            'status': 'pending',
            'created_at': firestore.SERVER_TIMESTAMP,
            'role': 'user'
        }

        # Validate other required fields
        if not all([user_data['fullname'], user_data['email'], user_data['reason']]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Check if email exists in pending or approved users
        email_ref = db.collection('pending_users').where('email', '==', user_data['email']).limit(1)
        if len(email_ref.get()) > 0:
            return jsonify({'error': 'Email already has a pending registration'}), 400

        email_ref = db.collection('users').where('email', '==', user_data['email']).limit(1)
        if len(email_ref.get()) > 0:
            return jsonify({'error': 'Email already registered'}), 400

        # Add to Firestore pending_users collection
        doc_ref = db.collection('pending_users').document()
        doc_ref.set(user_data)

        return jsonify({
            'success': True,
            'message': 'Registration submitted for admin approval'
        })

    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': str(e)}), 400


@app.route('/create-firebase-account', methods=['POST'])
def create_firebase_account():
    try:
        if not session.get('is_admin'):
            return jsonify({'error': 'Unauthorized'}), 403

        email = request.json['email']
        password = generate_random_password()  # Implement this function

        # Create Firebase Auth user
        user = auth.create_user(
            email=email,
            password=password,
            email_verified=False
        )

        # Send welcome email with credentials
        send_welcome_email(email, password)  # Implement this

        return jsonify({
            'success': True,
            'message': 'Account created successfully'
        })

    except Exception as e:
        logger.error(f"Error creating account: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/create-auth-account', methods=['POST'])
@admin_required
def create_auth_account():
    try:
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400

        data = request.get_json()
        email = data.get('email')
        password = data.get('password')  # The original password from registration
        user_id = data.get('user_id')

        if not all([email, password, user_id]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Create Firebase auth account with the original password
        try:
            user = auth.create_user(
                email=email,
                password=password,  # Use the original password
                email_verified=False
            )

            return jsonify({
                'success': True,
                'uid': user.uid
            })

        except Exception as auth_error:
            logger.error(f"Auth error: {str(auth_error)}")
            return jsonify({
                'error': 'Failed to create auth account',
                'details': str(auth_error)
            }), 400

    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/vms', methods=['GET'])
@login_required
@approved_user_required
def get_vms():
    """Get all VMs for the current user"""
    try:
        all_vms = vbox_manager.list_vms()

        # Filter VMs by owner
        user_vms = [vm for vm in all_vms if vm.get('owner_id') == session['user_id']]

        # Enhanced statistics calculation for user's VMs only
        stats = {
            'total': len(user_vms),
            'running': sum(1 for vm in user_vms if vm.get('state', '').lower() == 'running'),
            'stopped': sum(1 for vm in user_vms if vm.get('state', '').lower() in ('poweroff', 'saved')),
            'total_ram': sum(vm.get('ram', 0) for vm in user_vms),
            'total_cpu': sum(vm.get('cpu', 0) for vm in user_vms),
            'total_storage': sum(vm.get('storage', 0) for vm in user_vms)
        }

        # Process VM data for the dashboard
        enhanced_vms = []
        for vm in user_vms:
            enhanced_vms.append({
                'id': vm.get('id', ''),
                'name': vm.get('name', 'Unknown'),
                'state': vm.get('state', 'poweroff').lower(),
                'os': vm.get('ostype', 'Unknown').split('_')[0],
                'cpu': vm.get('cpu', 1),
                'ram': vm.get('ram', 1),
                'storage': vm.get('storage', 0),
                'vram': vm.get('vram', 128),
                'ip': vm.get('ip', 'N/A'),
                'owner_id': vm.get('owner_id', '')
            })

        return jsonify({
            "status": "success",
            "vms": enhanced_vms,
            "stats": stats
        })

    except Exception as e:
        logger.error(f"Error fetching VMs: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Failed to fetch VM data"
        }), 500


@app.route('/api/vms', methods=['POST'])
@csrf.exempt
@login_required
@approved_user_required
def create_vm():
    """Create a new VM"""
    try:
        # Ensure request is JSON
        if not request.is_json:
            return jsonify({
                "status": "error",
                "message": "Request must be JSON"
            }), 400

        data = request.get_json()
        if not data:
            return jsonify({
                "status": "error",
                "message": "No data provided"
            }), 400

        # Add owner information to VM data
        data['owner_id'] = session['user_id']
        data['owner_email'] = session['user_email']

        required = ['name', 'os', 'cpu', 'ram', 'storage']
        if not all(field in data for field in required):
            return jsonify({
                "status": "error",
                "message": f"Missing required fields: {required}"
            }), 400

        # Validate input values
        if not isinstance(data['cpu'], int) or data['cpu'] < 1:
            return jsonify({
                "status": "error",
                "message": "CPU must be a positive integer"
            }), 400

        if not isinstance(data['ram'], int) or data['ram'] < 1:
            return jsonify({
                "status": "error",
                "message": "RAM must be a positive integer (in GB)"
            }), 400

        if not isinstance(data['storage'], int) or data['storage'] < 20:
            return jsonify({
                "status": "error",
                "message": "Storage must be at least 20GB"
            }), 400

        # Create the VM
        result = vbox_manager.create_vm({
            'name': data['name'].strip(),
            'os': data['os'].lower(),
            'cpu': data['cpu'],
            'ram': data['ram'],
            'storage': data['storage'],
            'owner_id': data['owner_id'],
            'owner_email': data['owner_email']
        })

        if result['status'] == 'error':
            return jsonify(result), 400

        # Optionally start the VM
        if data.get('start_after_create', True):
            start_result = vbox_manager.start_vm(result['vm_id'])
            if start_result['status'] == 'error':
                logger.warning(f"VM created but failed to start: {start_result['message']}")
                result['warning'] = f"VM created but failed to start: {start_result['message']}"

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error creating VM: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)  # Include the actual error message
        }), 500


@app.route('/api/vms/<string:vm_id>/<action>', methods=['POST'])
@csrf.exempt  # Add this to bypass CSRF for API calls
@login_required
@approved_user_required
def vm_action(vm_id, action):
    """Perform actions on a VM (start/stop/delete)"""
    try:
        if action not in ('start', 'stop', 'delete', 'restart'):
            return jsonify({
                "status": "error",
                "message": "Invalid action. Valid actions: start, stop, restart, delete"
            }), 400

        if action == 'start':
            result = vbox_manager.start_vm(vm_id)
        elif action == 'stop':
            result = vbox_manager.stop_vm(vm_id)
        elif action == 'restart':
            # First stop, then start
            stop_result = vbox_manager.stop_vm(vm_id)
            if stop_result['status'] == 'error':
                return jsonify(stop_result), 400
            result = vbox_manager.start_vm(vm_id)
        elif action == 'delete':
            result = vbox_manager.delete_vm(vm_id)

        if result['status'] == 'error':
            return jsonify(result), 400

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error performing {action} on VM {vm_id}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Failed to {action} VM: {str(e)}"
        }), 500

@app.errorhandler(500)
def internal_error(error):
    try:
        return render_template('error.html',
                            message="An internal server error occurred"), 500
    except:
        # Ultimate fallback
        return "An internal server error occurred", 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)