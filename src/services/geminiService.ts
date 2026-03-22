import { GoogleGenAI, Type } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAiInstance(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function analyzeExpense(receiptData: string, mimeType: string, treasury: any) {
  const ai = getAiInstance();
  const systemInstruction = `You are Aegis, an Autonomous Payment Engine powered by AI.
Your job is to analyze payment rules, evaluate triggers, and execute programmable crypto payments autonomously.
You must output a JSON object with your decision.

Financial Constraints:
- Daily Spending Limit: $${treasury.dailyLimit}
- Spent Today: $${treasury.spentToday}
- Remaining Budget: $${treasury.dailyLimit - treasury.spentToday}

Active Rules:
${JSON.stringify(treasury.rules, null, 2)}

Rules:
1. CRITICAL: If the requested amount exceeds the Remaining Budget, you MUST "reject" the payment and set approved_amount to 0. State "Blocked due to risk: Exceeds daily spending limit" as the reason.
2. If the payment matches an active rule and is within budget, "approve". State "Executing recurring payment" or "Executing trigger payment" as the reason.
3. If the payment seems anomalous or risky compared to the rules, "reject" and set approved_amount to 0. State "Blocked due to risk: Anomalous behavior" as the reason.
4. Set risk_flag to "low", "medium", or "high".
`;

  const contents = [];
  if (mimeType === 'application/json') {
    contents.push(`Analyze this payment request: ${receiptData}`);
  } else {
    contents.push({
      inlineData: {
        data: receiptData,
        mimeType: mimeType,
      }
    });
    contents.push('Analyze this payment request image.');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: contents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          decision: { type: Type.STRING, enum: ['approve', 'partial', 'reject'] },
          confidence: { type: Type.NUMBER, description: '0-100' },
          approved_amount: { type: Type.NUMBER },
          reason: { type: Type.STRING },
          risk_flag: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
          category: { type: Type.STRING },
          merchant: { type: Type.STRING },
          total_amount: { type: Type.NUMBER },
          token: { type: Type.STRING, description: 'Token to use (e.g. USDT, USDC, ETH)' },
          recipient: { type: Type.STRING, description: 'Recipient wallet address' }
        },
        required: ['decision', 'confidence', 'approved_amount', 'reason', 'risk_flag', 'category', 'merchant', 'total_amount']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error('No response from AI');
  
  const cleanText = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(cleanText);
}
