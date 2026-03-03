document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  
  if (!token || !userId) {
    alert("Vous devez vous connecter d'abord.");
    window.location.href = "login.html";
    return;
  }

  // Éléments du DOM
  const profilePic = document.getElementById("profile-pic");
  const sidebarProfilePic = document.getElementById("sidebar-profile-pic");
  const usernameElement = document.getElementById("username");
  const sidebarUsernameElement = document.getElementById("sidebar-username");
  const userEmailElement = document.getElementById("user-email");
  const joinDateElement = document.getElementById("join-date");
  const detailUsernameElement = document.getElementById("detail-username");
  const detailEmailElement = document.getElementById("detail-email");

  // Charger les données du profil
  async function loadProfile() {
    try {
      const res = await fetch("http://localhost:3000/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) throw new Error("Échec du chargement des données utilisateur");
      
      const data = await res.json();
      const user = data.user;

      // Mettre à jour tous les éléments
      usernameElement.textContent = user.name;
      sidebarUsernameElement.textContent = user.name;
      userEmailElement.textContent = user.email || "Non défini";
      detailUsernameElement.textContent = user.name;
      detailEmailElement.textContent = user.email || "Non défini";
      
      // Date d'inscription
      const joinDate = user.createdAt 
        ? new Date(user.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
        : "Date inconnue";
      joinDateElement.textContent = joinDate;
      
      // Images de profil
      if (user.profilePicture) {
        profilePic.src = user.profilePicture;
        sidebarProfilePic.src = user.profilePicture;
      }
    } catch (err) {
      console.error("Erreur lors du chargement du profil:", err);
      alert("Erreur lors du chargement du profil");
    }
  }

  // Gestion du changement d'image
  document.getElementById("profile-image-input").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        profilePic.src = e.target.result;
        sidebarProfilePic.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Navigation
  window.goToEditProfile = function() {
    window.location.href = "profile_edit.html";
  };

  window.logout = function() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    window.location.href = "login.html";
  };

  loadProfile();
});