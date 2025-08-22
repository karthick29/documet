import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"
import Papa from "papaparse"
import * as XLSX from 'xlsx';

interface Transaction {
  DATE: string;
  DESCRIPTION: string;
  DEBITS?: string | number;
  CREDITS?: string | number;
  BALANCE: string | number;
}

interface CheckDetail {
  DATE: string;
  PARTICULARS: string;
  CHEQUE_NO: string;
  AMOUNT: string | number;
  NARRATION: string;
}

interface MonthlyData {
  accountSummary: any;
  transactions: Transaction[];
  checkDetails: CheckDetail[];
}

// Add configuration for Google AI
const GOOGLE_AI_API_KEY = "AIzaSyA4U0zpQRUL9f8C6MMfzqXs0CX67lF3bWw"
if (!GOOGLE_AI_API_KEY) {
  console.error('Google AI API key is not configured');
}

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await mkdir(join(process.cwd(), "public", "uploads"), { recursive: true })
  } catch (error) {
    console.error("Failed to create uploads directory:", error)
  }
}

// Helper function to parse and format date from MM/DD/YY to a standardized format
const parseDate = (dateStr: string) => {
  // Handle MM/DD/YY format
  const parts = dateStr.split(/[/-]/)
  if (parts.length !== 3) return null

  // Convert parts to numbers, ensuring valid integers
  // In MM/DD/YY format, first part is month, second is day
  const month = parseInt(parts[0], 10)
  const day = parseInt(parts[1], 10)
  let year = parseInt(parts[2], 10)

  // Validate the parsed values
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  // Add 2000 to two-digit years
  if (year < 100) {
    year += 2000
  }

  // Handle fiscal year transition
  // For 2024-2025 fiscal year:
  // If month is December (12), use 2024
  // If month is January-November (1-11), use 2025
  const fiscalYear = month === 12 ? 2024 : 2025

  // Format with leading zeros
  const monthStr = month.toString().padStart(2, '0')
  const dayStr = day.toString().padStart(2, '0')

  return {
    formatted: `${monthStr}/${dayStr}/${fiscalYear}`,
    monthToDate: `${monthStr}-${fiscalYear}`,
    sortableDate: new Date(fiscalYear, month - 1, day)
  }
}

// Helper function to parse amount strings to numbers
const parseAmount = (amount: string | number): number => {
  if (typeof amount === 'number') return amount
  return parseFloat(amount.replace(/[,₹]/g, '')) || 0
}

// Helper function to validate and clean transaction amounts
const cleanTransactionAmount = (transaction: Transaction) => {
  // Convert amounts to numbers for comparison
  const debitAmount = transaction.DEBITS ? parseAmount(transaction.DEBITS) : 0
  const creditAmount = transaction.CREDITS ? parseAmount(transaction.CREDITS) : 0

  // If both debit and credit are present, determine the correct one based on amount and description
  if (debitAmount > 0 && creditAmount > 0) {
    // Expanded debit keywords
    const debitKeywords = [
      'payment', 'withdrawal', 'debit', 'purchase', 'fee', 'charge', 'transfer to',
      'ach debit', 'check', 'cheque', 'withdrawal fee', 'service charge', 'overdraft',
      'pos purchase', 'atm withdrawal', 'monthly fee', 'maintenance fee', 'wire transfer out',
      'checks paid', 'atm & debit card withdrawals', 'electronic withdrawals',
      'debit card', 'atm transaction', 'electronic payment', 'online payment',
      'bill payment', 'automatic payment', 'ach withdrawal', 'pos transaction'
    ]
    // Expanded credit keywords
    const creditKeywords = [
      'deposit', 'credit', 'transfer from', 'refund', 'interest', 'reversal',
      'ach credit', 'direct deposit', 'incoming transfer', 'credit adjustment',
      'returned item', 'refund credit', 'interest credit', 'cash deposit',
      'wire transfer in', 'mobile deposit', 'deposit adjustment', 'credit memo',
      'deposits and additions', 'deposit addition', 'incoming ach', 'payroll deposit',
      'electronic deposit', 'automatic deposit', 'credit transfer', 'deposit credit'
    ]

    const description = transaction.DESCRIPTION.toLowerCase()
    
    // Check for section-based classification first
    const isCreditSection = description.includes('deposits and additions') || 
                           description.includes('deposit addition')
    const isDebitSection = description.includes('checks paid') || 
                          description.includes('atm & debit card withdrawals') ||
                          description.includes('electronic withdrawals') ||
                          description.includes('atm and debit card withdrawals')
    
    // Check description for keywords
    const isLikelyDebit = debitKeywords.some(keyword => description.includes(keyword))
    const isLikelyCredit = creditKeywords.some(keyword => description.includes(keyword))

    // Priority 1: Section-based classification
    if (isCreditSection) {
      transaction.DEBITS = undefined
    } else if (isDebitSection) {
      transaction.CREDITS = undefined
    }
    // Priority 2: Keyword-based classification
    else if (isLikelyDebit && !isLikelyCredit) {
      transaction.CREDITS = undefined
    } else if (isLikelyCredit && !isLikelyDebit) {
      transaction.DEBITS = undefined
    } else {
      // If no clear indication or both keywords found, keep the larger amount and clear the smaller one
      if (debitAmount >= creditAmount) {
        transaction.CREDITS = undefined
      } else {
        transaction.DEBITS = undefined
      }
    }
  }

  // Ensure amounts are properly formatted
  if (transaction.DEBITS && transaction.DEBITS !== "0" && transaction.DEBITS !== "0.00") {
    transaction.DEBITS = parseAmount(transaction.DEBITS).toFixed(2)
    transaction.CREDITS = undefined
  }
  if (transaction.CREDITS && transaction.CREDITS !== "0" && transaction.CREDITS !== "0.00") {
    transaction.CREDITS = parseAmount(transaction.CREDITS).toFixed(2)
    transaction.DEBITS = undefined
  }

  return transaction
}

