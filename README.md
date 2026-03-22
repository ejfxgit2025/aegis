# 🧠 Aegis — Autonomous AI Treasury Engine

**A decision-based AI system that manages and executes crypto payments intelligently using USDT.**

---

# 🚀 What is Aegis?

Aegis is an **AI-powered autonomous treasury system** that:

* 🧠 Evaluates conditions before executing payments
* ⚡ Reacts to external and simulated real-world events
* 🔐 Protects funds with built-in safety mechanisms
* 💸 Executes real on-chain USDT transactions

---

# 🔥 Why Aegis Matters

### ❌ Traditional Systems

* Static rules (“if X → pay”)
* No intelligence layer
* Easily exploited or spammed
* Cannot adapt to changing conditions

---

### ✅ Aegis AI Treasury

* Context-aware decision making
* Event-driven execution
* Built-in financial safeguards
* Autonomous and explainable behavior

👉 Unlike traditional automation, Aegis introduces a **decision layer between trigger and execution**, reducing risk and enabling intelligent financial behavior.

---

# 🧠 How It Works

📊 **State → 🧠 Decision → 🔐 Validation → ⚡ Execution**

---

## 1️⃣ State Builder

Collects real-time system data:

* Wallet balance
* Daily spend
* Recent transactions
* Active rules
* Event queue
* Current time

👉 Provides full context before any action is taken

---

## 2️⃣ AI Decision Engine

Powered by an LLM-based system (via OpenRouter)

Returns structured decisions:

```json
{
  "action": "pay",
  "target": "0x...",
  "amount": 10,
  "confidence": 0.91,
  "risk": "low",
  "reason": "GitHub PR merged successfully"
}
```

---

## 3️⃣ Execution Guard 🔐

Validates every action before execution:

* Prevents overspending
* Blocks duplicate transactions
* Filters unsafe actions
* Validates AI outputs

---

## 4️⃣ Worker Engine

Runs continuously with event-driven execution cycles:

**Analyze → Decide → Validate → Execute**

---

## 5️⃣ Event System ⚡

Handles triggers from:

* API calls
* GitHub-related events (simulated or integrated)
* Internal automation flows

Ensures:

* No duplicate execution
* No replay attacks
* Controlled event processing

---

# 💸 Why USDT?

* 💰 Stable value (no volatility risk)
* 🌍 Widely adopted across ecosystems
* ⚡ Fast and efficient transfers
* 🧪 Ideal for real-world automation testing

---

# ✨ Key Features

### 🧠 Decision-Based Execution

Not simple automation — actions are evaluated before execution

---

### 🔐 Financial Safety First

* Transaction limits
* Daily spend tracking
* Duplicate prevention
* Risk-aware filtering

---

### ⚡ Event-Driven Payments

Responds to triggers such as:

* “PR merged”
* “Task completed”
* “Manual approval”

---

### 📊 Explainable Decisions

Each action includes:

* Reason
* Confidence score
* Risk level

---

### 🔁 Anti-Spam Protection

Prevents:

* Duplicate payments
* Event replay
* Transaction flooding

---

# 🏗️ Tech Stack

* **Frontend:** React + Vite
* **Backend:** Node.js + Express
* **AI Layer:** OpenRouter (LLM-based decision engine)
* **Blockchain:** EVM (Sepolia Testnet)
* **Token:** USDT (ERC-20)

---

# 📂 Project Structure

```
server/
  agent/
    stateBuilder.ts
    agentBrain.ts
    decisionValidator.ts
    executionGuard.ts
    worker.ts
    events.ts

frontend/
  src/
    components/
    pages/
```

---

# ⚙️ How to Run

## 1️⃣ Install dependencies

```
npm install
```

## 2️⃣ Setup environment

Create `.env`:

```
OPENROUTER_API_KEY=your_api_key
PRIVATE_KEY=your_wallet_private_key
RPC_URL=your_rpc_endpoint
```

## 3️⃣ Start the system

```
npm run dev
```

## 4️⃣ Open dashboard

```
http://localhost:3000
```

---

# 🎥 Demo Flow

### Example: Automated Developer Payment

1. Event triggered:

```
"PR merged"
```

2. System evaluates:

* Balance ✅
* No duplicates ✅
* Valid trigger ✅

3. Decision:

```
Pay 10 USDT
```

4. Execution:

* ✅ Transaction sent
* ✅ Event cleared
* ✅ Logged in system

---

# ⚠️ Built-in Safety

* Max transaction cap
* Daily spending limits
* Duplicate protection
* Event replay prevention
* AI output validation

---

# 🏆 Use Cases

* 💼 Automated developer payments
* 🤝 Smart escrow systems
* 🧾 Subscription billing
* 🏢 DAO treasury automation
* 🤖 AI financial assistants

---

# 🚀 Future Vision

* Multi-chain support
* DAO governance integration
* AI-driven financial strategies
* Risk prediction engine
* Fully autonomous treasury systems

---

# 🧠 Why This Wins

Aegis represents a shift:

👉 From “scripted automation”
➡️ To **autonomous financial decision systems**

---

# 👨‍💻 Built For

* Hackathons
* DeFi platforms
* DAOs
* Startups exploring AI + Web3

---

# 📜 License

MIT

---

# ⭐ Final Thought

**“Aegis doesn’t just send money — it evaluates when, why, and whether it should.”**
