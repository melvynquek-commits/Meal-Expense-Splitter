import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

const upload = multer({ storage: multer.memoryStorage() });
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/parse-receipt", upload.single("receipt"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const imagePart = {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype,
        },
      };

      const prompt = `Extract the items, their prices, and the total tax and service charge from this receipt.
      Return the data as a JSON object with this structure:
      {
        items: [{name: string, price: number}],
        serviceCharge: number,
        gst: number,
        total: number
      }`;

      const generateContentWithRetry = async (retries = 3): Promise<any> => {
        try {
          return await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: { parts: [imagePart, { text: prompt }] },
          });
        } catch (error: any) {
          if (retries > 0 && error?.status === 503) {
            console.log(`Retrying Gemini API call... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return generateContentWithRetry(retries - 1);
          }
          throw error;
        }
      };

      const response = await generateContentWithRetry();
      
      const responseText = response.text || "";
      const parsedData = JSON.parse(responseText.replace(/```json\n?|\n?```/g, ""));
      
      res.json(parsedData);
    } catch (error) {
      console.error("Error parsing receipt:", error);
      res.status(500).json({ error: "Failed to parse receipt" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
