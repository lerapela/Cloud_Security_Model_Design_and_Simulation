import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, setDoc, deleteDoc,
  serverTimestamp, onSnapshot, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDgoWpAxmM7S6e1kpw2hSqOw6aTo9tEVxg",
  authDomain: "cloudvm-4ff20.firebaseapp.com",
  projectId: "cloudvm-4ff20",
  storageBucket: "cloudvm-4ff20.appspot.com",
  messagingSenderId: "92432368728",
  appId: "1:92432368728:web:113898378e3a8c50db362d",
  measurementId: "G-NBTRGTRX9S"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM Elements
const loadingSpinner = document.getElementById('loading-spinner');
const usersTableBody = document.querySelector('#users-table tbody');
const approvedUsersTableBody = document.querySelector('#approved-users-table tbody');
const approvedLoadingSpinner = document.getElementById('approved-loading-spinner');

// DataTable instances
let pendingUsersTable = null;
let approvedUsersTable = null;

// Main Functions
async function loadPendingUsers() {
  try {
    showLoading(loadingSpinner, true);
    usersTableBody.innerHTML = '';

    const querySnapshot = await getDocs(collection(db, "pending_users"));

    // Filter out invalid entries
    const validEntries = querySnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.email && data.email !== 'null' && data.email !== 'undefined';
    });

    if (validEntries.length === 0) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4">No valid pending requests</td>
        </tr>
      `;
      if ($.fn.DataTable.isDataTable('#users-table')) {
        pendingUsersTable.destroy();
      }
      return;
    }

    let tableContent = '';
    validEntries.forEach(doc => {
      const user = doc.data();
      const requestDate = user.created_at?.toDate?.() || new Date();

      tableContent += `
        <tr data-id="${doc.id}">
          <td>${doc.id.substring(0, 8)}...</td>
          <td>${user.fullname || 'N/A'}</td>
          <td>${user.email || 'N/A'}</td>
          <td>${user.organization || 'N/A'}</td>
          <td>${user.reason || 'No reason provided'}</td>
          <td>${requestDate.toLocaleString()}</td>
          <td>
            <button class="btn btn-success btn-sm approve-btn me-2">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn btn-danger btn-sm reject-btn">
              <i class="fas fa-times"></i> Reject
            </button>
          </td>
        </tr>
      `;
    });

    usersTableBody.innerHTML = tableContent;

    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#users-table')) {
      pendingUsersTable.destroy();
    }

    // Initialize new DataTable
    pendingUsersTable = $('#users-table').DataTable({
      responsive: true,
      columnDefs: [
        { targets: [6], orderable: false, searchable: false }
      ],
      initComplete: function() {
        // Add event listeners after table initialization
        document.querySelectorAll('.approve-btn').forEach(btn => {
          btn.addEventListener('click', approveUser);
        });
        document.querySelectorAll('.reject-btn').forEach(btn => {
          btn.addEventListener('click', rejectUser);
        });
      }
    });

  } catch (error) {
    console.error("Error loading users:", error);
    showAlert(`Error loading users: ${error.message}`, 'danger');
  } finally {
    showLoading(loadingSpinner, false);
  }
}

async function loadApprovedUsers() {
  try {
    showLoading(approvedLoadingSpinner, true);
    approvedUsersTableBody.innerHTML = '';

    const querySnapshot = await getDocs(collection(db, "users"));

    // Filter criteria - adjust these based on how you identify admin accounts
    const adminEmails = ['admin@cloudvm.com']; // Add all admin emails here
    const adminRoles = ['admin']; // Admin roles to filter out

    if (querySnapshot.empty) {
      approvedUsersTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4">No approved users found</td>
        </tr>
      `;
      if ($.fn.DataTable.isDataTable('#approved-users-table')) {
        approvedUsersTable.destroy();
      }
      return;
    }

    let tableContent = '';
    querySnapshot.forEach((doc) => {
      const user = doc.data();

      // Skip admin accounts
      if (adminEmails.includes(user.email)) return;
      if (adminRoles.includes(user.role)) return;

      const approvalDate = user.approved_at?.toDate?.() || new Date();

      tableContent += `
        <tr data-id="${doc.id}">
          <td>${doc.id.substring(0, 8)}...</td>
          <td>${user.fullname || 'N/A'}</td>
          <td>${user.email || 'N/A'}</td>
          <td>${user.organization || 'N/A'}</td>
          <td>${user.role || 'user'}</td>
          <td>${approvalDate.toLocaleString()}</td>
          <td>
            <button class="btn btn-danger btn-sm remove-btn">
              <i class="fas fa-trash"></i> Remove
            </button>
          </td>
        </tr>
      `;
    });

    approvedUsersTableBody.innerHTML = tableContent;

    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#approved-users-table')) {
      approvedUsersTable.destroy();
    }

    // Initialize new DataTable
    approvedUsersTable = $('#approved-users-table').DataTable({
      responsive: true,
      columnDefs: [
        { targets: [6], orderable: false, searchable: false }
      ],
      initComplete: function() {
        // Add event listeners after table initialization
        document.querySelectorAll('.remove-btn').forEach(btn => {
          btn.addEventListener('click', removeUser);
        });
      }
    });

  } catch (error) {
    console.error("Error loading approved users:", error);
    showAlert(`Error loading approved users: ${error.message}`, 'danger');
  } finally {
    showLoading(approvedLoadingSpinner, false);
  }
}



