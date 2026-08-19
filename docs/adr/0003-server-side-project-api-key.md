---
status: accepted
---

# Use server-side project API key

Public game will authenticate OpenAI model calls with server-side project API key, not ChatGPT OAuth. Current OpenAI API documentation accepts project API credentials or workload-identity tokens and does not document ChatGPT subscription OAuth for public application model calls. Server routes protect credential and mint short-lived Realtime browser token; public players need no login.
