# Slack Integration - Expert Interview Requests

## 🎯 Overview

Your Expert Platform now sends Slack notifications when users request to schedule expert interviews through ChatGPT.

---

## 🛠️ How It Works

### User Workflow in ChatGPT:

1. **Search for experts:**
   ```
   "Find Big 5 executive search firm leaders"
   ```
   → ChatGPT finds 10 experts

2. **Request interview:**
   ```
   "I'd like to schedule interviews with Adam Ortiz and Ann Vogl to discuss executive search market trends"
   ```
   → ChatGPT uses `request_expert_interview` tool
   → Slack notification sent to your team!

---

## 📬 Slack Notification Format

When a user requests an expert interview, your team receives:

```
🔥 Expert Interview Request
━━━━━━━━━━━━━━━━━━━━━━

Requested By: ChatGPT User
Urgency: HIGH

Research Topic / Discussion Intent:
Executive search market trends and Big 5 differentiation strategies

━━━━━━━━━━━━━━━━━━━━━━

Requested Experts (2):

1. Adam Ortiz, Ed.D.
   Director / Project Lead at Korn Ferry
   View LinkedIn Profile
   _Director / Project Lead at Korn Ferry (2019-Present); 
   Instructor at Johns Hopkins..._

2. Ann Vogl
   Senior Client Partner at Korn Ferry
   View LinkedIn Profile
   _Senior Client Partner at Korn Ferry; Former Principal at 
   Heidrick & Struggles..._

Source: ChatGPT MCP | Nov 10, 2025, 12:30 PM

[✅ Start Outreach] [📅 Schedule Interviews] [💬 Discuss]
```

---

## 🔧 New MCP Tool: `request_expert_interview`

**Purpose:** Request to schedule interviews with specific experts

**When ChatGPT Uses It:**
- User says "I want to talk to [expert]"
- User says "Schedule interview with [expert]"
- User says "Contact [expert] about [topic]"
- User says "Set up call with [expert]"

**Parameters:**
- `expertIds` (array): IDs of experts to interview
- `researchTopic` (string): What user wants to discuss
- `urgency` (string): low, medium, or high

**Returns:**
- Confirmation message to user
- Sends Slack notification to team

---

## 💡 Example ChatGPT Conversations

### Example 1: Simple Request
```
User: "Find Big 5 executives"
ChatGPT: [shows 10 experts]

User: "I'd like to interview Adam Ortiz about market trends"
ChatGPT: [uses request_expert_interview]
→ ✅ Interview request sent to team!
→ 📬 Slack notification delivered
```

### Example 2: Multiple Experts
```
User: "Find cybersecurity experts from Microsoft"
ChatGPT: [shows experts]

User: "Please schedule interviews with the first 3 to discuss EASM competitive landscape"
ChatGPT: [requests interviews for 3 experts]
→ 📬 Slack notification with all 3 experts and research topic
```

### Example 3: Urgent Request
```
User: "Find former Google VPs and schedule urgent interviews about AI strategy"
ChatGPT: [finds experts and requests interviews with urgency: high]
→ 📬 Slack notification marked as 🔥 HIGH priority
```

---

## 📋 What Your Team Receives

### Expert Details:
- Full name and current role
- Company and title
- **LinkedIn profile link** (clickable)
- Background/work history snippet
- Contact information (if available)

### Research Context:
- **What the user wants to discuss** (research topic)
- Why they're interested in this expert
- Urgency level

### Action Buttons:
- **Start Outreach** - Begin contacting expert
- **Schedule Interviews** - Set up calendar invites
- **Discuss** - Team discussion about the request

---

## 🎯 Benefits

### For Users:
- Simple workflow: search → request → done
- No need to manually send expert info
- Clear communication of research intent

### For Your Team:
- **Immediate notification** when interview needed
- **All context** in one place (expert + topic)
- **LinkedIn links** for quick verification
- **Priority indicator** with urgency levels
- **Actionable** with buttons for next steps

---

## 🧪 Testing

**Wait for Render deployment** (~2-3 minutes), then test in ChatGPT:

1. Search for experts:
   ```
   "Find executives from Korn Ferry"
   ```

2. Request interview:
   ```
   "I'd like to schedule an interview with [expert name] to discuss vendor consolidation strategies"
   ```

3. Check Slack channel for notification

---

## ⚙️ Configuration

### Slack Webhook:
- **Environment Variable:** `SLACK_WEBHOOK_URL`
- **Set in:** Render dashboard → Environment
- **Format:** `https://hooks.slack.com/services/T.../B.../xxx`

### Slack App Manifest:
Already configured with scopes:
- `incoming-webhook`
- `chat:write`
- `chat:write.public`

---

## 🎊 Complete!

Your Expert Platform now provides a complete workflow:

1. **Search** for experts (ChatGPT)
2. **Review** results and background
3. **Request** interviews when ready
4. **Notification** sent to team with all context
5. **Take action** via Slack buttons

**Seamless expert sourcing and scheduling through ChatGPT!** 🚀