async function approveUser(e) {
    if (!confirm('Approve this user?')) return;

    const button = e.target;
    const row = e.target.closest('tr');
    const rowId = row.dataset.id;

    try {
        setButtonLoading(button, true);
        row.querySelector('.reject-btn').disabled = true;

        // First get a CSRF token
        const csrfResponse = await fetch('/get-csrf-token');
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData.csrf_token;

        const userRef = doc(db, "pending_users", rowId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            throw new Error('User document not found');
        }

        const userData = userDoc.data();
        const email = userData.email;
        const password = userData.password; // Get the original password (not hashed)

        // Create auth account through backend using the original password
        const response = await fetch('/create-auth-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                email: email,
                password: password, // Use the original password
                user_id: userDoc.id
            })
        });

        // Check response
        const responseContentType = response.headers.get('content-type');
        if (!responseContentType || !responseContentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Unexpected response: ${text.substring(0, 100)}`);
        }

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to create auth account');
        }

        // Proceed with approval
        await setDoc(doc(db, "users", userDoc.id), {
            fullname: userData.fullname,
            email: email,
            organization: userData.organization || '',
            reason: userData.reason,
            status: 'approved',
            approved_at: serverTimestamp(),
            role: userData.role || 'user',
            uid: result.uid
            // Don't store password or password_hash in Firestore
        });

        await deleteDoc(userRef);

        showAlert('User approved successfully!', 'success');
        await loadPendingUsers();
        await loadApprovedUsers();

    } catch (error) {
        console.error("Approval error:", error);
        showAlert(`Error: ${error.message}`, 'danger');
    } finally {
        setButtonLoading(button, false);
        if (row) {
            row.querySelector('.reject-btn').disabled = false;
        }
    }
}

// Add this helper function if you don't have it
function getCSRFToken() {
  const csrfToken = document.querySelector('input[name="csrf_token"]');
  return csrfToken ? csrfToken.value : '';
}



async function rejectUser(e) {
  if (!confirm('Reject this user?')) return;

  const row = e.target.closest('tr');
  const rowId = row.dataset.id;

  try {
    setButtonLoading(e.target, true);
    row.querySelector('.approve-btn').disabled = true;

    await deleteDoc(doc(db, "pending_users", rowId));
    showAlert('User rejected', 'warning');
    loadPendingUsers();

  } catch (error) {
    console.error("Error rejecting user:", error);
    showAlert(`Error: ${error.message}`, 'danger');
  }
}

async function removeUser(e) {
  if (!confirm('Remove this user? This action cannot be undone.')) return;

  const row = e.target.closest('tr');
  const rowId = row.dataset.id;

  try {
    setButtonLoading(e.target, true);

    // Delete from users collection
    await deleteDoc(doc(db, "users", rowId));

    showAlert('User removed successfully', 'warning');
    loadApprovedUsers();

  } catch (error) {
    console.error("Error removing user:", error);
    showAlert(`Error: ${error.message}`, 'danger');
  }
}

// Helper Functions
function generateRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  return Array.from({length: 12}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  document.getElementById('alerts-container').prepend(alertDiv);
  setTimeout(() => alertDiv.remove(), 5000);
}

function showLoading(spinnerElement, show) {
  if (spinnerElement) {
    spinnerElement.style.display = show ? 'block' : 'none';
  }
}

function setButtonLoading(button, isLoading) {
  if (button) {
    button.innerHTML = isLoading
      ? '<span class="spinner-border spinner-border-sm"></span>'
      : button.textContent;
    button.disabled = isLoading;
  }
}

// Real-time Listeners
function setupRealtimeListeners() {
  // Listen for changes in pending users
  onSnapshot(collection(db, "pending_users"), () => {
    loadPendingUsers();
  });

  // Listen for changes in approved users
  onSnapshot(collection(db, "users"), () => {
    loadApprovedUsers();
  });
}

// Initialize Admin Panel
function initAdminPanel() {
  document.querySelector('.logout-btn').addEventListener('click', () => {
    window.location.href = '/logout';
  });

  document.querySelector('.refresh-btn').addEventListener('click', () => {
    loadPendingUsers();
    loadApprovedUsers();
  });

  loadPendingUsers();
  loadApprovedUsers();
  setupRealtimeListeners();
}

// Start the admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', initAdminPanel);