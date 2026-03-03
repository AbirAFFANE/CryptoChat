document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  if (!token || !userId) {
    alert("Vous devez vous connecter d'abord.");
    window.location.href = "login.html";
    return;
  }

  const userList = document.getElementById("user-list");
  const addName = document.getElementById("add-name");
  const addEmail = document.getElementById("add-email");
  const addPassword = document.getElementById("add-password");
  const addUserBtn = document.getElementById("add-user-btn");
  const backToDashboard = document.getElementById("back-to-dashboard");

  async function loadUsers() {
    try {
      const res = await fetch("http://localhost:3000/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Échec de la récupération de la liste des utilisateurs");
      const users = await res.json();
      userList.innerHTML = "";
      users.forEach(user => {
        const div = document.createElement("div");
        div.className = "chat-item";
        div.innerHTML = `
          <div class="chat-info">
            <h3>${user.name} (${user.email})</h3>
            ${user.email !== 'ferdousadmin@gmail.com' ? '<button class="delete-user-btn" data-user-id="' + user._id + '">Supprimer</button>' : ''}
          </div>
        `;
        userList.appendChild(div);
      });
      document.querySelectorAll(".delete-user-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const userId = btn.dataset.userId;
          if (confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
            try {
              const res = await fetch(`http://localhost:3000/admin/users/${userId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) throw new Error("Échec de la suppression de l'utilisateur");
              alert("Utilisateur supprimé avec succès !");
              loadUsers();
            } catch (err) {
              console.error("❌ Erreur lors de la suppression de l'utilisateur :", err.message);
              alert("Erreur lors de la suppression de l'utilisateur : " + err.message);
            }
          }
        });
      });
    } catch (err) {
      console.error("❌ Erreur lors de la récupération des utilisateurs :", err);
      alert("Erreur lors de la récupération de la liste des utilisateurs : " + err.message);
      window.location.href = "dashboard.html";
    }
  }

  addUserBtn.addEventListener("click", async () => {
    const name = addName.value.trim();
    const email = addEmail.value.trim();
    const password = addPassword.value.trim();
    if (!name || !email || !password) {
      alert("❌ Tous les champs sont requis.");
      return;
    }
    try {
      const res = await fetch("http://localhost:3000/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) throw new Error("Échec de l'ajout de l'utilisateur");
      const data = await res.json();
      alert(data.message);
      addName.value = "";
      addEmail.value = "";
      addPassword.value = "";
      loadUsers();
    } catch (err) {
      console.error("❌ Erreur lors de l'ajout de l'utilisateur :", err.message);
      alert("Erreur lors de l'ajout de l'utilisateur : " + err.message);
    }
  });

  backToDashboard.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  loadUsers();
});