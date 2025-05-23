// Function to be injected into the webpage to extract text (remains the same)
function extractPageText() {
	const mainElement = document.querySelector("main");
	const articleElement = document.querySelector("article");
	let textContent = "";
	if (articleElement) textContent = articleElement.innerText;
	else if (mainElement) textContent = mainElement.innerText;
	else {
		const tempBody = document.body.cloneNode(true);
		const selectorsToRemove = [
			"nav",
			"footer",
			"script",
			"style",
			"aside",
			"header",
			'[role="banner"]',
			'[role="contentinfo"]',
			'[role="navigation"]',
			'[aria-hidden="true"]',
		];
		selectorsToRemove.forEach((selector) =>
			tempBody.querySelectorAll(selector).forEach((el) => el.remove())
		);
		textContent = tempBody.innerText;
	}
	return textContent.replace(/\s\s+/g, " ").trim();
}

// --- DOM Elements ---
const analyzeButton = document.getElementById("analyzeButton");
const resultsList = document.getElementById("results");
const resultsContainer = document.getElementById("resultsContainer");
const statusDiv = document.getElementById("status"); // For analysis status
const errorDiv = document.getElementById("error"); // For general errors

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginTabButton = document.getElementById("loginTabButton");
const registerTabButton = document.getElementById("registerTabButton");
const authStatus = document.getElementById("authStatus"); // For login/register messages
const logoutButton = document.getElementById("logoutButton");
const loggedInUserP = document.getElementById("loggedInUser");

// --- API Configuration ---
const BASE_API_URL = "http://127.0.0.1:8000"; // Ensure to update this backend url
const TOKEN_STORAGE_KEY = "topicDiscovererToken";
const USERNAME_STORAGE_KEY = "topicDiscovererUsername";

// --- UI Update Functions ---
function showAuthSection() {
	authSection.classList.remove("hidden");
	appSection.classList.add("hidden");
	authStatus.textContent = ""; // Clear previous auth messages
	clearGeneralError(); // Clear general errors when showing auth
}

function showAppSection(username) {
	authSection.classList.add("hidden");
	appSection.classList.remove("hidden");
	loggedInUserP.textContent = `Logged in as: ${username}`;
	errorDiv.classList.add("hidden"); // Clear general errors on successful login/app view
	authStatus.textContent = "";
}

function displayAuthError(message) {
	authStatus.textContent = message;
	authStatus.classList.add("text-red-500");
	authStatus.classList.remove("text-green-500");
}
function displayAuthSuccess(message) {
	authStatus.textContent = message;
	authStatus.classList.add("text-green-500");
	authStatus.classList.remove("text-red-500");
}

function displayGeneralError(message) {
	errorDiv.textContent = message;
	errorDiv.classList.remove("hidden");
}
function clearGeneralError() {
	errorDiv.textContent = "";
	errorDiv.classList.add("hidden");
}

// --- Authentication Logic ---
async function storeToken(token, username) {
	await chrome.storage.local.set({
		[TOKEN_STORAGE_KEY]: token,
		[USERNAME_STORAGE_KEY]: username,
	});
}

async function getToken() {
	try {
		const result = await chrome.storage.local.get([
			TOKEN_STORAGE_KEY,
			USERNAME_STORAGE_KEY,
		]);
		return {
			token: result[TOKEN_STORAGE_KEY],
			username: result[USERNAME_STORAGE_KEY],
		};
	} catch (e) {
		console.error("Error getting token from storage:", e);
		return { token: null, username: null };
	}
}

async function clearToken() {
	try {
		await chrome.storage.local.remove([
			TOKEN_STORAGE_KEY,
			USERNAME_STORAGE_KEY,
		]);
	} catch (e) {
		console.error("Error clearing token from storage:", e);
	}
}

