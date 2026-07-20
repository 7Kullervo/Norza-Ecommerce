// contact.js — wires the Contact Us form to the backend

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const statusBox = document.getElementById("contactStatus");
  const submitBtn = document.getElementById("contactSubmitBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    statusBox.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    const name = document.getElementById("contactName").value.trim();
    const email = document.getElementById("contactEmail").value.trim();
    const subject = document.getElementById("contactSubject").value.trim();
    const message = document.getElementById("contactMessage").value.trim();

    try {
      const data = await norzaApiFetch("/contact", {
        method: "POST",
        body: JSON.stringify({ name, email, subject, message }),
      });

      statusBox.className = "alert alert-success mt-3";
      statusBox.textContent = data.message || "Message sent — we'll get back to you soon.";
      statusBox.style.display = "block";
      form.reset();
    } catch (err) {
      statusBox.className = "alert alert-danger mt-3";
      statusBox.textContent = err.message;
      statusBox.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Message";
    }
  });
});
