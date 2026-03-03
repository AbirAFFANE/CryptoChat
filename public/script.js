document.addEventListener("DOMContentLoaded", function() {
  const text = "Échangez vos messages en toute confidentialité 🔒";
  const typedTextElement = document.getElementById("typed-text");
  let index = 0;

  function typeText() {
      if (index < text.length) {
          typedTextElement.innerHTML += text.charAt(index);
          index++;
          setTimeout(typeText, 100); // Vitesse d'écriture
      }
  }

  typeText(); // Lancer l'effet au chargement
});
