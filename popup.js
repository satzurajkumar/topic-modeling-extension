// Function to be injected into the webpage to extract text
function extractPageText() {
	// Try to get main content, otherwise fall back to the whole body
	// This is a basic attempt and might need refinement for specific site structures
	const mainElement = document.querySelector("main");
	const articleElement = document.querySelector("article");

	let textContent = "";

	if (articleElement) {
		textContent = articleElement.innerText;
	} else if (mainElement) {
		textContent = mainElement.innerText;
	} else {
		// Fallback: try to remove nav and footer before getting body text
		const tempBody = document.body.cloneNode(true);
		const navs = tempBody.querySelectorAll("nav");
		const footers = tempBody.querySelectorAll("footer");
		const scripts = tempBody.querySelectorAll("script");
		const styles = tempBody.querySelectorAll("style");

		navs.forEach((nav) => nav.remove());
		footers.forEach((footer) => footer.remove());
		scripts.forEach((script) => script.remove());
		styles.forEach((style) => style.remove());

		textContent = tempBody.innerText;
	}

	// Basic cleaning: replace multiple newlines/spaces with a single space
	return textContent.replace(/\s\s+/g, " ").trim();
}

// Basic NLP: analyze text to find frequent keywords
function analyzeText(text) {
	if (!text || typeof text !== "string" || text.trim().length === 0) {
		return {
			keywords: [],
			error:
				"Could not extract meaningful text from the page or text is too short.",
		};
	}

	// Extended list of common English stop words and generic web terms
	const commonStopWords = [
		"a",
		"about",
		"above",
		"after",
		"again",
		"against",
		"all",
		"am",
		"an",
		"and",
		"any",
		"are",
		"aren't",
		"as",
		"at",
		"be",
		"because",
		"been",
		"before",
		"being",
		"below",
		"between",
		"both",
		"but",
		"by",
		"can't",
		"cannot",
		"could",
		"couldn't",
		"did",
		"didn't",
		"do",
		"does",
		"doesn't",
		"doing",
		"don't",
		"down",
		"during",
		"each",
		"few",
		"for",
		"from",
		"further",
		"had",
		"hadn't",
		"has",
		"hasn't",
		"have",
		"haven't",
		"having",
		"he",
		"he'd",
		"he'll",
		"he's",
		"her",
		"here",
		"here's",
		"hers",
		"herself",
		"him",
		"himself",
		"his",
		"how",
		"how's",
		"i",
		"i'd",
		"i'll",
		"i'm",
		"i've",
		"if",
		"in",
		"into",
		"is",
		"isn't",
		"it",
		"it's",
		"its",
		"itself",
		"let's",
		"me",
		"more",
		"most",
		"mustn't",
		"my",
		"myself",
		"no",
		"nor",
		"not",
		"of",
		"off",
		"on",
		"once",
		"only",
		"or",
		"other",
		"ought",
		"our",
		"ours",
		"ourselves",
		"out",
		"over",
		"own",
		"same",
		"shan't",
		"she",
		"she'd",
		"she'll",
		"she's",
		"should",
		"shouldn't",
		"so",
		"some",
		"such",
		"than",
		"that",
		"that's",
		"the",
		"their",
		"theirs",
		"them",
		"themselves",
		"then",
		"there",
		"there's",
		"these",
		"they",
		"they'd",
		"they'll",
		"they're",
		"they've",
		"this",
		"those",
		"through",
		"to",
		"too",
		"under",
		"until",
		"up",
		"very",
		"was",
		"wasn't",
		"we",
		"we'd",
		"we'll",
		"we're",
		"we've",
		"were",
		"weren't",
		"what",
		"what's",
		"when",
		"when's",
		"where",
		"where's",
		"which",
		"while",
		"who",
		"who's",
		"whom",
		"why",
		"why's",
		"with",
		"won't",
		"would",
		"wouldn't",
		"you",
		"you'd",
		"you'll",
		"you're",
		"you've",
		"your",
		"yours",
		"yourself",
		"yourselves",
		"january",
		"february",
		"march",
		"april",
		"may",
		"june",
		"july",
		"august",
		"september",
		"october",
		"november",
		"december",
		"monday",
		"tuesday",
		"wednesday",
		"thursday",
		"friday",
		"saturday",
		"sunday",
		"pm",
		"am",
		"inc",
		"llc",
		"corp",
		"org",
		"com",
		"net",
		"gov",
		"edu",
		"page",
		"site",
		"web",
		"website",
		"click",
		"menu",
		"home",
		"search",
		"contact",
		"news",
		"article",
		"post",
		"blog",
		"comment",
		"view",
		"read",
		"more",
		"share",
		"like",
		"follow",
		"also",
		"however",
		"therefore",
		"example",
		"e.g.",
		"i.e.",
		"etc",
		"fig",
		"image",
		"photo",
		"video",
		"content",
		"information",
		"using",
		"use",
		"get",
		"one",
		"two",
		"three",
		"four",
		"five",
		"six",
		"seven",
		"eight",
		"nine",
		"ten",
		"copyright",
		"rights",
		"reserved",
		"terms",
		"privacy",
		"policy",
		"subscribe",
		"login",
		"logout",
		"register",
		"account",
		"learn",
		"help",
		"faq",
		"support",
		"services",
		"products",
		"company",
		"about",
		"us",
		"welcome",
		"thank",
		"thanks",
		"nbsp",
		"amp",
		"quot",
		"apos",
		"lt",
		"gt", // HTML entities
	];

	// Clean text: lowercase, remove punctuation (except apostrophes within words), remove numbers, then normalize spaces
	const cleanedText = text
		.toLowerCase()
		.replace(/[^\w\s']|_/g, " ") // Remove punctuation except apostrophes
		.replace(/\b\d+\b/g, "") // Remove standalone numbers
		.replace(/\s+/g, " ") // Normalize whitespace
		.trim();

	const words = cleanedText.split(/\s+/);
	const freqMap = {};

	words.forEach((word) => {
		// Further filter: word length, not a stop word, not purely numeric (already handled but good check)
		if (
			word.length > 3 &&
			word.length < 20 &&
			!commonStopWords.includes(word) &&
			isNaN(parseFloat(word))
		) {
			freqMap[word] = (freqMap[word] || 0) + 1;
		}
	});

	// Sort words by frequency in descending order
	const sortedKeywords = Object.entries(freqMap)
		.sort(([, a], [, b]) => b - a)
		.map(([word]) => word);

	const topKeywords = sortedKeywords.slice(0, 7); // Get top 7 keywords

	if (topKeywords.length === 0 && words.length > 0) {
		// If no keywords found but there was text
		return {
			keywords: [],
			error:
				"Could not identify distinct keywords. The page might be too generic or text extraction was not effective.",
		};
	}

	return { keywords: topKeywords, error: null };
}

// --- Popup DOM Elements ---
const analyzeButton = document.getElementById("analyzeButton");
const resultsList = document.getElementById("results");
const resultsContainer = document.getElementById("resultsContainer");
const statusDiv = document.getElementById("status");
const errorDiv = document.getElementById("error");

// --- Event Listener ---
analyzeButton.addEventListener("click", async () => {
	// Clear previous results and errors
	resultsList.innerHTML = "";
	resultsContainer.classList.add("hidden");
	errorDiv.classList.add("hidden");
	errorDiv.textContent = "";
	statusDiv.textContent = "Analyzing... please wait.";
	analyzeButton.disabled = true;
	analyzeButton.classList.replace("bg-blue-500", "bg-blue-300");
	analyzeButton.classList.replace("hover:bg-blue-600", "hover:bg-blue-300");

	try {
		// Get the current active tab
		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});

		if (tab && tab.id) {
			// Execute the script in the context of the active tab
			const injectionResults = await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				func: extractPageText, // The function to inject
			});

			if (
				injectionResults &&
				injectionResults[0] &&
				injectionResults[0].result
			) {
				const pageText = injectionResults[0].result;
				const analysis = analyzeText(pageText);

				if (analysis.error) {
					errorDiv.textContent = analysis.error;
					errorDiv.classList.remove("hidden");
					statusDiv.textContent = "Analysis complete with issues.";
				} else if (analysis.keywords.length > 0) {
					analysis.keywords.forEach((keyword) => {
						const listItem = document.createElement("li");
						listItem.textContent = keyword;
						listItem.classList.add("text-slate-700", "py-0.5");
						resultsList.appendChild(listItem);
					});
					resultsContainer.classList.remove("hidden");
					statusDiv.textContent = "Analysis complete!";
				} else {
					errorDiv.textContent =
						"No significant keywords found. The page might not have enough text content or is too generic.";
					errorDiv.classList.remove("hidden");
					statusDiv.textContent = "Analysis complete.";
				}
			} else {
				console.error("Injection result error:", injectionResults);
				errorDiv.textContent =
					"Failed to extract text from the page. The page might be protected or not accessible.";
				errorDiv.classList.remove("hidden");
				statusDiv.textContent = "Error during analysis.";
			}
		} else {
			errorDiv.textContent = "Could not get active tab information.";
			errorDiv.classList.remove("hidden");
			statusDiv.textContent = "Error.";
		}
	} catch (e) {
		console.error("Error during script execution or analysis:", e);
		errorDiv.textContent = `An error occurred: ${e.message}. Check browser console for details.`;
		errorDiv.classList.remove("hidden");
		statusDiv.textContent = "An unexpected error occurred.";
	} finally {
		analyzeButton.disabled = false;
		analyzeButton.classList.replace("bg-blue-300", "bg-blue-500");
		analyzeButton.classList.replace("hover:bg-blue-300", "hover:bg-blue-600");
	}
});