async function handleLogin(event) {
	event.preventDefault();
	const username = loginForm.username.value;
	const password = loginForm.password.value;
	displayAuthStatusMessage("Logging in...", false); // Using the updated function

	try {
		const response = await fetch(`${BASE_API_URL}/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" }, // FastAPI's OAuth2PasswordRequestForm expects this
			body: new URLSearchParams({ username, password }),
		});
		const data = await response.json();
		if (!response.ok) {
			throw new Error(data.detail || "Login failed. Check username/password.");
		}
		await storeToken(data.access_token, username);
		showAppSection(username);
		clearGeneralError();
	} catch (err) {
		console.error("Login error:", err);
		displayAuthError(`Login failed: ${err.message}`);
	}
}

async function handleRegister(event) {
	event.preventDefault();
	const username = registerForm.username.value;
	const email = registerForm.email.value; // Optional
	const password = registerForm.password.value;
	displayAuthStatusMessage("Registering...", false); // Using the updated function

	try {
		const payload = { username, password };
		if (email) payload.email = email; // Add email if provided

		const response = await fetch(`${BASE_API_URL}/auth/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		const data = await response.json();
		if (!response.ok) {
			throw new Error(
				data.detail || "Registration failed. Username might be taken."
			);
		}
		displayAuthSuccess(
			`Registered ${data.username}! Please switch to Login tab.`
		);
		// Do not auto-login, user should explicitly login after registration
		// switchToLoginTab(); // Optionally switch tab
	} catch (err) {
		console.error("Register error:", err);
		displayAuthError(`Registration failed: ${err.message}`);
	}
}

async function handleLogout() {
	await clearToken();
	showAuthSection();
	switchToLoginTab(); // Default to login tab on logout
	statusDiv.textContent = "Click the button to analyze the current page."; // Reset analysis status
	resultsContainer.classList.add("hidden"); // Hide results
	resultsList.innerHTML = "";
}

function displayAuthStatusMessage(message, isError) {
	// Consolidated status message for auth
	authStatus.textContent = message;
	if (isError) {
		authStatus.classList.add("text-red-500");
		authStatus.classList.remove("text-green-500");
	} else {
		n;
		authStatus.classList.remove("text-red-500");
		// authStatus.classList.add('text-green-500');
	}
}

// --- Tab Switching for Auth Forms ---
function switchToLoginTab() {
	loginForm.classList.remove("hidden");
	registerForm.classList.add("hidden");
	loginTabButton.classList.add("active");
	registerTabButton.classList.remove("active");
	authStatus.textContent = ""; // Clear status when switching tabs
}

function switchToRegisterTab() {
	loginForm.classList.add("hidden");
	registerForm.classList.remove("hidden");
	loginTabButton.classList.remove("active");
	registerTabButton.classList.add("active");
	authStatus.textContent = "";
}

// --- Analyze Page Logic ---
analyzeButton.addEventListener("click", async () => {
	resultsList.innerHTML = "";
	resultsContainer.classList.add("hidden");
	clearGeneralError();
	statusDiv.textContent = "Extracting text...";
	analyzeButton.disabled = true; // Disable button during processing
	analyzeButton.classList.replace("bg-blue-500", "bg-blue-300");
	analyzeButton.classList.replace("hover:bg-blue-600", "hover:bg-blue-300");

	try {
		const { token } = await getToken();
		if (!token) {
			displayGeneralError(
				"Authentication token not found. Please login again."
			);
			showAuthSection(); // Redirect to login if no token
			return; // Exit early
		}

		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});
		if (
			!tab ||
			!tab.id ||
			(!tab.url.startsWith("http:") && !tab.url.startsWith("https:"))
		) {
			displayGeneralError(
				"Cannot analyze this page. Extension works on http/https websites only."
			);
			return; // Exit early
		}

		const injectionResults = await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: extractPageText,
		});

		if (injectionResults && injectionResults[0] && injectionResults[0].result) {
			const pageText = injectionResults[0].result;
			if (!pageText || pageText.trim().length < 50) {
				// Match Pydantic min_length
				displayGeneralError(
					"Not enough text content found on the page (min 50 characters required)."
				);
				return; // Exit early
			}

			statusDiv.textContent = "Sending text to backend for analysis...";
			const headers = new Headers();
			headers.append("Content-Type", "application/json");
			headers.append("Authorization", `Bearer ${token}`); // Send JWT

			const response = await fetch(`${BASE_API_URL}/analyze`, {
				method: "POST",
				headers: headers,
				body: JSON.stringify({ text: pageText }),
			});
			const responseData = await response.json(); // Try to parse JSON regardless of response.ok

			if (!response.ok) {
				if (response.status === 401) {
					// Unauthorized, likely bad/expired token
					displayGeneralError(
						`Authentication error: ${
							responseData.detail ||
							"Your session may have expired. Please login again."
						}`
					);
					await handleLogout(); // Force logout and show auth section
					return; // Exit early
				}
				throw new Error(
					responseData.detail || `Backend error: ${response.status}`
				);
			}

			// Assuming 'responseData' is now the successful KeywordsResponse
			if (responseData.keywords && responseData.keywords.length > 0) {
				responseData.keywords.forEach((keyword) => {
					const li = document.createElement("li");
					li.textContent = keyword;
					li.classList.add("text-slate-700", "py-0.5");
					resultsList.appendChild(li);
				});
				resultsContainer.classList.remove("hidden");
				statusDiv.textContent = responseData.message || "Analysis complete!";
			} else {
				displayGeneralError(
					responseData.message ||
						"No significant keywords found by the backend."
				);
				statusDiv.textContent = "Analysis complete.";
			}
		} else {
			console.error("Injection result error:", injectionResults);
			displayGeneralError(
				"Failed to extract text from the page. The page might be protected or not accessible."
			);
		}
	} catch (e) {
		console.error("Error during analysis operation:", e);
		displayGeneralError(`Error: ${e.message}. Check console for details.`);
		statusDiv.textContent = "An error occurred during analysis."; // More specific status
	} finally {
		analyzeButton.disabled = false; // Re-enable button
		analyzeButton.classList.replace("bg-blue-300", "bg-blue-500");
		analyzeButton.classList.replace("hover:bg-blue-300", "hover:bg-blue-600");
	}
});

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
	// Ensure all form elements exist before adding listeners
	if (loginForm) loginForm.addEventListener("submit", handleLogin);
	if (registerForm) registerForm.addEventListener("submit", handleRegister);
	if (logoutButton) logoutButton.addEventListener("click", handleLogout);
	if (loginTabButton)
		loginTabButton.addEventListener("click", switchToLoginTab);
	if (registerTabButton)
		registerTabButton.addEventListener("click", switchToRegisterTab);

	const { token, username } = await getToken();
	if (token && username) {
		// Optional: Add a quick check here to see if the token is still valid
		// by making a request to a protected endpoint like /auth/users/me.

		// try {
		//    const response = await fetch(`${BASE_API_URL}/auth/users/me`, { headers: { 'Authorization': `Bearer ${token}` }});
		//    if (response.ok) {
		//        const userData = await response.json();
		//        showAppSection(userData.username); // Use username from validated token
		//    } else {
		//        await handleLogout(); // Token invalid or expired
		//    }
		// } catch (e) {
		//    console.error("Error validating token on startup:", e);
		//    await handleLogout();
		// }
		showAppSection(username);
	} else {
		showAuthSection();
		switchToLoginTab(); // Default to login tab if not authenticated
	}
});
