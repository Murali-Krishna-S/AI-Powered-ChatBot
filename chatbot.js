document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chatbox");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-btn");
    const fileInput = document.getElementById("file-input");
 // Replace with your actual API key

    let conversationHistory = [];

    sendButton.addEventListener("click", sendMessage);
    fileInput.addEventListener("change", handleFileUpload);

    function sendMessage() {
        const userMessage = userInput.value.trim();
        if (userMessage === "") return;

        addMessage("User", userMessage);
        conversationHistory.push({ role: "user", content: userMessage });
        userInput.value = "";

        fetchOpenAIResponse(userMessage);
    }

    function addMessage(sender, message) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message");
        messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function fetchOpenAIResponse(userMessage) {
        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${openaiApiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: conversationHistory
                })
            });

            const data = await response.json();
            const botResponse = data.choices[0]?.message?.content || "I couldn't process that request.";
            addMessage("Chatbot", botResponse);
            conversationHistory.push({ role: "assistant", content: botResponse });

        } catch (error) {
            console.error("Error:", error);
            addMessage("Chatbot", "Sorry, I couldn't process your request.");
        }
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const fileContent = e.target.result;
            processFile(file.name, fileContent);
        };

        if (file.name.endsWith(".pdf")) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsBinaryString(file);
        }
    }

    async function processFile(filename, content) {
        if (filename.endsWith(".pdf")) {
            extractTextFromPDF(content);
        } else if (filename.endsWith(".csv") || filename.endsWith(".xlsx")) {
            extractDataFromExcel(content);
        } else {
            addMessage("Chatbot", "Unsupported file format.");
        }
    }

    async function extractTextFromPDF(pdfData) {
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        let textContent = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map(s => s.str).join(" ") + " ";
        }

        detectLanguageAndTranslate(textContent);
    }

    async function extractDataFromExcel(excelContent) {
        const workbook = XLSX.read(excelContent, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        addMessage("Chatbot", "Extracted Data from Excel:");
        addMessage("Chatbot", JSON.stringify(jsonData, null, 2));

        conversationHistory.push({ role: "assistant", content: JSON.stringify(jsonData, null, 2) });
    }

    async function detectLanguageAndTranslate(text) {
        try {
            const response = await fetch(`https://translation.googleapis.com/language/translate/v2/detect?key=${googleTranslateApiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ q: text })
            });

            const data = await response.json();
            const detectedLanguage = data.data.detections[0][0].language;

            if (detectedLanguage !== "en") {
                translateText(text, detectedLanguage);
            } else {
                summarizeText(text);
            }
        } catch (error) {
            console.error("Error detecting language:", error);
            summarizeText(text);
        }
    }

    async function translateText(text, sourceLanguage) {
        try {
            const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${googleTranslateApiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ q: text, source: sourceLanguage, target: "en", format: "text" })
            });

            const data = await response.json();
            const translatedText = data.data.translations[0].translatedText;

            addMessage("Chatbot", `Translated to English: ${translatedText}`);
            summarizeText(translatedText);
        } catch (error) {
            console.error("Error translating text:", error);
            summarizeText(text);
        }
    }

    async function summarizeText(text) {
        fetchOpenAIResponse(`Summarize this text: ${text}`);
    }
});