// Helper function to organize data by month-to-date
const organizeByMonthToDate = (data: any) => {
  const monthlyData: { [key: string]: MonthlyData } = {}

  // Ensure data has the expected structure even if properties are missing
  if (!data) data = {};
  if (!data.transactions) data.transactions = [];
  if (!data.checkDetails) data.checkDetails = [];
  if (!data.accountSummary) data.accountSummary = {};
  
  // Make sure transactions and checkDetails are arrays
  if (!Array.isArray(data.transactions)) data.transactions = [];
  if (!Array.isArray(data.checkDetails)) data.checkDetails = [];

  if (data.transactions && Array.isArray(data.transactions)) {
    // Filter out check-related transactions
    const filteredTransactions = data.transactions
      .filter((t: Transaction) => 
        !t.DESCRIPTION.toLowerCase().includes('cheque') && 
        !t.DESCRIPTION.toLowerCase().includes('check')
      )
      .map(cleanTransactionAmount) // Clean and validate each transaction

    // First sort transactions by date
    filteredTransactions.sort((a: Transaction, b: Transaction) => {
      // First sort by debit/credit (debits first)
      if (a.DEBITS && !b.DEBITS) return -1
      if (!a.DEBITS && b.DEBITS) return 1

      // If both are debits or both are credits, sort by date
      const dateA = parseDate(a.DATE)?.sortableDate || new Date(0)
      const dateB = parseDate(b.DATE)?.sortableDate || new Date(0)
      return dateA.getTime() - dateB.getTime()
    })

    filteredTransactions.forEach((transaction: Transaction) => {
      const parsedDate = parseDate(transaction.DATE)
      if (!parsedDate) return

      const monthToDate = parsedDate.monthToDate
      
      if (!monthlyData[monthToDate]) {
        monthlyData[monthToDate] = {
          accountSummary: data.accountSummary,
          transactions: [],
          checkDetails: []
        }
      }
      
      // Update the transaction date to the formatted version
      transaction.DATE = parsedDate.formatted
      monthlyData[monthToDate].transactions.push(transaction)
    })
  }

  if (data.checkDetails && Array.isArray(data.checkDetails)) {
    // Sort check details by date
    data.checkDetails.sort((a: CheckDetail, b: CheckDetail) => {
      const dateA = parseDate(a.DATE)?.sortableDate || new Date(0)
      const dateB = parseDate(b.DATE)?.sortableDate || new Date(0)
      return dateA.getTime() - dateB.getTime()
    })

    data.checkDetails.forEach((check: CheckDetail) => {
      const parsedDate = parseDate(check.DATE)
      if (!parsedDate) return

      const monthToDate = parsedDate.monthToDate
      
      if (!monthlyData[monthToDate]) {
        monthlyData[monthToDate] = {
          accountSummary: data.accountSummary,
          transactions: [],
          checkDetails: []
        }
      }
      
      // Update the check date to the formatted version
      check.DATE = parsedDate.formatted
      monthlyData[monthToDate].checkDetails.push(check)
    })
  }

  // Calculate monthly totals for each month
  Object.keys(monthlyData).forEach(monthToDate => {
    const monthData = monthlyData[monthToDate]
    let totalCredits = 0
    let totalDebits = 0

    // Calculate totals from regular transactions
    monthData.transactions.forEach(transaction => {
      if (transaction.CREDITS) {
        totalCredits += parseAmount(transaction.CREDITS)
      }
      if (transaction.DEBITS) {
        totalDebits += parseAmount(transaction.DEBITS)
      }
    })

    // Add check amounts to total debits
    if (monthData.checkDetails && monthData.checkDetails.length > 0) {
      monthData.checkDetails.forEach(check => {
        if (check.AMOUNT) {
          totalDebits += parseAmount(check.AMOUNT)
        }
      })
    }

    monthData.accountSummary = {
      ...monthData.accountSummary,
      totalCredits: totalCredits.toFixed(2),
      totalDebits: totalDebits.toFixed(2)
    }
  })

  return monthlyData
}

