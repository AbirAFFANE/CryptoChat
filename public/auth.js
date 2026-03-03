function togglePassword(fieldId) {
  let field = document.getElementById(fieldId);
  if (field.type === "password") {
    field.type = "text";
  } else {
    field.type = "password";
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value.trim();
  const confirmPassword = document.getElementById('confirm-password').value.trim();

  if (password !== confirmPassword) {
    alert("كلمات المرور غير متطابقة!");
    return;
  }

  try {
    const res = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      window.location.href = 'login.html';
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert("خطأ في الاتصال بالخادم.");
    console.error("خطأ:", err);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      localStorage.setItem('token', data.token);
      const payload = JSON.parse(atob(data.token.split(".")[1]));
      localStorage.setItem('userId', payload.userId); // يخزن _id
      window.location.href = 'dashboard.html';
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert("خطأ في الاتصال بالخادم.");
    console.error("خطأ:", err);
  }
}