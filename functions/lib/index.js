"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPdf = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const genai_1 = require("@google/genai");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
admin.initializeApp();
const db = admin.firestore();
// Note: Ensure the API_KEY environment variable is set for the function
// firebase functions:config:set google.api_key="YOUR_API_KEY"
// or access it via process.env.API_KEY if set in secrets
const apiKey = process.env.API_KEY || "";
const genAI = new genai_1.GoogleGenAI({ apiKey });
exports.processPdf = functions.storage.object().onFinalize(async (object) => {
    const fileBucket = object.bucket;
    const filePath = object.name; // File path in the bucket.
    const contentType = object.contentType;
    // Exit if this is triggered on a file that is not a PDF.
    if (!contentType || !contentType.startsWith("application/pdf")) {
        return console.log("This is not a PDF.");
    }
    // Check if filePath is valid
    if (!filePath) {
        return console.log("No file path.");
    }
    // Get the file name.
    const fileName = path.basename(filePath);
    // Download file from bucket.
    const bucket = admin.storage().bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    try {
        await bucket.file(filePath).download({ destination: tempFilePath });
        console.log("File downloaded locally to", tempFilePath);
        // Read the PDF
        const dataBuffer = fs.readFileSync(tempFilePath);
        const pdfData = await (0, pdf_parse_1.default)(dataBuffer);
        const text = pdfData.text;
        if (!text || text.trim().length === 0) {
            console.log("No text extracted from PDF.");
            return;
        }
        // Call Gemini to structure the data
        const model = "gemini-1.5-flash";
        const prompt = `
      You are an expert data extractor. Analyze the following text extracted from a PDF document.
      The document is likely related to career guidance, university prospectuses, or educational reports in Kenya.

      Extract structured data in JSON format.
      If it describes a specific career, extract: Title, RIASEC Code (if inferable), Description, Education Required, Salary Range, Job Outlook, Employers, Personality Fit, Resources.
      If it describes an institution, extract: Name, Courses Offered, Admission Requirements, Contact Info.
      If it is a general report, extract: Title, Summary, Key Findings, Date.

      Return ONLY the JSON object. Do not wrap it in markdown code blocks.

      Text:
      ${text.substring(0, 30000)}
    `;
        const response = await genAI.models.generateContent({
            model: model,
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt }
                    ]
                }
            ]
        });
        const responseText = response.text;
        let structuredData;
        try {
            // clean up markdown if present
            const jsonStr = responseText === null || responseText === void 0 ? void 0 : responseText.replace(/```json/g, "").replace(/```/g, "").trim();
            if (jsonStr) {
                structuredData = JSON.parse(jsonStr);
            }
        }
        catch (e) {
            console.error("Failed to parse JSON from Gemini response", e);
            structuredData = { raw_text: responseText };
        }
        // Save to Firestore
        const docId = fileName.replace(/\.[^/.]+$/, ""); // remove extension
        await db.collection("extracted_data").doc(docId).set({
            fileName: fileName,
            originalPath: filePath,
            extractedAt: admin.firestore.FieldValue.serverTimestamp(),
            data: structuredData,
            rawTextSummary: text.substring(0, 500) + "..."
        });
        console.log("Successfully processed PDF and saved data.");
    }
    catch (error) {
        console.error("Error processing PDF:", error);
    }
    finally {
        // Cleanup temp file
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
});
//# sourceMappingURL=index.js.map