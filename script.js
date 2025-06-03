// Supabase client setup
const supabaseClient = supabase.createClient(
  'https://elbqpwasyewwhnnzjrad.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsYnFwd2FzeWV3d2hubnpqcmFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDUwNTksImV4cCI6MjA2NDEyMTA1OX0.Z-4k4ltlUYtt9BAk5c7Y1cTKrdtY4pbgWqHxAzdB6s4'
);

// Handle email confirmation redirect and restore session
async function handleEmailConfirmationRedirect() {
  const hash = window.location.hash;
  if (hash && hash.includes("access_token")) {
    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (access_token && refresh_token) {
      const { data, error } = await supabaseClient.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.error("Error restoring session:", error.message);
      } else {
        console.log("Session restored from email confirmation link:", data);
        window.location.hash = ""; // clean up URL
        location.reload(); // refresh to trigger dashboard load
      }
    }
  }
}

handleEmailConfirmationRedirect();

// Constants
const ADMIN_EMAILS = ['kingtailan40@gmail.com'];
const platformUSDTAddress = "TH9YqYXoGwL5eh6nCxCDRXvCUgjpKqMPkJ";
const DAILY_INTEREST_RATE = 0.01;
let currentUser = null;

// Auth
function checkAdmin(email) {
  return ADMIN_EMAILS.includes(email);
}

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);

  currentUser = data.user;
  loadDashboard();
}

async function signup(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    return alert("Email and password are required.");
  }

  const { data, error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    console.error("Signup error:", error);
    return alert(error.message);
  }

  alert("Signup successful. Please verify your email before logging in.");
}

async function logout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("admin-dashboard").style.display = "none";
  document.getElementById("auth-section").style.display = "block";
}

// Dashboard
async function loadDashboard() {
  const { data: authData, error } = await supabaseClient.auth.getUser();
  if (error || !authData.user) return;

  currentUser = authData.user;
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  document.getElementById("user-email").textContent = currentUser.email;
  document.getElementById("deposit-address").textContent = platformUSDTAddress;

  const { data: deposits, error: depError } = await supabaseClient
    .from("investments")
    .select("*")
    .eq("user_id", currentUser.id);

  if (depError) {
    console.error(depError);
    return alert("Could not load deposits.");
  }

  let totalDeposits = 0;
  let totalInterest = 0;

  deposits.forEach(({ usdt_amount, deposit_date }) => {
    const amount = parseFloat(usdt_amount);
    const days = Math.floor((new Date() - new Date(deposit_date)) / (1000 * 60 * 60 * 24));
    totalDeposits += amount;
    totalInterest += amount * DAILY_INTEREST_RATE * days;
    console.log(days);
  });

  document.getElementById("total-deposits").textContent = totalDeposits.toFixed(2);
  document.getElementById("daily-returns").textContent = (totalDeposits + totalInterest).toFixed(2);

  if (checkAdmin(currentUser.email)) {
    document.getElementById("admin-dashboard").style.display = "block";
    loadAnalytics();
    loadUserList();
  }
}

// Deposit
async function submitDeposit() {
  const wallet = document.getElementById("user-wallet").value.trim();
  const amount = parseFloat(document.getElementById("deposit-amount").value);

  if (!wallet || isNaN(amount) || amount <= 0) return alert("Valid wallet and amount required.");
  if (!currentUser) return alert("User not logged in.");

  const { error } = await supabaseClient.from("investments").insert({
    user_id: currentUser.id,
    wallet_address: wallet,
    usdt_amount: amount,
    deposit_date: new Date().toISOString()
  });

  if (error) {
    console.error(error);
    return alert("Failed to record deposit.");
  }

  alert("Deposit recorded! You’ll receive a confirmation email shortly.");
  loadDashboard();
}

// Register Tron Wallet
async function registerWallet() {
  const wallet = document.getElementById("user-wallet").value.trim();
  if (!wallet || !currentUser) return alert("Enter a valid wallet address.");

  const { error } = await supabaseClient.from("user_wallets").upsert({
    user_id: currentUser.id,
    wallet_address: wallet
  });

  if (error) {
    console.error(error);
    return alert("Wallet registration failed.");
  }

  alert("Wallet registered successfully.");
}

// Admin Analytics
async function loadAnalytics() {
  const { data, error } = await supabaseClient.from("investments").select("*");
  if (error) return console.error("Analytics error:", error);

  const totalUSDT = data.reduce((sum, { usdt_amount }) => sum + parseFloat(usdt_amount), 0);
  const userCount = new Set(data.map(({ user_id }) => user_id)).size;

  //document.getElementById("analytics-usdt").textContent = totalUSDT.toFixed(2);
  //document.getElementById("analytics-users").textContent = userCount;
}

async function loadUserList() {
  const { data: summaries, error } = await supabaseClient.rpc("get_user_summaries");
  const list = document.getElementById("user-list");
  list.innerHTML = "";

  if (error) {
    console.error("Summary fetch error:", error);
    return;
  }

  let totalUSDT = 0;

  summaries.forEach(({ email, total_usdt, last_deposit }) => {
    // Sum total USDT
    totalUSDT += parseFloat(total_usdt || 0);

    // Create user entry
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${email}</strong><br>
      Total Deposited: ${parseFloat(total_usdt).toFixed(2)} USDT<br>
      Last Deposit: ${last_deposit || "N/A"}
    `;
    li.style.padding = "10px";
    li.style.borderBottom = "1px solid #ccc";
    list.appendChild(li);
  });

  // Inject into admin dashboard
  document.getElementById("analytics-usdt").textContent = totalUSDT.toFixed(2);
  document.getElementById("analytics-users").textContent = summaries.length;
}

// Background Image Rotation
const leftImages = [
  "masai-left-1.png", "masai-left-2.png", "masai-left-3.png",
  "masai-left-4.png", "masai-left-5.png", "masai-left-6.png"
];
const rightImages = [
  "masai-right-1.png", "masai-right-2.png", "masai-right-3.png",
  "masai-right-4.png", "masai-right-5.png", "masai-right-6.png"
];

function getRandomImage(images) {
  return images[Math.floor(Math.random() * images.length)];
}

function rotateImages() {
  document.getElementById("masai-left-img").src = getRandomImage(leftImages);
  document.getElementById("masai-right-img").src = getRandomImage(rightImages);
}

// Init
window.addEventListener("load", async () => {
  rotateImages();
  setInterval(rotateImages, 60000);

  const { data } = await supabaseClient.auth.getUser();
  if (data.user) {
    currentUser = data.user;
    loadDashboard();
  }
});