// Improved JSON repair function to handle malformed JSON
function repairJSON(jsonString: string): any {
  console.log("Attempting JSON repair on:", jsonString.substring(0, 100) + "...");
  
  // Try direct parsing first
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.log("Initial JSON parse failed, attempting comprehensive repair...");
  }

  // Clean up the string step by step
  let cleaned = jsonString;

  // Step 1: Remove markdown formatting if present
  cleaned = cleaned.replace(/```(?:json)?\s*\n?/gi, '').replace(/\n?```/g, '');

  // Step 2: Remove comments and explanatory text
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  
  // Step 3: Extract the main JSON object more carefully
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  // Step 4: Fix common JSON issues
  cleaned = cleaned
    // Remove trailing commas
    .replace(/,(\s*[}\]])/g, '$1')
    // Fix unescaped quotes in strings (basic approach)
    .replace(/([^\\])"([^":\[\]{},\s][^"]*)"([^:])/g, '$1\\"$2\\"$3')
    // Fix missing quotes around keys
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    // Fix single quotes to double quotes
    .replace(/'/g, '"')
    // Fix escaped quotes that are incorrectly escaped
    .replace(/\\"/g, '\\"')
    // Remove multiple consecutive commas
    .replace(/,+/g, ',')
    // Fix spacing issues
    .replace(/:\s*([^",\[\]{}\s][^",\[\]{}]*[^",\[\]{}\s])\s*([,}\]])/g, ':"$1"$2');

  // Step 5: Try parsing the cleaned version
  try {
    const parsed = JSON.parse(cleaned);
    console.log("JSON repair successful");
    return parsed;
  } catch (e) {
    console.log("Standard repair failed, trying advanced repair...");
  }

  // Step 6: Advanced repair - handle character by character
  try {
    let result = '';
    let inString = false;
    let prevChar = '';
    
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      
      if (char === '"' && prevChar !== '\\') {
        inString = !inString;
        result += char;
      } else if (inString) {
        // Inside a string - handle special characters
        if (char === '"' && prevChar !== '\\') {
          result += '\\"'; // Escape unescaped quotes
        } else if (char === '\\' && cleaned[i + 1] === '"') {
          result += '\\"'; // Keep properly escaped quotes
          i++; // Skip next character
        } else {
          result += char;
        }
      } else {
        // Outside string - normal processing
        result += char;
      }
      
      prevChar = char;
    }
    
    const advancedParsed = JSON.parse(result);
    console.log("Advanced JSON repair successful");
    return advancedParsed;
  } catch (e) {
    console.log("Advanced repair also failed");
  }

  // Step 7: Last resort - try to extract and reconstruct key parts
  try {
    console.log("Attempting structural reconstruction...");
    
    // Extract sections using more flexible patterns
    const accountSummaryMatch = cleaned.match(/"accountSummary"\s*:\s*\{[^}]*\}/i);
    const transactionsMatch = cleaned.match(/"transactions"\s*:\s*\[[^\]]*\]/i);
    const checkDetailsMatch = cleaned.match(/"checkDetails"\s*:\s*\[[^\]]*\]/i);
    
    let reconstructed = '{';
    
    if (accountSummaryMatch) {
      reconstructed += accountSummaryMatch[0] + ',';
    } else {
      reconstructed += '"accountSummary":{},';
    }
    
    if (transactionsMatch) {
      reconstructed += transactionsMatch[0] + ',';
    } else {
      reconstructed += '"transactions":[],';
    }
    
    if (checkDetailsMatch) {
      reconstructed += checkDetailsMatch[0];
    } else {
      reconstructed += '"checkDetails":[]';
    }
    
    reconstructed += '}';
    
    // Clean up the reconstructed JSON
    reconstructed = reconstructed.replace(/,+/g, ',').replace(/,}/g, '}');
    
    const reconstructedParsed = JSON.parse(reconstructed);
    console.log("Structural reconstruction successful");
    return reconstructedParsed;
  } catch (e) {
    console.log("Structural reconstruction failed");
  }

  // Step 8: Final fallback - return minimal valid structure
  console.log("All repair attempts failed, returning minimal structure");
  return {
    accountSummary: {
      companyName: "",
      bankName: "",
      accountNumber: "",
      openingBalance: "0.00",
      totalCredits: "0.00",
      totalDebits: "0.00",
      closingBalance: "0.00"
    },
    transactions: [],
    checkDetails: []
  };
}

// Function to validate image content type
const isValidImageMimeType = (mimeType: string): boolean => {
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "application/pdf",
  ];
  return validTypes.includes(mimeType);
};

