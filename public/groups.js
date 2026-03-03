function openGroup(groupName) {
  document.getElementById("group-title").innerText = groupName;
  let messagesContainer = document.querySelector(".messages-container");
  messagesContainer.innerHTML = `
      <p style="color: white; text-align: center;">Bienvenue dans ${groupName}</p>
  `;
}

document.querySelector(".create-group-btn").addEventListener("click", function () {
  let groupName = prompt("Nom du groupe :");
  if (groupName) {
      let groupList = document.querySelector(".groups-list");
      let newGroup = document.createElement("div");
      newGroup.className = "group";
      newGroup.innerHTML = `<span class="group-name">${groupName}</span>`;
      newGroup.onclick = function () { openGroup(groupName); };
      groupList.appendChild(newGroup);
  }
});
