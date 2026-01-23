import * as genai from '@google/genai';
console.log("Exports:", Object.keys(genai));
try {
    const ai = new genai.GoogleGenAI({ apiKey: "test" });
    console.log("Instance keys:", Object.keys(ai));
    console.log("Prototype keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(ai)));
} catch (e) {
    console.error("Instantiation failed:", e.message);
}