// Improved JSON extraction and parsing function
function extractAndParseJSON(text: string): any {
  console.log("Raw AI Response:", text.substring(0, 200) + "...");
  
  // Step 1: Try direct JSON parse first
  try {
    const parsed = JSON.parse(text);
    console.log("Direct JSON parse successful");
    return parsed;
  } catch (e) {
    console.log("Direct JSON parse failed, trying extraction methods...");
  }

  // Step 2: Handle markdown-wrapped JSON (```json ... ```)
  const markdownJsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (markdownJsonMatch) {
    console.log("Found markdown-wrapped JSON");
    try {
      const parsed = JSON.parse(markdownJsonMatch[1].trim());
      console.log("Markdown JSON parse successful");
      return parsed;
    } catch (e) {
      console.log("Markdown JSON parse failed, trying repair on extracted content");
      return repairJSON(markdownJsonMatch[1].trim());
    }
  }

  // Step 3: Extract JSON object using regex (improved pattern)
  const jsonObjectMatch = text.match(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}))*\}/);
  if (jsonObjectMatch) {
    console.log("Found JSON object using regex");
    try {
      const parsed = JSON.parse(jsonObjectMatch[0]);
      console.log("Regex-extracted JSON parse successful");
      return parsed;
    } catch (e) {
      console.log("Regex-extracted JSON parse failed, trying repair");
      return repairJSON(jsonObjectMatch[0]);
    }
  }

  // Step 4: Try to find JSON between common delimiters
  const delimiters = [
    { start: '{', end: '}' },
    { start: 'json\n{', end: '}\n' },
    { start: '{\n', end: '\n}' }
  ];

  for (const delimiter of delimiters) {
    const startIndex = text.indexOf(delimiter.start);
    const endIndex = text.lastIndexOf(delimiter.end);
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const extracted = text.substring(startIndex, endIndex + delimiter.end.length);
      console.log(`Trying delimiter extraction: ${delimiter.start}...${delimiter.end}`);
      
      try {
        const parsed = JSON.parse(extracted);
        console.log("Delimiter-extracted JSON parse successful");
        return parsed;
      } catch (e) {
        console.log("Delimiter-extracted JSON parse failed, trying repair");
        const repaired = repairJSON(extracted);
        if (repaired && typeof repaired === 'object' && Object.keys(repaired).length > 0) {
          return repaired;
        }
      }
    }
  }

  // Step 5: Last resort - try to repair the entire text
  console.log("All extraction methods failed, attempting full text repair");
  return repairJSON(text);
}

