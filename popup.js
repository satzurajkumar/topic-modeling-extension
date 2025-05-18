// Function to be injected into the webpage to extract text (remains the same)
function extractPageText() {
	const mainElement = document.querySelector("main");
	const articleElement = document.querySelector("article");
	let textContent = "";

	if (articleElement) {
		textContent = articleElement.innerText;
	} else if (mainElement) {
		textContent = mainElement.innerText;
	} else {
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
		selectorsToRemove.forEach((selector) => {
			tempBody.querySelectorAll(selector).forEach((el) => el.remove());
		});
		textContent = tempBody.innerText;
	}
	return textContent.replace(/\s\s+/g, " ").trim();
}

// --- Popup DOM Elements ---
const analyzeButton = document.getElementById("analyzeButton");
const resultsList = document.getElementById("results");
const resultsContainer = document.getElementById("resultsContainer");
const statusDiv = document.getElementById("status");
const errorDiv = document.getElementById("error");

// Backend API endpoint
const BACKEND_API_URL = "http://127.0.0.1:5000/analyze"; // Your Flask backend URL

// --- Event Listener ---
analyzeButton.addEventListener("click", async () => {
	resultsList.innerHTML = "";
	resultsContainer.classList.add("hidden");
	errorDiv.classList.add("hidden");
	errorDiv.textContent = "";
	statusDiv.textContent = "Extracting text...";
	analyzeButton.disabled = true;
	analyzeButton.classList.replace("bg-blue-500", "bg-blue-300");
	analyzeButton.classList.replace("hover:bg-blue-600", "hover:bg-blue-300");

	try {
		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});

		if (tab && tab.id) {
			// Check if the URL is an http/https URL, not chrome:// or other internal pages
			if (
				!tab.url ||
				(!tab.url.startsWith("http:") && !tab.url.startsWith("https:"))
			) {
				errorDiv.textContent =
					"Cannot analyze this page. Extension works on http/https websites only.";
				errorDiv.classList.remove("hidden");
				statusDiv.textContent = "Analysis failed.";
				resetButtonState();
				return;
			}

			const injectionResults = await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				func: extractPageText,
			});

			if (
				injectionResults &&
				injectionResults[0] &&
				injectionResults[0].result
			) {
				const pageText = injectionResults[0].result;

				if (!pageText || pageText.trim().length < 100) {
					// Check for minimal text length
					errorDiv.textContent =
						"Not enough text content found on the page to analyze effectively.";
					errorDiv.classList.remove("hidden");
					statusDiv.textContent = "Analysis aborted.";
					resetButtonState();
					return;
				}

				statusDiv.textContent = "Sending text to backend for analysis...";

				// Call the backend
				const response = await fetch(BACKEND_API_URL, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ text: pageText }),
				});

				if (!response.ok) {
					const errorData = await response
						.json()
						.catch(() => ({ error: "Unknown error from backend." }));
					throw new Error(
						`Backend error: ${response.status} ${response.statusText}. ${
							errorData.error || ""
						}`
					);
				}

				const analysis = await response.json();

				if (analysis.error) {
					errorDiv.textContent = `Analysis Error: ${analysis.error}`;
					errorDiv.classList.remove("hidden");
					statusDiv.textContent = "Analysis complete with issues.";
				} else if (analysis.keywords && analysis.keywords.length > 0) {
					analysis.keywords.forEach((keyword) => {
						const listItem = document.createElement("li");
						listItem.textContent = keyword;
						listItem.classList.add("text-slate-700", "py-0.5");
						resultsList.appendChild(listItem);
					});
					resultsContainer.classList.remove("hidden");
					statusDiv.textContent = "Analysis complete!";
				} else {
					const message =
						analysis.message || "No significant keywords found by the backend.";
					errorDiv.textContent = message;
					errorDiv.classList.remove("hidden");
					statusDiv.textContent = "Analysis complete.";
				}
			} else {
				console.error("Injection result error:", injectionResults);
				errorDiv.textContent =
					"Failed to extract text from the page. The page might be protected or not accessible.";
				errorDiv.classList.remove("hidden");
				statusDiv.textContent = "Error during text extraction.";
			}
		} else {
			errorDiv.textContent = "Could not get active tab information.";
			errorDiv.classList.remove("hidden");
			statusDiv.textContent = "Error.";
		}
	} catch (e) {
		console.error("Error during operation:", e);
		let errorMessage = `An error occurred: ${e.message}.`;
		if (e.message.includes("Failed to fetch")) {
			errorMessage += " Is the Python backend server running?";
		}
		errorDiv.textContent = errorMessage;
		errorDiv.classList.remove("hidden");
		statusDiv.textContent = "An unexpected error occurred.";
	} finally {
		resetButtonState();
	}
});

function resetButtonState() {
	analyzeButton.disabled = false;
	analyzeButton.classList.replace("bg-blue-300", "bg-blue-500");
	analyzeButton.classList.replace("hover:bg-blue-300", "hover:bg-blue-600");
}
