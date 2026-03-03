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
  const uploadPhotoInput = document.getElementById("upload-photo");
  const usernameInput = document.getElementById("username");
  const sidebarUsernameElement = document.getElementById("sidebar-username");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const profileForm = document.getElementById("profile-form");

  let originalData = {};
  let newProfileImage = null;

  // Charger les données actuelles
  async function loadProfileData() {
    try {
      const res = await fetch("http://localhost:3000/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) throw new Error("Échec de la récupération des données utilisateur");
      
      const data = await res.json();
      const user = data.user;

      originalData = {
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture
      };

      usernameInput.value = user.name;
      sidebarUsernameElement.textContent = user.name;
      emailInput.value = user.email;
      
      if (user.profilePicture) {
        profilePic.src = user.profilePicture;
        sidebarProfilePic.src = user.profilePicture;
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des données utilisateur:", err);
      alert("Erreur lors de la récupération des données utilisateur");
    }
  }

  // Clic sur l'image pour upload
  document.querySelector('.photo-preview').addEventListener('click', function() {
    uploadPhotoInput.click();
  });

  // Changement d'image
  uploadPhotoInput.addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        profilePic.src = e.target.result;
        newProfileImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Toggle password visibility
  window.togglePassword = function() {
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      confirmPasswordInput.type = "text";
    } else {
      passwordInput.type = "password";
      confirmPasswordInput.type = "password";
    }
  };

  // Soumission du formulaire
  profileForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const name = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    if (!name) {
      alert("Le nom est requis!");
      return;
    }

    if (password && password !== confirmPassword) {
      alert("Les mots de passe ne correspondent pas!");
      return;
    }

    try {
      const updateData = { name };
      if (password) updateData.password = password;
      if (newProfileImage) updateData.profilePicture = newProfileImage;

      const res = await fetch("http://localhost:3000/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error("Échec de la mise à jour du profil");
      
      const data = await res.json();
      alert(data.message);
      window.location.href = "profile.html";
    } catch (err) {
      console.error("Erreur lors de la mise à jour du profil:", err);
      alert("Erreur lors de la mise à jour du profil");
    }
  });

  // Navigation
  window.goBackToProfile = function() {
    window.location.href = "profile.html";
  };

  window.logout = function() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    window.location.href = "login.html";
  };

  loadProfileData();
});