export async function POST(request: NextRequest) {
  try {
    // Parse the form data
    const formData = await request.formData()
    const imageFiles = formData.getAll("image") as File[]
    const companyName = formData.get("companyName") as string

    if (!imageFiles.length) {
      return NextResponse.json({ error: "No image files provided" }, { status: 400 })
    }

    const allMonthlyData: { [key: string]: MonthlyData } = {}
    let hasSuccessfulExtraction = false;

    // Process each file
    for (const imageFile of imageFiles) {
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      const mimeType = imageFile.type;
      
      if (!isValidImageMimeType(mimeType)) {
        console.warn(`Invalid MIME type detected: ${mimeType}`);
        return NextResponse.json(
          { error: `Invalid image file type: ${mimeType}` },
          { status: 400 },
        );
      }

      // Configure Google AI client with retry logic
      let retries = 3;
      let lastError = null;
      let useShortPrompt = false;
      let useHigherCapacityModel = true;
      
      while (retries > 0) {
        try {
          // Use higher capacity model if we've hit token limits multiple times
          const modelName = useHigherCapacityModel ? "gemini-2.5-flash-preview-05-20" : "gemini-2.0-flash";
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GOOGLE_AI_API_KEY}`;
          
          console.log(`Using ${useShortPrompt ? 'short' : 'full'} prompt with ${modelName} (${4 - retries}/3 attempts)`);
          
          // Choose prompt based on whether we need to use a shorter version
          const fullPrompt = `Extract all transaction data, account summary information, and check details from this bank statement image. The dates in the bank statement are in MM/DD/YY format. For fiscal year 2024-2025, December dates are in 2024 and January-November dates are in 2025.

                CRITICAL TRANSACTION IDENTIFICATION RULES:
                - DEBITS (money going out): Purchases, payments, fees, withdrawals, checks, transfers out, ATM withdrawals, service charges
                - CREDITS (money coming in): Deposits, incoming transfers, refunds, interest earned, direct deposits, cash deposits, returned items
                
                SECTION-BASED CLASSIFICATION:
                - "DEPOSITS AND ADDITIONS" section = All transactions are CREDITS
                - "CHECKS PAID" section = All transactions are DEBITS  
                - "ATM & DEBIT CARD WITHDRAWALS" section = All transactions are DEBITS
                - "ELECTRONIC WITHDRAWALS" section = All transactions are DEBITS
                
                GENERAL RULES:
                - Look at BOTH the section header AND the transaction description
                - If amount is in a "Debit" or "Withdrawal" column, use DEBITS field
                - If amount is in a "Credit" or "Deposit" column, use CREDITS field
                - If unclear from column, use description keywords to determine:
                  * Debit keywords: payment, withdrawal, purchase, fee, charge, check, ATM, service charge, transfer to, electronic withdrawal, debit card
                  * Credit keywords: deposit, credit, transfer from, refund, interest, direct deposit, incoming, cash deposit, deposit addition
                - NEVER set both DEBITS and CREDITS for the same transaction
                - Zero amounts should be ignored

                CRITICAL RESPONSE FORMAT REQUIREMENTS:
                - Your response MUST be ONLY a raw JSON object
                - Do NOT wrap the JSON in markdown code blocks (\`\`\`json)
                - Do NOT include any explanatory text before or after the JSON
                - Do NOT include comments in the JSON
                - The response must start with { and end with }

                Return ONLY this exact JSON structure:
                {
                  "accountSummary": {
                    "companyName": "Company name",
                    "bankName": "Bank name",
                    "accountNumber": "Account number",
                    "openingBalance": "123.45",
                    "totalCredits": "123.45",
                    "totalDebits": "123.45",
                    "closingBalance": "123.45"
                  },
                  "transactions": [
                    {
                      "DESCRIPTION": "Transaction description",
                      "DEBITS": "123.45",
                      "DATE": "MM/DD/YY",
                      "BALANCE": "123.45"
                    },
                    {
                      "DESCRIPTION": "Credit transaction description",
                      "CREDITS": "123.45",
                      "DATE": "MM/DD/YY",
                      "BALANCE": "123.45"
                    }
                  ],
                  "checkDetails": [
                    {
                      "DATE": "MM/DD/YY",
                      "PARTICULARS": "Particular's",
                      "CHEQUE_NO": "Cheque number",
                      "AMOUNT": "123.45",
                      "NARRATION": "Narration"
                    }
                  ]
                }

                Remember: ONLY return the JSON object, nothing else.`;

          const shortPrompt = `Extract bank data as JSON. MM/DD/YY dates. DEBITS=money out, CREDITS=money in. 
                SECTIONS: "DEPOSITS AND ADDITIONS"=CREDITS, "CHECKS PAID"=DEBITS, "ATM & DEBIT CARD WITHDRAWALS"=DEBITS, "ELECTRONIC WITHDRAWALS"=DEBITS.
                {"accountSummary":{"companyName":"","bankName":"","accountNumber":"","openingBalance":"0","totalCredits":"0","totalDebits":"0","closingBalance":"0"},"transactions":[{"DATE":"","DESCRIPTION":"","DEBITS":"","BALANCE":""},{"DATE":"","DESCRIPTION":"","CREDITS":"","BALANCE":""}],"checkDetails":[{"DATE":"","PARTICULARS":"","CHEQUE_NO":"","AMOUNT":"","NARRATION":""}]}`;

          const requestBody = {
            contents: [
              {
                parts: [
                  {
                    text: useShortPrompt ? shortPrompt : fullPrompt
                  },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: buffer.toString('base64')
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.0,
              candidateCount: 1,
              maxOutputTokens: useHigherCapacityModel ? 65536 : 8192  // Gemini 2.5 Flash has 65,536, Gemini 2.0 Flash has 8,192
            }
          };

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
          }

          const result = await response.json();
          console.log("API Response structure:", JSON.stringify(result, null, 2));

          // Check for MAX_TOKENS finish reason
          const candidate = result?.candidates?.[0];
          if (candidate?.finishReason === "MAX_TOKENS") {
            console.warn("Response was truncated due to token limit.");
            
            if (!useShortPrompt) {
              console.log("Switching to short prompt for retry");
            //  useShortPrompt = true; // Try short prompt first
            } else if (!useHigherCapacityModel) {
              console.log("Switching to higher capacity model (Gemini 2.5 Flash) for retry");
              useHigherCapacityModel = true; // If short prompt also hits limit, try higher capacity model
              //useShortPrompt = true; // Keep using short prompt with higher capacity model
            }
            
            throw new Error("Response truncated - exceeding token limit");
          }

          // Extract text from the response
          const text = candidate?.content?.parts?.[0]?.text || '';
          
          if (!text) {
            throw new Error("No text content in API response");
          }

          console.log("Raw AI Response:", text);
          
          // Process the extracted text
          let extractedData;
          try {
            extractedData = extractAndParseJSON(text);
            console.log("Extracted data structure:", extractedData);
          } catch (e: any) {
            console.log("Extraction failed:", e?.message || 'Unknown error');
            console.log("Attempting repair...");
            extractedData = repairJSON(text);
            console.log("Repair result:", extractedData);
          }
          
          // Validate the extracted data structure
          if (!extractedData || typeof extractedData !== 'object') {
            console.log("Invalid data structure:", extractedData);
            throw new Error("Invalid data structure extracted from image");
          }

          // Ensure required fields exist
          if (!extractedData.accountSummary) {
            console.log("Missing accountSummary, creating empty object");
            extractedData.accountSummary = {};
          }
          if (!extractedData.transactions) {
            console.log("Missing transactions, creating empty array");
            extractedData.transactions = [];
          }
          if (!extractedData.checkDetails) {
            console.log("Missing checkDetails, creating empty array");
            extractedData.checkDetails = [];
          }

          // Validate transactions array
          if (!Array.isArray(extractedData.transactions)) {
            console.log("Transactions is not an array, converting...");
            extractedData.transactions = [];
          }

          // Validate check details array
          if (!Array.isArray(extractedData.checkDetails)) {
            console.log("Check details is not an array, converting...");
            extractedData.checkDetails = [];
          }

          // Log credit/debit analysis
          const creditCount = extractedData.transactions.filter((t: Transaction) => t.CREDITS && parseAmount(t.CREDITS) > 0).length;
          const debitCount = extractedData.transactions.filter((t: Transaction) => t.DEBITS && parseAmount(t.DEBITS) > 0).length;
          
          // Count section-based transactions
          const sectionBasedTransactions = extractedData.transactions.filter((t: Transaction) => {
            const desc = t.DESCRIPTION.toLowerCase();
            return desc.includes('deposits and additions') || 
                   desc.includes('checks paid') || 
                   desc.includes('atm & debit card withdrawals') || 
                   desc.includes('electronic withdrawals');
          });
          
          console.log("Transaction analysis:", {
            totalTransactions: extractedData.transactions.length,
            creditTransactions: creditCount,
            debitTransactions: debitCount,
            sectionBasedCount: sectionBasedTransactions.length,
            creditExamples: extractedData.transactions.filter((t: Transaction) => t.CREDITS && parseAmount(t.CREDITS) > 0).slice(0, 3).map((t: Transaction) => ({ desc: t.DESCRIPTION, amount: t.CREDITS })),
            debitExamples: extractedData.transactions.filter((t: Transaction) => t.DEBITS && parseAmount(t.DEBITS) > 0).slice(0, 3).map((t: Transaction) => ({ desc: t.DESCRIPTION, amount: t.DEBITS }))
          });

          // Log the final structure
          console.log("Final extracted data structure:", {
            hasAccountSummary: !!extractedData.accountSummary,
            transactionCount: extractedData.transactions.length,
            checkDetailsCount: extractedData.checkDetails.length
          });
          
          if (extractedData && Object.keys(extractedData).length > 0) {
            hasSuccessfulExtraction = true;
            const monthlyData = organizeByMonthToDate(extractedData);
            console.log("Monthly data organized:", Object.keys(monthlyData));
            Object.assign(allMonthlyData, monthlyData);
            break; // Success, exit retry loop
          }
          
          throw new Error("Failed to extract valid data from the image");
        } catch (error) {
          lastError = error;
          retries--;
          
          // Handle specific error types
          if (error instanceof Error && error.message.includes("Response truncated")) {
            if (useHigherCapacityModel) {
              console.log(`Token limit hit even with higher capacity model, ${retries} attempts remaining`);
            } else if (useShortPrompt) {
              console.log(`Token limit hit with short prompt, escalating to higher capacity model on retry (${retries} attempts remaining)`);
            } else {
              console.log(`Token limit hit, switching to short prompt for retry (${retries} attempts remaining)`);
            }
          } else {
            console.log(`Extraction attempt failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          if (retries > 0) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000));
            console.log(`Retrying... (${retries} attempts remaining)`);
          }
        }
      }

      if (retries === 0 && lastError) {
        console.error("All retry attempts failed:", lastError);
        return NextResponse.json({
          error: "The AI service is currently unavailable. Please try again in a few minutes.",
          details: lastError instanceof Error ? lastError.message : "Unknown error"
        }, { status: 503 });
      }
    }

    // Check if we have any data to process
    if (Object.keys(allMonthlyData).length === 0) {
      // We couldn't extract any data, but instead of failing immediately,
      // let's create a default month with empty structure
      if (!hasSuccessfulExtraction) {
        const currentDate = new Date();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const year = currentDate.getFullYear();
        const monthToDate = `${month}-${year}`;
        
        // Create a default transaction so we at least have something to display
        const defaultTransaction: Transaction = {
          DATE: `${month}/01/${year}`,
          DESCRIPTION: "Default transaction - please replace with actual data",
          DEBITS: "0.00",
          BALANCE: "0.00"
        };
        
        allMonthlyData[monthToDate] = {
          accountSummary: {
            companyName: companyName || '',
            bankName: '',
            accountNumber: '',
            openingBalance: '0.00',
            closingBalance: '0.00',
            totalCredits: '0.00',
            totalDebits: '0.00'
          },
          transactions: [defaultTransaction],
          checkDetails: []
        };
        
        console.log("Created default empty month data with placeholder transaction");
      } else {
        return NextResponse.json({
          error: "Could not extract any valid data from the provided images",
        }, { status: 400 });
      }
    }

    // Create Excel workbook with single sheet
    const workbook = XLSX.utils.book_new()

    // Combine all monthly data into a single dataset
    const allTransactions: Transaction[] = []
    const allCheckDetails: CheckDetail[] = []
    let combinedAccountSummary: any = {}
    let totalCredits = 0
    let totalDebits = 0
    let totalCheckAmount = 0

    // Collect all data from all months
    Object.entries(allMonthlyData).forEach(([monthToDate, data]) => {
      if (data.transactions && data.transactions.length > 0) {
        allTransactions.push(...data.transactions)
      }
      if (data.checkDetails && data.checkDetails.length > 0) {
        allCheckDetails.push(...data.checkDetails)
      }
      
      // Use the first available account summary or merge if multiple
      if (!combinedAccountSummary.companyName && data.accountSummary) {
        combinedAccountSummary = { ...data.accountSummary }
      }
      
      // Calculate totals
      if (data.transactions) {
        data.transactions.forEach((t: Transaction) => {
          if (t.DEBITS) totalDebits += parseAmount(t.DEBITS)
          if (t.CREDITS) totalCredits += parseAmount(t.CREDITS)
        })
      }
      
      if (data.checkDetails) {
        data.checkDetails.forEach((c: CheckDetail) => {
          if (c.AMOUNT) totalCheckAmount += parseAmount(c.AMOUNT)
        })
      }
    })

    // Sort all transactions: debits first, then credits, each sorted by date
    allTransactions.sort((a, b) => {
      // First sort by transaction type (debits first)
      const aIsDebit = !!a.DEBITS
      const bIsDebit = !!b.DEBITS
      
      if (aIsDebit && !bIsDebit) return -1  // a is debit, b is credit - a comes first
      if (!aIsDebit && bIsDebit) return 1   // a is credit, b is debit - b comes first
      
      // If both are same type (both debit or both credit), sort by date
      const dateA = parseDate(a.DATE)?.sortableDate || new Date(0)
      const dateB = parseDate(b.DATE)?.sortableDate || new Date(0)
      return dateA.getTime() - dateB.getTime()
    })

    // Sort all check details by date
    allCheckDetails.sort((a, b) => {
      const dateA = parseDate(a.DATE)?.sortableDate || new Date(0)
      const dateB = parseDate(b.DATE)?.sortableDate || new Date(0)
      return dateA.getTime() - dateB.getTime()
    })

    // Create single sheet with all data
    const sheetName = `${companyName || 'Bank Statement'}`
    
    // Account Summary Section
    const accountSummaryRows = [
      ['Company Name :', combinedAccountSummary?.companyName || companyName || ''],
      ['Bank Name :', combinedAccountSummary?.bankName || ''],
      ['Account No :', combinedAccountSummary?.accountNumber || ''],
      [''], // Empty row for spacing
    ]

    // Balance Summary Section with combined totals
    const balanceRows = [
      ['Opening Balance :', parseAmount(combinedAccountSummary?.openingBalance || '0.00').toFixed(2)],
      ['Credit :', totalCredits.toFixed(2)],
      ['Debit :', (totalDebits + totalCheckAmount).toFixed(2)],
      ['Closing Balance :', parseAmount(combinedAccountSummary?.closingBalance || '0.00').toFixed(2)],
    ]

    // Transaction Headers with right-side details
    const transactionHeader = ['Date', "Particular's", 'Debit', 'Credit', 'Balance', '', 'Description', 'Amount', '', 'Description', 'Document No']

    // Format transactions with right-side details
    let documentCounter = 1
    const formattedTransactions = allTransactions.map((t: Transaction) => {
      // Get the amount for the Amount column
      let amount = ''
      let documentNo = ''
      
      if (t.DEBITS) {
        amount = parseAmount(t.DEBITS).toFixed(2)
        // Only assign document numbers for debit transactions
        documentNo = `DD${documentCounter.toString().padStart(3, '0')}`
        documentCounter++
      } else if (t.CREDITS) {
        amount = parseAmount(t.CREDITS).toFixed(2)
        // Leave document number empty for credit transactions
        documentNo = ''
      }

      return [
        t.DATE || '',
        t.DESCRIPTION || '',
        t.DEBITS ? parseAmount(t.DEBITS).toFixed(2) : '',
        t.CREDITS ? parseAmount(t.CREDITS).toFixed(2) : '',
        parseAmount(t.BALANCE || '0.00').toFixed(2),
        '',  // Empty column for spacing
        t.DESCRIPTION || '',  // Description for first section
        amount,  // Amount for first section
        '',  // Empty column for spacing
        t.DESCRIPTION || '',  // Description for second section
        documentNo  // Document number (only for debits)
      ]
    })

    // Add totals row with empty right-side columns
    const totalsRow = ['', '', totalDebits.toFixed(2), totalCredits.toFixed(2), '', '', '', '', '', '', '']

    // Add check details section
    const checkDetailsHeader = ['', '', '', '', '', '', '', '', '', '', '', '', ''] // Empty row
    const checkDetailsSectionHeader = ['Check Details'] // Section title
    const checkDetailsTableHeader = ['Date', "Particular's", 'Cheque No', 'Amount', 'Narration', '', 'Description', 'Amount', 'Narration', 'Cheque No']

    const formattedCheckDetails = allCheckDetails.map((c: CheckDetail) => [
      c.DATE || '',
      c.PARTICULARS || '',
      c.CHEQUE_NO || '',
      parseAmount(c.AMOUNT || '0.00').toFixed(2),
      c.NARRATION || '',
      '',  // Empty column for spacing
      c.PARTICULARS || '',  // Description
      parseAmount(c.AMOUNT || '0.00').toFixed(2),  // Amount
      c.NARRATION || '',  // Narration
      c.CHEQUE_NO || ''  // Cheque No
    ])

    // Add check details total row
    const checkTotalRow = ['', '', '', totalCheckAmount.toFixed(2), '', '', '', totalCheckAmount.toFixed(2), '', '']

    // Combine all rows
    const sheetData = [
      ...accountSummaryRows,
      ...balanceRows,
      [''], // Empty row for spacing
      transactionHeader,
      ...formattedTransactions,
      totalsRow,
      [''], // Empty row for spacing
      checkDetailsHeader,
      checkDetailsSectionHeader,
      checkDetailsTableHeader,
      ...formattedCheckDetails,
      checkTotalRow  // Add the check total row
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

    // Set column widths
    const cols = [
      { wch: 12 },  // Date
      { wch: 40 },  // Particular's
      { wch: 15 },  // Debit
      { wch: 15 },  // Credit
      { wch: 15 },  // Balance
      { wch: 5 },   // Empty spacing
      { wch: 40 },  // Description
      { wch: 15 },  // Amount
      { wch: 30 },  // Narration
      { wch: 15 }   // Cheque No
    ]
    worksheet['!cols'] = cols

    // Apply styles
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    
    for (let R = 0; R <= range.e.r; R++) {
      for (let C = 0; C <= range.e.c; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C })
        if (!worksheet[cellRef]) continue

        // Initialize cell style if not exists
        if (!worksheet[cellRef].s) worksheet[cellRef].s = {}

        // Default style
        worksheet[cellRef].s = {
          font: { name: 'Cambria', sz: 11 },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        }

        // Right align amounts in both sections
        if ((C === 2 || C === 3 || C === 4 || C === 7) && 
            R >= accountSummaryRows.length + balanceRows.length + 2 && 
            R < accountSummaryRows.length + balanceRows.length + formattedTransactions.length + 2) {
          worksheet[cellRef].s.alignment = { horizontal: 'right', vertical: 'center' }
        }

        // Left align descriptions and document numbers
        if ((C === 6 || C === 9 || C === 10) && 
            R >= accountSummaryRows.length + balanceRows.length + 2 && 
            R < accountSummaryRows.length + balanceRows.length + formattedTransactions.length + 2) {
          worksheet[cellRef].s.alignment = { horizontal: 'left', vertical: 'center' }
        }

        // Header row styles
        if (R === accountSummaryRows.length + balanceRows.length + 2 || 
            R === accountSummaryRows.length + balanceRows.length + formattedTransactions.length + 5) {
          worksheet[cellRef].s.font = { bold: true, name: 'Cambria', sz: 11 }
          worksheet[cellRef].s.fill = { fgColor: { rgb: 'F2F2F2' } }
        }

        // Check Details Section Header styling
        if (R === accountSummaryRows.length + balanceRows.length + formattedTransactions.length + 4) {
          worksheet[cellRef].s.font = { bold: true, name: 'Cambria', sz: 12 }
          if (C === 0) {
            worksheet[cellRef].s.fill = { fgColor: { rgb: 'E6E6E6' } }
          }
        }

        // Totals row style
        if (R === accountSummaryRows.length + balanceRows.length + formattedTransactions.length + 2) {
          if (C === 2 || C === 3) {
            worksheet[cellRef].s.font = { bold: true, name: 'Cambria', sz: 11 }
            worksheet[cellRef].s.alignment = { horizontal: 'right', vertical: 'center' }
          }
        }

        // Update styling for check details section
        if (R > accountSummaryRows.length + balanceRows.length + formattedTransactions.length + 5) {
          // Right align amounts in check details
          if (C === 3 || C === 7) {
            worksheet[cellRef].s.alignment = { horizontal: 'right', vertical: 'center' }
          }
          // Left align descriptions, narrations, and cheque numbers
          if (C === 6 || C === 8 || C === 9) {
            worksheet[cellRef].s.alignment = { horizontal: 'left', vertical: 'center' }
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    // Make sure we have at least one sheet in the workbook
    if (workbook.SheetNames.length === 0) {
      return NextResponse.json({
        error: "No valid transaction data could be extracted to create Excel sheets",
      }, { status: 400 });
    }

    // Convert workbook to base64
    const excelBuffer = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' })
    
    // Return the data and Excel content as base64
    return NextResponse.json({
      success: true,
      data: allMonthlyData,
      excelContent: excelBuffer,
      fileName: `${companyName || 'statement'}_${new Date().getTime()}.xlsx`
    })
  } catch (error) {
    console.error("Error processing images:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 },
    )
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}
