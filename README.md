<div align="center">
  <img height="150" src="https://media.giphy.com/media/jTNG3RF6EwbkpD4LZx/giphy.gif" alt="cloud security animation" />
  <h1>Cloud Security VM Manager</h1>
  
  <img src="https://img.shields.io/badge/Python-3.8+-blue?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Flask-2.0-lightgrey?logo=flask&logoColor=black" />
  <img src="https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-orange?logo=firebase" />
  <img src="https://img.shields.io/badge/VirtualBox-6.1+-blueviolet?logo=virtualbox" />
  <img src="https://img.shields.io/badge/Bootstrap-5.2-purple?logo=bootstrap" />
</div>



<h2 align="center">🌩️ Secure Multi-Tenant VM Management System</h2>

<p align="center">A security-hardened platform for isolated VM provisioning with role-based access control and breach simulation capabilities.</p>

###

<h3>🚀 Key Features</h3>

- **Approval Workflow** - Admin-controlled user onboarding
- **VM Isolation** - VirtualBox-hosted secure environments
- **OS Templates** - Pre-configured Debian/Windows/Ubuntu
- **Breach Simulation** - Built-in security testing endpoints
- **Live Monitoring** - Resource usage tracking




<div align="center">
  <!-- First Row -->
  <div>
    <img width="45%" src="https://github.com/user-attachments/assets/4376e436-7544-4f8e-9e7c-45c3df26d6f4" style="margin:10px" />
    <img width="45%" src="https://github.com/user-attachments/assets/cefd0d3b-e1a2-4310-8c75-e476344d2ca9" style="margin:10px" />
  </div>
  
  <!-- Second Row -->
  <div>
    <img width="45%" src="https://github.com/user-attachments/assets/89208f69-46e7-46ce-a321-cc153330b796" style="margin:10px" />
    <img width="45%" src="https://github.com/user-attachments/assets/8e84a20a-8142-48a8-89f1-0a8b53210194" style="margin:10px" />
  </div>
</div>




<h4>Follow follow instructions to use the app</h4>


A simple app that allows users to borrow virtual machines (VMs) on demand.  
It manages VM provisioning and access using VirtualBox and Firebase for authentication and data storage.

---

## Follow the instructions below to set up and run the app locally:

### 1. Clone the Repository

You can clone the project using Git. Using PyCharm is recommended for ease of automatic virtual environment creation.

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```
### 2. Install Dependencies
Make sure your pip is up to date, then install required Python packages:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```
### 3. Setup Environment Variables
Create a .env file in the root directory of the project and add your Firebase and other environment variables. Example .env content:

```bash
FIREBASE_API_KEY=A.................Vxg
FIREBASE_AUTH_DOMAIN=example.firebaseapp.com
FIREBASE_PROJECT_ID=example-4ff20
FIREBASE_STORAGE_BUCKET=example-4ff20.appspot.com
FIREBASE_MESSAGING_SENDER_ID=92......28
FIREBASE_APP_ID=1:92.......28:web:113898..........362d
FIREBASE_MEASUREMENT_ID=G-NB....S
```

### 4. Add Your Firebase Service Account Key
Place your Firebase serviceAccountKey.json file in the root of the project directory.
Important: This file is sensitive and should not be committed to Git. The .gitignore already excludes it.

### 5. Configure Admin User in Firebase

Manually add your admin user account in Firebase Authentication and Firestore.
For example, an admin email could be:
```bash
admin@cloudvm.com
```

### 6. Prepare Your Local Machine

Ensure VirtualBox is installed and properly configured on your machine.

Make sure you have the required ISO files stored locally, for example:
```bash
C:\ISOs\ubuntu-24.04.1-desktop-amd64.iso
C:\ISOs\kali-linux-2024.3-installer-amd64.iso
C:\ISOs\Win10_22H2_English_x64v1.iso
```

### 7. Run the Application

