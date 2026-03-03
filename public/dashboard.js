document.addEventListener("DOMContentLoaded", () => {
  // Vérification de l'authentification
  const token = localStorage.getItem("token")
  const userId = localStorage.getItem("userId")
  if (!token || !userId) {
    alert("Vous devez vous connecter pour accéder à cette page.")
    window.location.href = "login.html"
    return
  }

  // Éléments DOM
  const usernameDisplay = document.getElementById("username-display")
  const chatList = document.getElementById("chat-list")
  const newChatBtn = document.querySelector(".new-chat-btn")
  const newGroupBtn = document.querySelector(".new-group-btn")
  const newChatModal = document.getElementById("new-chat-modal")
  const newGroupModal = document.getElementById("new-group-modal")
  const startChatBtn = document.getElementById("start-chat-btn")
  const cancelChatBtn = document.getElementById("cancel-chat-btn")
  const cancelChatBtnAlt = document.getElementById("cancel-chat-btn-alt")
  const createGroupBtn = document.getElementById("create-group-btn")
  const cancelGroupBtn = document.getElementById("cancel-group-btn")
  const cancelGroupBtnAlt = document.getElementById("cancel-group-btn-alt")
  const newChatEmail = document.getElementById("new-chat-email")
  const groupName = document.getElementById("group-name")
  const groupParticipantEmails = document.getElementById("group-participant-emails")
  const logoutBtn = document.getElementById("logout-btn")
  const searchInput = document.querySelector("#search-input")
  const profilePic = document.querySelector(".profile-pic")
  const sidebarNav = document.getElementById("sidebar-nav")
  const mobileMenuBtn = document.getElementById("mobile-menu-btn")
  const mobileCloseBtn = document.getElementById("mobile-close")
  const mobileOverlay = document.getElementById("mobile-overlay")
  const sidebar = document.querySelector(".sidebar")
  const modalOverlays = document.querySelectorAll(".modal-overlay")

  let allConversations = []

  // Fonctions pour la gestion du menu mobile
  function openMobileMenu() {
    sidebar.classList.add("active")
    mobileOverlay.classList.add("active")
    document.body.style.overflow = "hidden"
  }

  function closeMobileMenu() {
    sidebar.classList.remove("active")
    mobileOverlay.classList.remove("active")
    document.body.style.overflow = ""
  }

  // Événements pour le menu mobile
  mobileMenuBtn.addEventListener("click", openMobileMenu)
  mobileCloseBtn.addEventListener("click", closeMobileMenu)
  mobileOverlay.addEventListener("click", closeMobileMenu)

  // Afficher le nom d'utilisateur et la photo de profil
  async function displayUsername() {
    try {
      const res = await fetch("http://localhost:3000/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) throw new Error("Échec du chargement du profil")

      const data = await res.json()
      const user = data.user

      usernameDisplay.textContent = user.name

      if (user.profilePicture) {
        profilePic.src = user.profilePicture
      } else {
        profilePic.src = "default-profile.png"
      }

      // Ajouter le lien admin si nécessaire
      if (user.email === "ferdousadmin@gmail.com") {
        const adminLink = document.createElement("li")
        adminLink.className = "nav-item"
        adminLink.innerHTML = `
          <a href="admin.html">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Panel Admin</span>
          </a>
        `
        sidebarNav.appendChild(adminLink)
      }
    } catch (err) {
      console.error("Erreur lors du chargement du profil:", err)
      showNotification("Erreur lors du chargement du profil", "error")
    }
  }

  // Charger les conversations
  async function loadConversations(filter = "") {
    try {
      const res = await fetch("http://localhost:3000/conversations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) throw new Error("Échec du chargement des conversations")

      const conversations = await res.json()
      allConversations = conversations
      chatList.innerHTML = ""

      const filteredConversations = conversations.filter((conv) => {
        const otherParticipants = conv.participants.filter((p) => p._id !== userId)
        const name = conv.groupName || (otherParticipants.length > 0 ? otherParticipants[0].name : "")
        return name.toLowerCase().includes(filter.toLowerCase())
      })

      // Ajouter un délai pour l'animation
      for (let i = 0; i < filteredConversations.length; i++) {
        const conv = filteredConversations[i]
        const otherParticipants = conv.participants.filter((p) => p._id !== userId)
        const isGroup = conv.groupName !== undefined
        const displayName = isGroup
          ? conv.groupName
          : otherParticipants.length > 0
            ? otherParticipants[0].name
            : "Conversation vide"

        try {
          const messagesRes = await fetch(`http://localhost:3000/messages/${conv._id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (!messagesRes.ok) throw new Error("Échec du chargement des messages")

          const messages = await messagesRes.json()
          const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null

          const timeString = lastMessage ? formatMessageTime(new Date(lastMessage.createdAt)) : ""

          const li = document.createElement("li")
          li.className = "chat-item"

          // Vérifier si c'est une nouvelle conversation (moins de 5 minutes)
          if (lastMessage && isRecentMessage(new Date(lastMessage.createdAt))) {
            li.classList.add("new-message")
          }

          li.innerHTML = `
            <img src="${
              isGroup
                ? "group-icon.png"
                : otherParticipants[0] && otherParticipants[0].profilePicture
                  ? otherParticipants[0].profilePicture
                  : "default-profile.png"
            }" alt="${displayName}" class="chat-avatar">
            <div class="chat-info">
              <h3>${isGroup ? "👥 " + displayName : displayName}</h3>
              <p>${lastMessage ? truncateText(lastMessage.text, 50) : "Pas de messages"}</p>
            </div>
            <span class="chat-time">${timeString}</span>
          `

          li.addEventListener("click", () => {
            localStorage.setItem("currentConversation", conv._id)
            localStorage.setItem(
              "chatWith",
              isGroup ? conv.groupName : otherParticipants.length > 0 ? otherParticipants[0].email : "",
            )
            localStorage.setItem("isGroup", isGroup ? "true" : "false")
            window.location.href = "chat.html"
          })

          chatList.appendChild(li)
        } catch (err) {
          console.error("Erreur lors du chargement des messages:", err)
          showNotification("Erreur lors du chargement des messages", "error")
        }
      }

      // Afficher un message si aucune conversation n'est trouvée
      if (filteredConversations.length === 0) {
        const emptyState = document.createElement("div")
        emptyState.className = "empty-state"
        emptyState.innerHTML = `
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.4183 16.9706 20 12 20C10.4607 20 9.01172 19.6565 7.74467 19.0511L3 20L4.39499 16.28C3.51156 15.0423 3 13.5743 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3>Aucune conversation trouvée</h3>
          <p>${filter ? "Essayez une autre recherche" : "Commencez une nouvelle conversation"}</p>
        `
        chatList.appendChild(emptyState)
      }
    } catch (err) {
      console.error("Erreur lors du chargement des conversations:", err)
      showNotification("Erreur lors du chargement des conversations", "error")
    }
  }

  // Fonctions utilitaires
  function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text
  }

  function formatMessageTime(date) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date >= today) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (date >= yesterday) {
      return "Hier"
    } else {
      return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" })
    }
  }

  function isRecentMessage(date) {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000)
    return date >= fiveMinutesAgo
  }

  // Fonction pour afficher des notifications
  function showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.className = `notification ${type}`
    notification.innerHTML = `
      <div class="notification-content">
        <span>${message}</span>
      </div>
    `

    document.body.appendChild(notification)

    // Animation d'entrée
    setTimeout(() => {
      notification.classList.add("show")
    }, 10)

    // Disparition après 3 secondes
    setTimeout(() => {
      notification.classList.remove("show")
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 300)
    }, 3000)
  }

  // Événements pour la recherche
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.trim()
    loadConversations(searchTerm)
  })

  // Événements pour les modals
  function openModal(modal) {
    modal.classList.add("active")
    document.body.style.overflow = "hidden"
  }

  function closeModal(modal) {
    modal.classList.remove("active")
    document.body.style.overflow = ""
  }

  newChatBtn.addEventListener("click", () => openModal(newChatModal))
  newGroupBtn.addEventListener("click", () => openModal(newGroupModal))

  cancelChatBtn.addEventListener("click", () => closeModal(newChatModal))
  cancelChatBtnAlt.addEventListener("click", () => closeModal(newChatModal))

  cancelGroupBtn.addEventListener("click", () => closeModal(newGroupModal))
  cancelGroupBtnAlt.addEventListener("click", () => closeModal(newGroupModal))

  modalOverlays.forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        const modal = e.target.closest(".modal")
        closeModal(modal)
      }
    })
  })

  // Créer une nouvelle conversation
  startChatBtn.addEventListener("click", async () => {
    const email = newChatEmail.value.trim()
    if (!email) {
      showNotification("Veuillez entrer une adresse e-mail", "error")
      newChatEmail.classList.add("error")
      setTimeout(() => newChatEmail.classList.remove("error"), 1000)
      return
    }

    // Afficher l'état de chargement
    startChatBtn.disabled = true
    startChatBtn.innerHTML = `
      <div class="loading-spinner"></div>
      <span>Création...</span>
    `

    try {
      const res = await fetch("http://localhost:3000/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) throw new Error("Utilisateur non trouvé")

      const data = await res.json()

      const convRes = await fetch("http://localhost:3000/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user1Id: userId, user2Id: data.userId }),
      })

      if (!convRes.ok) throw new Error("Échec de la création de la conversation")

      const convData = await convRes.json()

      localStorage.setItem("currentConversation", convData.conversation._id)
      localStorage.setItem("chatWith", email)
      localStorage.setItem("isGroup", "false")

      closeModal(newChatModal)
      newChatEmail.value = ""

      showNotification("Conversation créée avec succès", "success")

      setTimeout(() => {
        window.location.href = "chat.html"
      }, 500)
    } catch (err) {
      console.error("Erreur lors de la création de la conversation:", err)
      showNotification("Erreur: " + err.message, "error")

      // Réinitialiser le bouton
      startChatBtn.disabled = false
      startChatBtn.innerHTML = `<span>Commencer</span>`
    }
  })

  // Créer un nouveau groupe
  createGroupBtn.addEventListener("click", async () => {
    const groupNameValue = groupName.value.trim()
    const participantEmails = groupParticipantEmails.value.trim()

    if (!groupNameValue) {
      showNotification("Veuillez entrer un nom de groupe", "error")
      groupName.classList.add("error")
      setTimeout(() => groupName.classList.remove("error"), 1000)
      return
    }

    if (!participantEmails) {
      showNotification("Veuillez entrer au moins un participant", "error")
      groupParticipantEmails.classList.add("error")
      setTimeout(() => groupParticipantEmails.classList.remove("error"), 1000)
      return
    }

    // Afficher l'état de chargement
    createGroupBtn.disabled = true
    createGroupBtn.innerHTML = `
      <div class="loading-spinner"></div>
      <span>Création...</span>
    `

    const emails = participantEmails.split(",").map((email) => email.trim())

    try {
      const participantIds = []
      for (const email of emails) {
        const res = await fetch("http://localhost:3000/user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email }),
        })

        if (!res.ok) throw new Error(`Utilisateur non trouvé: ${email}`)

        const data = await res.json()
        participantIds.push(data.userId)
      }

      // Ajouter l'utilisateur actuel comme participant
      participantIds.push(userId)

      const res = await fetch("http://localhost:3000/group-conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          participantIds,
          groupName: groupNameValue,
        }),
      })

      if (!res.ok) throw new Error("Échec de la création du groupe")

      showNotification("Groupe créé avec succès", "success")

      closeModal(newGroupModal)
      groupName.value = ""
      groupParticipantEmails.value = ""

      loadConversations()
    } catch (err) {
      console.error("Erreur lors de la création du groupe:", err)
      showNotification("Erreur: " + err.message, "error")
    } finally {
      // Réinitialiser le bouton
      createGroupBtn.disabled = false
      createGroupBtn.innerHTML = `<span>Créer le groupe</span>`
    }
  })

  // Événement de déconnexion
  logoutBtn.addEventListener("click", () => {
    // Animation de déconnexion
    document.body.classList.add("logging-out")

    showNotification("Déconnexion en cours...", "info")

    setTimeout(() => {
      localStorage.removeItem("token")
      localStorage.removeItem("userId")
      window.location.href = "login.html"
    }, 1000)
  })

  // Événement pour la photo de profil
  profilePic.addEventListener("click", () => {
    window.location.href = "profile.html"
  })

  // Initialisation
  displayUsername()
  loadConversations()

  // Ajouter des styles pour les notifications et animations
  const style = document.createElement("style")
  style.textContent = `
    .notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: var(--radius);
      background-color: var(--card);
      color: var(--card-foreground);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      transform: translateY(20px);
      opacity: 0;
      transition: all 0.3s ease;
    }
    
    .notification.show {
      transform: translateY(0);
      opacity: 1;
    }
    
    .notification.success {
      border-left: 4px solid var(--accent);
    }
    
    .notification.error {
      border-left: 4px solid #ef4444;
    }
    
    .notification.info {
      border-left: 4px solid var(--primary);
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      text-align: center;
      color: var(--card-foreground);
      opacity: 0.7;
    }
    
    .empty-icon {
      width: 48px;
      height: 48px;
      margin-bottom: 1rem;
      color: var(--card-foreground);
      opacity: 0.5;
    }
    
    .empty-state h3 {
      font-size: 1.1rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    
    .empty-state p {
      font-size: 0.9rem;
      opacity: 0.7;
    }
    
    .form-group input.error,
    .form-group textarea.error {
      border-color: #ef4444;
      animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
    }
    
    @keyframes shake {
      10%, 90% { transform: translateX(-1px); }
      20%, 80% { transform: translateX(2px); }
      30%, 50%, 70% { transform: translateX(-4px); }
      40%, 60% { transform: translateX(4px); }
    }
    
    .loading-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 1s ease-in-out infinite;
      margin-right: 8px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    body.logging-out {
      opacity: 0.7;
      transition: opacity 0.5s ease;
    }
  `

  document.head.appendChild(style)
})
