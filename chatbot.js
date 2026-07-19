const chatbotToggle = document.getElementById("chatbotToggle");
const chatbotWindow = document.getElementById("chatbotWindow");
const closeChat = document.getElementById("closeChat");
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatMessages = document.getElementById("chatMessages");

chatbotToggle.addEventListener("click", () => {
    chatbotWindow.style.display = "flex";
});

closeChat.addEventListener("click", () => {
    chatbotWindow.style.display = "none";
});

sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keypress", function(e){
    if(e.key === "Enter"){
        sendMessage();
    }
});

function sendMessage(){
    const message = userInput.value.trim();
    if(message === "") return;

    addUserMessage(message);
    userInput.value = "";

    setTimeout(() => {
        const reply = getBotReply(message);
        addBotMessage(reply);
    }, 500);
}

function addUserMessage(text){
    const div = document.createElement("div");
    div.className = "user-message";
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Now accepts HTML so we can render clickable product links
function addBotMessage(html){
    const div = document.createElement("div");
    div.className = "bot-message";
    div.innerHTML = html;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Strip punctuation, lowercase, split into words
function tokenize(text){
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(Boolean);
}

// Score a product against the user's message.
// Exact keyword phrase match = high score, single word overlaps = lower score.
function scoreProduct(product, message, tokens){
    let score = 0;

    for(const keyword of product.keywords){
        if(message.includes(keyword)){
            score += keyword.split(" ").length * 3; // longer phrase match = stronger signal
        }
    }

    if(message.includes(product.name.toLowerCase())){
        score += 10;
    }

    if(tokens.includes(product.category)){
        score += 2;
    }

    return score;
}

function findBestProduct(message, tokens){
    let best = null;
    let bestScore = 0;

    for(const product of norzaData.products){
        const score = scoreProduct(product, message, tokens);
        if(score > bestScore){
            bestScore = score;
            best = product;
        }
    }

    return bestScore > 0 ? best : null;
}

function productReplyHTML(product){
    return `Yes! We have <strong>${product.name}</strong> for ${product.price}.
            <br><a href="${product.url}" target="_blank">View product &rarr;</a>`;
}

// Intent patterns checked before falling back to product search.
// Each has a list of trigger words/phrases and a reply (string or function).
const intents = [
    {
        triggers: ["hello", "hi", "hey"],
        reply: () => "Hello! Welcome to Norza. Ask me about products, shipping, returns, or payments!"
    },
    {
        triggers: ["shipping", "how long", "when will it arrive", "delivery time"],
        reply: () => norzaData.policies.shipping
    },
    {
        triggers: ["deliver"],
        reply: () => norzaData.policies.shipping
    },
    {
        triggers: ["refund", "money back"],
        reply: () => norzaData.policies.refund
    },
    {
        triggers: ["return", "exchange"],
        reply: () => norzaData.policies.returns
    },
    {
        triggers: ["payment", "pay", "credit card", "cash on delivery", "cod"],
        reply: () => norzaData.policies.payment
    },
    {
        triggers: ["order status", "track order", "my order"],
        reply: () => "Please provide your order number and I'll help you check its status."
    },
    {
        triggers: ["contact", "phone number", "email", "support team"],
        reply: () => `You can reach us on our <a href="${norzaData.pages.contact}" target="_blank">Contact page</a>.`
    },
    {
        triggers: ["blog", "articles", "news"],
        reply: () => `Check out our latest posts on the <a href="${norzaData.pages.blog}" target="_blank">Blog</a>.`
    },
    {
        triggers: ["cart", "checkout", "basket"],
        reply: () => `You can view your items in the <a href="${norzaData.pages.cart}" target="_blank">Cart</a>.`
    },
    {
        triggers: ["shop", "store", "browse", "catalog", "products page"],
        reply: () => `Browse everything in our <a href="${norzaData.pages.shop}" target="_blank">Shop</a>.`
    }
];

function matchIntent(message){
    for(const intent of intents){
        for(const trigger of intent.triggers){
            if(message.includes(trigger)){
                return intent.reply();
            }
        }
    }
    return null;
}

function getBotReply(rawMessage){
    const message = rawMessage.toLowerCase();
    const tokens = tokenize(message);

    // 1. Try to match a product first — a customer asking "do you have watermelon?"
    //    should get the product link even though "watermelon" isn't a defined intent.
    const product = findBestProduct(message, tokens);

    // 2. Try known intents (policies, pages, greetings)
    const intentReply = matchIntent(message);

    // If both matched, prefer the product (more specific/actionable),
    // unless the message clearly reads as a policy question.
    if(product && !intentReply){
        return productReplyHTML(product);
    }

    if(intentReply){
        return intentReply;
    }

    if(product){
        return productReplyHTML(product);
    }

    // 3. Fallback — still try to be useful instead of a dead end
    return `I couldn't find an exact match for that. You can browse everything in our
            <a href="${norzaData.pages.shop}" target="_blank">Shop</a>, or
            <a href="${norzaData.pages.contact}" target="_blank">contact support</a> for help.`;
}