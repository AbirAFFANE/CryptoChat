# 🔐 CryptoChat – Secure Messaging Web Application (AES-256-CBC)

## 📌 Overview
CryptoChat is a secure real-time web messaging application designed to ensure the confidentiality and privacy of digital communications.  
It implements **AES-256-CBC symmetric encryption** to protect messages and files before transmission. All sensitive data is encrypted locally on the client side, ensuring that only encrypted content passes through the server.

This project was developed as part of academic work in **Information Security and Secure Communication Systems**.

---

## 🎯 Problem Statement
Modern digital communication platforms face major challenges:  
- Confidentiality of exchanged data  
- Risk of interception  
- Data breaches  
- Unauthorized access  

**CryptoChat** addresses these issues by integrating strong cryptographic mechanisms into a full-stack web architecture.

---

## 🔐 Security Architecture

### Encryption Process
1. The user generates or enters a secret password.  
2. Messages and files are encrypted locally using **AES-256-CBC**.  
3. Only encrypted data is transmitted to the server.  
4. The recipient decrypts the content locally using the secret key.  

### Cryptographic Specifications
- **Algorithm:** AES (Advanced Encryption Standard)  
- **Key size:** 256-bit  
- **Mode:** CBC (Cipher Block Chaining)  
- **Random IV generation** for each encryption  
- **Password hashing:** Bcrypt  
- **Authentication:** JSON Web Token (JWT)  

> ⚠️ Note: AES-CBC ensures confidentiality but does not provide built-in integrity verification.

---

## 🚀 Core Features

### 🔒 Secure Text Messaging
- End-to-end encrypted messages  
- Secret-key based decryption  
- Edit and delete sent messages  

### 📁 Secure File Sharing
- AES-256-CBC encryption for Images, Videos, Documents  
- Secure file visualization after decryption  

### 📞 Encrypted Audio & Video Calls
- Real-time communication using WebRTC  
- Peer-to-peer encrypted calls  
- STUN/TURN server integration  

### 👤 Profile & Contact Management
- Secure authentication system  
- Profile modification  
- Group conversations  
- Admin dashboard for system supervision  

---

## 🗄 Database Architecture
**MongoDB (NoSQL document-oriented database)**

**Main Collections:**
- **Users:** email, passwordHash, publicKey, creationDate  
- **Messages:** senderId, receiverId, encryptedContent, IV, timestamp, fileType (optional)  
- **Conversations:** members, type (private/group)  

MongoDB was chosen for **flexibility, scalability, and efficient storage** of encrypted data and metadata.

---

## 🏗 System Modeling
The system design includes:  
- UML Use Case Diagrams  
- Class Diagrams  
- Sequence Diagrams  
- Flowcharts  

Models represent interactions between **Users, Administrator, Server, and Database**.

---

## 🛠 Technologies Used

**Backend:** Node.js, Express.js, MongoDB + Mongoose, Socket.IO, Crypto (Node.js), Bcrypt, JWT, Multer, CORS  
**Frontend:** HTML5, CSS3, JavaScript, Web Crypto API, Socket.IO Client, WebRTC, SimplePeer, MediaRecorder API, Fetch API  
**Infrastructure:** Local server (http://localhost:3000), MongoDB local instance, STUN/TURN servers for WebRTC

---

## 📷 Application Interfaces
- Login Page  
- Registration Page  
- Secure Chat Interface  
- Profile Page  
- Admin Dashboard  
- Real-time Call Interface  

---

## 🔒 Security Considerations
- Secret keys are **never stored on the server**  
- Messages remain **encrypted during transmission**  
- Passwords are hashed using **Bcrypt**  
- JWT-based authentication protects API routes  
- IV is generated for each encryption operation  

---

## 📈 Future Improvements
- Add HMAC for integrity verification  
- Implement authenticated encryption (AES-GCM)  
- Implement secure key exchange protocol  
- Cloud deployment  
- Enhanced scalability  

---
---

## 🚀 How to Run the Project

1. Clone the repository:
   git clone https://github.com/AbirAFFANE/CryptoChat.git
   
3. Install dependencies:
   npm install

4. Create a `.env` file and configure environment variables if needed.

5. Start the server:
   npm start

6. Open your browser and go to:
   http://localhost:3000

## 👩‍💻 Author
**Abir Affane**  
Computer Science Student  
Interested in Cybersecurity, Secure Systems & Distributed Architectures
