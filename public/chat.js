document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  if (!token || !userId) {
    alert("يجب تسجيل الدخول أولاً.");
    window.location.href = "login.html";
    return;
  }

  const socket = io("http://localhost:3000", {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  const messageInput = document.getElementById("message-input");
  const sendButton = document.getElementById("send-button");
  const messagesContainer = document.getElementById("messages");
  const chatList = document.getElementById("chat-list");
  const chatPartner = document.getElementById("chat-partner");
  const chatPartnerAvatar = document.querySelector(".chat-header img");
  const searchInput = document.querySelector(".search-bar");
  const searchButton = document.querySelector(".search-icon");
  const photoButton = document.getElementById("photo-button");
  const photoInput = document.getElementById("photo-input");
  const imagePreview = document.getElementById("image-preview");
  const previewImg = document.getElementById("preview-img");
  const cancelImage = document.getElementById("cancel-image");
  const attachButton = document.getElementById("attach-button");
  const fileInput = document.getElementById("file-input");
  const filePreview = document.getElementById("file-preview");
  const fileNameSpan = document.getElementById("file-name");
  const cancelFile = document.getElementById("cancel-file");
  const recordButton = document.getElementById("record-button");
  const voicePreview = document.getElementById("voice-preview");
  const voicePlayback = document.getElementById("voice-playback");
  const cancelVoice = document.getElementById("cancel-voice");
  const blockButton = document.querySelector(".btn-block");
  const menuButton = document.querySelector(".btn-menu");
  const dropdownMenu = document.querySelector(".dropdown-menu");
  const backToDashboard = document.getElementById("back-to-dashboard");

  const startAudioCallButton = document.getElementById("start-audio-call");
  const startVideoCallButton = document.getElementById("start-video-call");
  const endCallButton = document.getElementById("end-call");
  const videoContainer = document.getElementById("video-container");
  const localVideo = document.getElementById("local-video");
  const remoteVideo = document.getElementById("remote-video");

  let allConversations = [];
  let selectedImage = null;
  let selectedFile = null;
  let selectedVoice = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  let peer = null;
  let localStream = null;
  let remoteStream = null;
  let isCalling = false;
  let currentCallTarget = null;
  let callActive = false;
  let isEndingCall = false;

  // استخدام العناصر الموجودة في chat.html
  const passwordModal = document.getElementById('password-modal');
  const passwordInput = document.getElementById('password-input');
  const submitPassword = document.getElementById('submit-password');
  const cancelPassword = document.getElementById('cancel-password');

  let currentMessageElement = null;

  // إعدادات التشفير باستخدام Web Crypto API
  const ALGORITHM = 'AES-CBC';
  const IV_LENGTH = 16;

  // تحويل النص إلى ArrayBuffer
  function strToArrayBuffer(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
  }

  // تحويل ArrayBuffer إلى نص
  function arrayBufferToStr(buffer) {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
  }

  // تحويل مفتاح إلى CryptoKey
  async function getCryptoKey(key) {
    const keyBuffer = strToArrayBuffer(key.padEnd(32, '0').slice(0, 32)); // مفتاح 32 بايت لـ AES-256
    return await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: ALGORITHM },
      false,
      ["encrypt", "decrypt"]
    );
  }

  // دالة تشفير الرسائل باستخدام Web Crypto API
  async function encryptMessage(text, encryptionKey) {
    try {
      const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
      const key = await getCryptoKey(encryptionKey);
      const encodedText = strToArrayBuffer(text);
      const encrypted = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv: iv },
        key,
        encodedText
      );
      const ivHex = Array.from(iv)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const encryptedHex = Array.from(new Uint8Array(encrypted))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return ivHex + ':' + encryptedHex;
    } catch (err) {
      console.error("❌ خطأ في التشفير:", err);
      throw new Error("فشل في تشفير الرسالة");
    }
  }

  // دالة فك تشفير الرسائل باستخدام Web Crypto API
  async function decryptMessage(encryptedText, encryptionKey) {
    try {
      const [ivHex, encryptedHex] = encryptedText.split(':');
      if (!ivHex || !encryptedHex) throw new Error("تنسيق النص المشفر غير صحيح");
      const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      const encrypted = new Uint8Array(encryptedHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      const key = await getCryptoKey(encryptionKey);
      const decrypted = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv: iv },
        key,
        encrypted
      );
      return arrayBufferToStr(decrypted);
    } catch (err) {
      console.error("❌ خطأ في فك التشفير:", err);
      throw new Error("فشل في فك تشفير الرسالة");
    }
  }

  socket.on("connect", () => {
    console.log("✅ متصل بالخادم");
    socket.emit("join", token);
  });

  socket.on("reconnect", (attempt) => {
    console.log("🔄 إعادة الاتصال بالخادم، المحاولة رقم:", attempt);
    socket.emit("join", token);
  });

  socket.on("reconnect_error", (error) => {
    console.error("❌ فشل في إعادة الاتصال:", error);
    alert("فشل في إعادة الاتصال بالخادم. تحقق من الشبكة وحاول مرة أخرى.");
  });

  socket.on("receive-message", ({ senderId, message, image, file, voice }) => {
    displayMessage(message, image, file, voice, true, null, null, senderId);
    loadConversations();
  });

  socket.on("error", ({ message }) => {
    console.error("❌ خطأ من الخادم:", message);
    if (message === "المستخدم المستهدف غير متصل.") {
      alert("المستخدم غير متصل حاليًا. حاول مرة أخرى لاحقًا.");
      endCall();
    } else {
      alert(message);
    }
  });

  socket.on("call-offer", async (data) => {
    if (data.target !== userId) return;
    console.log("📞 تلقيت عرض مكالمة من:", data.sender);
    if (isCalling || callActive) {
      console.log("🚫 أنت بالفعل في مكالمة، رفض العرض");
      socket.emit("end-call", { target: data.sender, sender: userId });
      return;
    }
    if (confirm(`مكالمة ${data.video ? "فيديو" : "صوتية"} واردة من ${data.senderName}. هل تريد قبولها؟`)) {
      try {
        currentCallTarget = data.sender;
        await startCall(false, data.video, data.sender);
        if (peer) peer.signal(data.offer);
        console.log("✅ تم قبول المكالمة");
      } catch (err) {
        console.error("❌ فشل في قبول المكالمة:", err);
        alert("فشل في قبول المكالمة: " + err.message);
        endCall();
      }
    } else {
      socket.emit("end-call", { target: data.sender, sender: userId });
      console.log("🚫 تم رفض المكالمة");
    }
  });

  socket.on("call-answer", (data) => {
    if (data.target !== userId || !callActive) return;
    console.log("📞 تلقيت إجابة مكالمة من:", data.sender);
    if (peer) {
      peer.signal(data.answer);
    } else {
      console.error("❌ لا يوجد peer لتطبيق الإجابة");
      endCall();
    }
  });

  socket.on("ice-candidate", (data) => {
    if (data.target !== userId || !callActive) return;
    console.log("📡 تلقيت ICE candidate من:", data.sender, "Candidate:", JSON.stringify(data.candidate));
    if (peer && data.candidate && typeof data.candidate === 'object' && data.candidate.candidate && data.candidate.sdpMid !== undefined && data.candidate.sdpMLineIndex !== undefined) {
      try {
        const candidateInit = new RTCIceCandidate({
          candidate: data.candidate.candidate,
          sdpMid: data.candidate.sdpMid,
          sdpMLineIndex: data.candidate.sdpMLineIndex
        });
        peer.signal(candidateInit);
      } catch (err) {
        console.error("❌ فشل في معالجة مرشح ICE:", err, "Candidate:", JSON.stringify(data.candidate));
      }
    } else {
      console.error("❌ مرشح ICE غير صالح:", JSON.stringify(data.candidate));
    }
  });

  socket.on("end-call", (data) => {
    if (data.target !== userId) return;
    console.log("📴 تلقيت طلب إنهاء المكالمة من:", data.sender);
    endCall();
  });

  socket.on("disconnect", () => {
    console.log("🔌 انقطع الاتصال بالخادم");
    endCall();
  });

  async function startCall(initiator, videoEnabled, targetId, retryCount = 0) {
    const maxRetries = 3;
    if (isCalling || callActive) {
      alert("أنت بالفعل في مكالمة!");
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioAvailable = devices.some(device => device.kind === "audioinput" && device.deviceId);
    const videoAvailable = videoEnabled ? devices.some(device => device.kind === "videoinput" && device.deviceId) : true;
    if (!audioAvailable || !videoAvailable) {
      console.error("❌ لا توجد أجهزة متاحة:", { audioAvailable, videoAvailable });
      alert("لا توجد أجهزة صوت أو فيديو متاحة. تحقق من إعدادات الأجهزة.");
      return;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      localStream = null;
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      remoteStream = null;
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;

    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
      const testStream = await navigator.mediaDevices.getUserMedia({ video: videoEnabled ? true : false, audio: true });
      testStream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error("❌ الأجهزة غير متاحة:", err);
      if (retryCount < maxRetries && (err.name === "NotReadableError" || err.name === "OverconstrainedError")) {
        console.log(`🔄 إعادة المحاولة ${retryCount + 1}/${maxRetries} بعد فشل الوصول إلى الأجهزة`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return startCall(initiator, videoEnabled, targetId, retryCount + 1);
      }
      alert("الكاميرا أو الميكروفون غير متاح. أغلق التطبيقات الأخرى، أعد تشغيل المتصفح، أو تحقق من إعدادات الأجهزة.");
      return;
    }

    try {
      console.log("📞 جارٍ بدء المكالمة... initiator:", initiator, "videoEnabled:", videoEnabled, "targetId:", targetId);
      localStream = await navigator.mediaDevices.getUserMedia({ video: videoEnabled, audio: true });
      localVideo.srcObject = localStream;
      console.log("✅ تم الوصول إلى الكاميرا/الميكروفون بنجاح");

      peer = new SimplePeer({
        initiator: initiator,
        stream: localStream,
        trickle: true,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
            {
              urls: "turn:openrelay.metered.ca:443",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
            {
              urls: "turn:relay1.express-turn.com:3478",
              username: "user",
              credential: "pass",
            },
          ],
        },
      });

      peer.on("signal", (data) => {
        if (!callActive) return;
        console.log("📡 إشارة WebRTC:", data);
        if (data.type === "offer" && initiator) {
          socket.emit("call-offer", {
            offer: data,
            target: targetId,
            sender: userId,
            senderName: "أنت",
            video: videoEnabled,
          });
        } else if (data.type === "answer" && !initiator) {
          socket.emit("call-answer", { answer: data, target: targetId, sender: userId });
        } else if (data.candidate && typeof data.candidate === 'object' && data.candidate.candidate && data.candidate.sdpMid !== undefined && data.candidate.sdpMLineIndex !== undefined) {
          socket.emit("ice-candidate", { candidate: data.candidate, target: targetId, sender: userId });
        } else {
          console.error("❌ مرشح ICE غير صالح تم تجاهله:", data.candidate);
        }
      });

      peer.on("stream", (stream) => {
        console.log("📹 تلقيت تدفق الفيديو/الصوت البعيد:", stream);
        remoteStream = stream;
        remoteVideo.srcObject = remoteStream;
        videoContainer.style.display = "flex";
        startAudioCallButton.style.display = "none";
        startVideoCallButton.style.display = "none";
        endCallButton.style.display = "inline-block";
      });

      peer.on("connect", () => {
        console.log("✅ تم الاتصال بنجاح بين الطرفين!");
        alert("تم الاتصال بالمكالمة بنجاح!");
      });

      peer.on("iceConnectionStateChange", () => {
        console.log("🔄 حالة اتصال ICE:", peer.iceConnectionState);
        if (peer.iceConnectionState === "disconnected" || peer.iceConnectionState === "failed") {
          console.error("❌ فشل في اتصال WebRTC");
          alert("فشل في الاتصال بالمكالمة. تحقق من الشبكة أو حاول مرة أخرى.");
          endCall();
        }
      });

      peer.on("error", (err) => {
        console.error("❌ خطأ في WebRTC:", err);
        alert("خطأ في المكالمة: " + err.message);
        endCall();
      });

      peer.on("close", () => {
        console.log("📴 تم إغلاق الاتصال");
        endCall();
      });

      isCalling = true;
      callActive = true;
      console.log("📞 المكالمة نشطة الآن");

    } catch (err) {
      console.error("❌ خطأ في بدء المكالمة:", err);
      alert("فشل في بدء المكالمة. تحقق من إذن الكاميرا والميكروفون: " + err.message);
      if (peer) {
        peer.destroy();
        peer = null;
      }
      endCall();
    }
  }

  function endCall() {
    if (!isCalling && !callActive || isEndingCall) return;
    isEndingCall = true;
    console.log("📴 جارٍ إنهاء المكالمة...");
    callActive = false;
    isCalling = false;
    if (peer) {
      peer.destroy();
      peer = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      localStream = null;
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      remoteStream = null;
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    videoContainer.style.display = "none";
    startAudioCallButton.style.display = "inline-block";
    startVideoCallButton.style.display = "inline-block";
    endCallButton.style.display = "none";

    if (currentCallTarget) {
      socket.emit("end-call", { target: currentCallTarget, sender: userId });
      currentCallTarget = null;
    }
    isEndingCall = false;

    setTimeout(() => {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(testStream => {
          console.log("🔄 تم إعادة تعيين الأجهزة بنجاح");
          testStream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
          console.log("🔄 إعادة تعيين الأجهزة لم تنجح:", err);
        });
    }, 2000);
  }

  startAudioCallButton.addEventListener("click", () => {
    const targetId = allConversations.find(c => c._id === localStorage.getItem("currentConversation"))
      ?.participants.find(p => p._id !== userId)?._id;
    if (targetId) {
      currentCallTarget = targetId;
      startCall(true, false, targetId);
    } else {
      alert("يرجى اختيار محادثة أولاً.");
    }
  });

  startVideoCallButton.addEventListener("click", () => {
    const targetId = allConversations.find(c => c._id === localStorage.getItem("currentConversation"))
      ?.participants.find(p => p._id !== userId)?._id;
    if (targetId) {
      currentCallTarget = targetId;
      startCall(true, true, targetId);
    } else {
      alert("يرجى اختيار محادثة أولاً.");
    }
  });

  endCallButton.addEventListener("click", () => {
    endCall();
  });

  async function loadConversations(filter = "") {
    try {
      const res = await fetch("http://localhost:3000/conversations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("فشل في جلب المحادثات");
      const conversations = await res.json();
      allConversations = conversations;
      chatList.innerHTML = "";

      const filteredConversations = conversations.filter((conv) => {
        const otherParticipants = conv.participants.filter((p) => p._id !== userId);
        const name = conv.groupName || (otherParticipants.length > 0 ? otherParticipants[0].name : "");
        return name.toLowerCase().includes(filter.toLowerCase());
      });

      for (const conv of filteredConversations) {
        const otherParticipants = conv.participants.filter((p) => p._id !== userId);
        const displayName = conv.groupName || (otherParticipants.length > 0 ? otherParticipants[0].name : "محادثة فارغة");
        const isGroup = conv.groupName !== undefined;

        const messagesRes = await fetch(
          `http://localhost:3000/messages/${conv._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const messages = await messagesRes.json();
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

        const div = document.createElement("div");
        div.className = `chat-item ${
          conv._id === localStorage.getItem("currentConversation") ? "active" : ""
        }`;
        div.dataset.chatId = conv._id;
        div.innerHTML = `
          <img src="${
            isGroup ? "group-icon.png" : (otherParticipants[0] && otherParticipants[0].profilePicture ? otherParticipants[0].profilePicture : "default-profile.png")
          }" alt="User" onerror="this.src='default-profile.png';">
          <div class="chat-info">
            <h4>${isGroup ? `👥 ${displayName}` : displayName}</h4>
            <p>${lastMessage ? (lastMessage.text || (lastMessage.image ? "[صورة]" : lastMessage.file ? "[ملف]" : lastMessage.voice ? "[رسالة صوتية]" : "لا توجد رسائل بعد")) : "لا توجد رسائل بعد"}</p>
          </div>
        `;
        div.addEventListener("click", () => {
          localStorage.setItem("currentConversation", conv._id);
          localStorage.setItem("chatWith", conv.groupName || (otherParticipants.length > 0 ? otherParticipants[0].email : ""));
          localStorage.setItem("isGroup", isGroup ? "true" : "false");
          loadChatPartner();
          loadMessages();
          document.querySelectorAll(".chat-item").forEach((item) => {
            item.classList.remove("active");
          });
          div.classList.add("active");
        });
        chatList.appendChild(div);
      }
    } catch (err) {
      console.error("❌ خطأ في جلب المحادثات:", err);
      alert("خطأ في جلب المحادثات");
    }
  }

  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.trim();
    loadConversations(searchTerm);
  });

  searchButton.addEventListener("click", () => {
    const searchTerm = searchInput.value.trim();
    loadConversations(searchTerm);
  });

  async function loadMessages() {
    const conversationId = localStorage.getItem("currentConversation");
    if (!conversationId) return;
    messagesContainer.innerHTML = "";
    try {
      const res = await fetch(
        `http://localhost:3000/messages/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error("فشل في جلب الرسائل");
      const messages = await res.json();
      messages.forEach((msg) => {
        displayMessage(msg.text, msg.image, msg.file, msg.voice, msg.sender._id !== userId, msg.createdAt, msg._id, msg.sender._id);
      });
    } catch (err) {
      console.error("❌ خطأ في جلب الرسائل:", err);
    }
  }

  function displayMessage(text, image, file, voice, isReceived, createdAt, messageId, senderId) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", isReceived ? "received" : "sent");
    messageElement.dataset.messageId = messageId || "";
    messageElement.dataset.senderId = senderId || "";
    const time = createdAt
      ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const conversation = allConversations.find(c => c._id === localStorage.getItem("currentConversation"));
    const sender = conversation?.participants.find(p => p._id === senderId);
    const senderName = sender ? sender.name : "Utilisateur inconnu";

    let content = '';
    if (text) {
      content += `
        <strong>${senderName}:</strong>
        <span class="encrypted-text">${text}</span>
      `;
    }
    if (image) content += `<strong>${senderName}:</strong> <img src="${image}" alt="Image" style="max-width: 200px; max-height: 200px; display: block; margin-top: 5px;" onerror="this.src='default-profile.png';"/>`;
    if (file) {
      const fileName = file.split('/').pop();
      content += `<strong>${senderName}:</strong> <a href="${file}" download="${fileName}" class="file-link">[ملف: ${fileName}]</a>`;
    }
    if (voice) {
      content += `<strong>${senderName}:</strong> <audio controls class="voice-message"><source src="${voice}" type="audio/wav"></audio>`;
    }

    messageElement.innerHTML = `
      <div class="message-content">
        ${content}
        <span class="message-time">${time}</span>
      </div>
      ${text ? '<button class="decrypt-btn">فك التشفير</button>' : ''}
    `;

    if (!isReceived) {
      messageElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!messageElement.dataset.messageId) {
          console.log('❌ معرف الرسالة غير موجود');
          alert('لا يمكن تحديد الرسالة.');
          return;
        }

        const contextMenu = document.createElement('div');
        contextMenu.style.position = 'absolute';
        contextMenu.style.background = '#333';
        contextMenu.style.border = '1px solid #fff';
        contextMenu.style.padding = '5px';
        contextMenu.style.zIndex = '1000';
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.innerHTML = `
          <button class="edit-btn" style="display: block; width: 100%; margin-bottom: 5px; background: #007bff; color: white; border: none; padding: 5px;">تعديل</button>
          <button class="delete-btn" style="display: block; width: 100%; background: #ff4444; color: white; border: none; padding: 5px;">حذف</button>
        `;

        document.body.appendChild(contextMenu);

        contextMenu.querySelector('.edit-btn').addEventListener('click', () => {
          const newText = prompt('أدخل النص الجديد:', text || '');
          if (newText) editMessage(messageElement, newText);
          document.body.removeChild(contextMenu);
        });

        contextMenu.querySelector('.delete-btn').addEventListener('click', () => {
          if (confirm('هل أنت متأكد أنك تريد حذف هذه الرسالة؟')) deleteMessage(messageElement);
          document.body.removeChild(contextMenu);
        });

        document.addEventListener('click', () => {
          if (contextMenu.parentNode) document.body.removeChild(contextMenu);
        }, { once: true });
      });
    }

    if (text) {
      const decryptBtn = messageElement.querySelector('.decrypt-btn');
      if (decryptBtn) {
        decryptBtn.addEventListener('click', () => {
          console.log("🔍 النقر على زر فك التشفير");
          currentMessageElement = messageElement;
          passwordModal.style.display = 'flex';
        });
      }
    }

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function deleteMessage(messageElement) {
    const messageId = messageElement.dataset.messageId;
    if (!messageId) {
      console.log('❌ معرف الرسالة غير موجود');
      alert('لا يمكن تحديد الرسالة.');
      return;
    }
    try {
      const res = await fetch(`http://localhost:3000/messages/${messageId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) {
        const errorData = await res.json();
        console.log('❌ استجابة الخادم:', errorData.message);
        throw new Error(errorData.message || 'فشل في حذف الرسالة');
      }
      alert('تم حذف الرسالة بنجاح!');
      messageElement.remove();
      loadMessages();
    } catch (err) {
      console.error('❌ خطأ في حذف الرسالة:', err.message);
      alert('حدث خطأ أثناء حذف الرسالة: ' + err.message);
    }
  }

  async function editMessage(messageElement, newText) {
    const messageId = messageElement.dataset.messageId;
    if (!messageId) {
      console.log('❌ معرف الرسالة غير موجود');
      alert('لا يمكن تحديد الرسالة.');
      return;
    }
    try {
      const conversation = allConversations.find(c => c._id === localStorage.getItem("currentConversation"));
      const encryptedText = await encryptMessage(newText, conversation.encryptionKey || "default-key");
      const res = await fetch(`http://localhost:3000/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text: encryptedText }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.log('❌ استجابة الخادم:', errorData.message);
        throw new Error(errorData.message || 'فشل في تعديل الرسالة');
      }
      alert('تم تعديل الرسالة بنجاح!');
      loadMessages();
    } catch (err) {
      console.error('❌ خطأ في تعديل الرسالة:', err.message);
      alert('حدث خطأ أثناء تعديل الرسالة: ' + err.message);
    }
  }

  async function loadChatPartner() {
    const isGroup = localStorage.getItem("isGroup") === "true";
    const chatWith = localStorage.getItem("chatWith");
    if (!chatWith) {
      chatPartner.textContent = "اختر محادثة";
      chatPartnerAvatar.src = "default-profile.png";
      return;
    }

    if (isGroup) {
      chatPartner.textContent = `👥 ${chatWith}`;
      chatPartnerAvatar.src = "group-icon.png";
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: chatWith }),
      });
      if (!res.ok) throw new Error("فشل في جلب بيانات الشريك");
      const data = await res.json();
      chatPartner.textContent = data.name || "مستخدم غير معروف";
      chatPartnerAvatar.src = data.profilePicture || "default-profile.png";
    } catch (err) {
      console.error("❌ خطأ في جلب بيانات الشريك:", err);
      chatPartner.textContent = "خطأ في جلب الاسم";
      chatPartnerAvatar.src = "default-profile.png";
    }
  }

  photoButton.addEventListener("click", () => photoInput.click());
  photoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        selectedImage = event.target.result;
        previewImg.src = selectedImage;
        imagePreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });

  cancelImage.addEventListener("click", () => {
    selectedImage = null;
    imagePreview.style.display = "none";
    photoInput.value = "";
  });

  attachButton.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      selectedFile = file;
      fileNameSpan.textContent = file.name;
      filePreview.style.display = "block";
    }
  });

  cancelFile.addEventListener("click", () => {
    selectedFile = null;
    filePreview.style.display = "none";
    fileInput.value = "";
  });

  recordButton.addEventListener("click", async () => {
    if (isRecording) {
      mediaRecorder.stop();
      recordButton.textContent = "🎤";
      isRecording = false;
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          selectedVoice = audioBlob;
          const audioUrl = URL.createObjectURL(audioBlob);
          voicePlayback.src = audioUrl;
          voicePreview.style.display = "block";
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        recordButton.textContent = "⏹️";
        isRecording = true;
      } catch (err) {
        console.error("❌ خطأ في تسجيل الصوت:", err);
        alert("فشل في تسجيل الصوت. تحقق من إذن الميكروفون.");
      }
    }
  });

  cancelVoice.addEventListener("click", () => {
    selectedVoice = null;
    voicePreview.style.display = "none";
    voicePlayback.src = "";
  });

  blockButton.addEventListener("click", () => {
    if (confirm("هل أنت متأكد أنك تريد حظر هذا المستخدم؟")) {
      alert("ميزة الحظر لم تُنفذ بعد.");
    }
  });

  sendButton.addEventListener("click", async () => {
    const message = messageInput.value.trim();
    const conversationId = localStorage.getItem("currentConversation");
    const isGroup = localStorage.getItem("isGroup") === "true";

    if (!conversationId) {
      alert("يرجى اختيار محادثة أولاً.");
      return;
    }

    if (!message && !selectedImage && !selectedFile && !selectedVoice) {
      alert("يرجى إدخال رسالة أو اختيار صورة أو ملف أو تسجيل صوتي.");
      return;
    }

    try {
      const conversation = allConversations.find(c => c._id === conversationId);
      if (!conversation) throw new Error("المحادثة غير موجودة");

      const receiverIds = conversation.participants
        .map(p => p._id)
        .filter(id => id !== userId);

      const formData = new FormData();
      formData.append("conversationId", conversationId);
      if (message) {
        const encryptedText = await encryptMessage(message, conversation.encryptionKey || "default-key");
        formData.append("text", encryptedText);
      }
      if (selectedImage) formData.append("image", selectedImage);
      if (selectedFile) formData.append("file", selectedFile);
      if (selectedVoice) formData.append("voice", selectedVoice, "voice-message.wav");

      const msgRes = await fetch("http://localhost:3000/messages", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      if (!msgRes.ok) {
        const errorData = await msgRes.json();
        throw new Error(errorData.message || "فشل في إرسال الرسالة");
      }
      const msgData = await msgRes.json();
      const messageId = msgData.messageId;

      const voiceUrl = selectedVoice ? (await fetch(`http://localhost:3000/messages/${conversationId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(res => res.json())).find(msg => msg._id === messageId)?.voice : null;

      socket.emit("send-message", {
        senderId: userId,
        receiverIds,
        message: message ? await encryptMessage(message, conversation.encryptionKey || "default-key") : null,
        image: selectedImage || null,
        file: selectedFile ? (await fetch(`http://localhost:3000/messages/${conversationId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        }).then(res => res.json())).find(msg => msg._id === messageId)?.file : null,
        voice: voiceUrl || null
      });

      displayMessage(message ? await encryptMessage(message, conversation.encryptionKey || "default-key") : null, selectedImage, selectedFile ? (await fetch(`http://localhost:3000/messages/${conversationId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(res => res.json())).find(msg => msg._id === messageId)?.file : null, voiceUrl, false, null, messageId, userId);
      messageInput.value = "";
      selectedImage = null;
      selectedFile = null;
      selectedVoice = null;
      imagePreview.style.display = "none";
      filePreview.style.display = "none";
      voicePreview.style.display = "none";
      voicePlayback.src = "";
      photoInput.value = "";
      fileInput.value = "";
      loadConversations();
    } catch (err) {
      console.error("❌ خطأ في إرسال الرسالة:", err.message);
      alert("حدث خطأ أثناء إرسال الرسالة: " + err.message);
    }
  });

  if (menuButton && dropdownMenu) {
    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      dropdownMenu.classList.toggle("active");
    });
    document.addEventListener("click", (event) => {
      if (!menuButton.contains(event.target) && !dropdownMenu.contains(event.target)) dropdownMenu.classList.remove("active");
    });

    const deleteConversationBtn = document.createElement('button');
    deleteConversationBtn.className = 'btn-delete-conversation';
    deleteConversationBtn.textContent = '🗑️ حذف المحادثة';
    deleteConversationBtn.setAttribute("aria-label", "حذف المحادثة");
    deleteConversationBtn.addEventListener('click', async () => {
      const conversationId = localStorage.getItem('currentConversation');
      if (!conversationId) {
        alert('يرجى اختيار محادثة أولاً.');
        return;
      }
      if (confirm('هل أنت متأكد أنك تريد حذف هذه المحادثة؟')) {
        try {
          const res = await fetch(`http://localhost:3000/conversations/${conversationId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('فشل في حذف المحادثة');
          alert('تم حذف المحادثة بنجاح!');
          localStorage.removeItem('currentConversation');
          localStorage.removeItem('chatWith');
          localStorage.removeItem('isGroup');
          loadConversations();
          chatPartner.textContent = 'اختر محادثة';
          chatPartnerAvatar.src = 'default-profile.png';
          messagesContainer.innerHTML = '';
        } catch (err) {
          console.error('❌ خطأ في حذف المحادثة:', err.message);
          alert('حدث خطأ أثناء حذف المحادثة: ' + err.message);
        }
      }
    });
    dropdownMenu.appendChild(deleteConversationBtn);
  }

  backToDashboard.addEventListener("click", () => {
    localStorage.removeItem("currentConversation");
    window.location.href = "dashboard.html";
  });

  // التأكد من وجود الأزرار وإضافة مستمعي الأحداث
  if (submitPassword && cancelPassword && passwordInput) {
    console.log("✅ الأزرار موجودة، جارٍ تعيين مستمعي الأحداث");

    submitPassword.addEventListener('click', async () => {
      console.log("🔍 النقر على زر إرسال");
      const password = passwordInput.value.trim();
      if (!password) {
        alert('يرجى إدخال كلمة المرور.');
        return;
      }

      try {
        console.log("📤 إرسال طلب التحقق من كلمة المرور...");
        const response = await fetch('http://localhost:3000/verify-password', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });

        console.log('📥 استجابة الخادم:', response.status, response.statusText);
        const result = await response.json();
        console.log('📊 نتيجة التحقق:', result);

        if (result.success) {
          console.log("✅ كلمة المرور صحيحة، جارٍ فك تشفير الرسالة...");
          const conversation = allConversations.find(c => c._id === localStorage.getItem("currentConversation"));
          if (!conversation) throw new Error("المحادثة غير موجودة");

          const messageContent = currentMessageElement.querySelector('.message-content');
          const encryptedText = messageContent.querySelector('.encrypted-text')?.textContent;

          if (encryptedText) {
            const decrypted = await decryptMessage(encryptedText, conversation.encryptionKey || "default-key");
            messageContent.innerHTML = `
              <strong>${conversation.participants.find(p => p._id === (currentMessageElement.classList.contains('sent') ? userId : currentMessageElement.dataset.senderId))?.name || "Utilisateur inconnu"}:</strong>
              <span class="decrypted-text">${decrypted}</span>
              <span class="message-time">${messageContent.querySelector('.message-time').textContent}</span>
            `;
            const btn = messageContent.parentElement.querySelector('.decrypt-btn');
            btn.classList.remove('decrypt-btn');
            btn.classList.add('encrypt-btn');
            btn.textContent = 'chiffrer';

            // إضافة مستمع جديد لزر التشفير
            btn.addEventListener('click', async () => {
              const decryptedText = messageContent.querySelector('.decrypted-text')?.textContent;
              if (decryptedText) {
                const encrypted = await encryptMessage(decryptedText, conversation.encryptionKey || "default-key");
                messageContent.innerHTML = `
                  <strong>${conversation.participants.find(p => p._id === (currentMessageElement.classList.contains('sent') ? userId : currentMessageElement.dataset.senderId))?.name || "Utilisateur inconnu"}:</strong>
                  <span class="encrypted-text">${encrypted}</span>
                  <span class="message-time">${messageContent.querySelector('.message-time').textContent}</span>
                `;
                const reBtn = messageContent.parentElement.querySelector('.encrypt-btn');
                reBtn.classList.remove('encrypt-btn');
                reBtn.classList.add('decrypt-btn');
                reBtn.textContent = 'déchiffrer ';
              }
            });
          }

          passwordModal.style.display = 'none';
          passwordInput.value = '';
        } else {
          alert('كلمة المرور غير صحيحة.');
        }
      } catch (err) {
        console.error('❌ خطأ في التحقق من كلمة المرور أو فك التشفير:', err);
        alert('حدث خطأ أثناء التحقق من كلمة المرور أو فك التشفير: ' + err.message);
      }
    });

    cancelPassword.addEventListener('click', () => {
      console.log("🔍 النقر على زر إلغاء");
      passwordModal.style.display = 'none';
      passwordInput.value = '';
    });
  } else {
    console.error('❌ لم يتم العثور على عناصر submitPassword أو cancelPassword أو passwordInput');
  }

  loadConversations();
  loadChatPartner();
  loadMessages();
});