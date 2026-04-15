import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import crypto from "crypto";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // In-memory transaction storage
  const transactions: Record<string, any> = {};

  // Flutterwave Config
  const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || "";
  const FLW_WEBHOOK_HASH = process.env.FLW_WEBHOOK_HASH || "";

  // Binance Config
  const BINANCE_API_KEY = process.env.BINANCE_API_KEY || "";
  const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || "";

  // API Routes
  app.get("/api/transactions", (req, res) => {
    res.json(Object.values(transactions).sort((a, b) => b.timestamp - a.timestamp));
  });

  app.post("/api/create-payment", async (req, res) => {
    try {
      const { amount, currency, email, customerName } = req.body;
      const tx_ref = `tx-${Date.now()}`;

      // If keys are missing, simulate success for demo purposes
      if (!FLW_SECRET_KEY) {
        const mockLink = `https://checkout.flutterwave.com/v3/hosted/pay/mock-${tx_ref}`;
        transactions[tx_ref] = {
          tx_ref,
          amount,
          currency,
          email,
          customerName,
          status: "pending",
          timestamp: Date.now(),
          isMock: true
        };
        return res.json({ link: mockLink, tx_ref, isMock: true });
      }

      const response = await axios.post(
        "https://api.flutterwave.com/v3/payments",
        {
          tx_ref,
          amount,
          currency,
          redirect_url: `${process.env.APP_URL || `http://localhost:${PORT}`}/callback`,
          customer: { email, name: customerName },
          customizations: {
            title: "Enterprise POS Payment",
            description: "Payment for goods/services",
            logo: "https://picsum.photos/seed/pos/200/200"
          }
        },
        {
          headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` }
        }
      );

      transactions[tx_ref] = {
        tx_ref,
        amount,
        currency,
        email,
        customerName,
        status: "pending",
        timestamp: Date.now()
      };

      res.json({ link: response.data.data.link, tx_ref });
    } catch (error: any) {
      console.error("Flutterwave Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  // NEW: Offline Sync Endpoint
  app.post("/api/sync-offline", async (req, res) => {
    try {
      const { payments } = req.body; // Array of { amount, currency, tx_ref (offline) }
      const results = [];

      for (const p of payments) {
        const tx_ref = `tx-sync-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        if (!FLW_SECRET_KEY) {
          const mockLink = `https://checkout.flutterwave.com/v3/hosted/pay/mock-${tx_ref}`;
          transactions[tx_ref] = {
            tx_ref,
            amount: p.amount,
            currency: p.currency,
            email: "offline@pos.com",
            customerName: "Offline Customer",
            status: "pending",
            timestamp: Date.now(),
            isMock: true,
            offline_ref: p.tx_ref
          };
          results.push({ old_tx: p.tx_ref, new_tx: tx_ref, link: mockLink });
          continue;
        }

        const response = await axios.post(
          "https://api.flutterwave.com/v3/payments",
          {
            tx_ref,
            amount: p.amount,
            currency: p.currency,
            redirect_url: `${process.env.APP_URL || `http://localhost:${PORT}`}/callback`,
            customer: { email: "offline@pos.com", name: "Offline Customer" },
            customizations: {
              title: "Offline Synced Payment",
              description: `Sync for offline ref: ${p.tx_ref}`
            }
          },
          {
            headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` }
          }
        );

        transactions[tx_ref] = {
          tx_ref,
          amount: p.amount,
          currency: p.currency,
          email: "offline@pos.com",
          customerName: "Offline Customer",
          status: "pending",
          timestamp: Date.now(),
          offline_ref: p.tx_ref
        };

        results.push({
          old_tx: p.tx_ref,
          new_tx: tx_ref,
          link: response.data.data.link
        });
      }

      res.json({ synced: results });
    } catch (error: any) {
      console.error("Sync Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to sync offline payments" });
    }
  });

  app.get("/api/status/:tx_ref", (req, res) => {
    const { tx_ref } = req.params;
    res.json(transactions[tx_ref] || { status: "unknown" });
  });

  // Webhook for Flutterwave
  app.post("/api/webhook", async (req, res) => {
    const signature = req.headers["verif-hash"];

    if (FLW_WEBHOOK_HASH && signature !== FLW_WEBHOOK_HASH) {
      return res.status(401).send("Invalid signature");
    }

    const { event, data } = req.body;

    if (event === "charge.completed" && data.status === "successful") {
      const tx_ref = data.tx_ref;
      if (transactions[tx_ref]) {
        transactions[tx_ref].status = "paid";
        transactions[tx_ref].flw_id = data.id;
        transactions[tx_ref].paid_at = Date.now();

        // Trigger Binance Settlement (USD -> USDT Convert API)
        if (BINANCE_API_KEY && BINANCE_API_SECRET) {
          try {
            const binanceResult = await convertUSDToUSDT(data.amount);
            transactions[tx_ref].binance_status = "converted (USDT)";
            transactions[tx_ref].binance_order_id = binanceResult.orderId;
          } catch (err) {
            console.error("Binance Conversion Failed:", err);
            transactions[tx_ref].binance_status = "conversion failed";
          }
        } else {
          transactions[tx_ref].binance_status = "skipped (no keys)";
        }
      }
    }

    res.status(200).send("Webhook received");
  });

  // Mock endpoint to manually confirm a payment for demo purposes
  app.post("/api/mock-confirm/:tx_ref", async (req, res) => {
    const { tx_ref } = req.params;
    if (transactions[tx_ref]) {
      transactions[tx_ref].status = "paid";
      transactions[tx_ref].paid_at = Date.now();
      
      if (BINANCE_API_KEY && BINANCE_API_SECRET) {
        transactions[tx_ref].binance_status = "simulating conversion...";
      } else {
        transactions[tx_ref].binance_status = "skipped (no keys)";
      }
      
      return res.json({ success: true, transaction: transactions[tx_ref] });
    }
    res.status(404).json({ error: "Transaction not found" });
  });

  // UPDATED: Binance Convert API Flow (USD -> USDT)
  async function convertUSDToUSDT(amount: number) {
    const timestamp = Date.now();
    
    // 1. Get Quote
    const quoteParams = `fromAsset=USD&toAsset=USDT&fromAmount=${amount}&timestamp=${timestamp}`;
    const quoteSignature = crypto
      .createHmac("sha256", BINANCE_API_SECRET)
      .update(quoteParams)
      .digest("hex");

    const quoteResponse = await axios.post(
      `https://api.binance.com/sapi/v1/convert/getQuote?${quoteParams}&signature=${quoteSignature}`,
      {},
      {
        headers: { "X-MBX-APIKEY": BINANCE_API_KEY }
      }
    );

    const quoteId = quoteResponse.data.quoteId;

    // 2. Accept Quote
    const acceptParams = `quoteId=${quoteId}&timestamp=${Date.now()}`;
    const acceptSignature = crypto
      .createHmac("sha256", BINANCE_API_SECRET)
      .update(acceptParams)
      .digest("hex");

    const acceptResponse = await axios.post(
      `https://api.binance.com/sapi/v1/convert/acceptQuote?${acceptParams}&signature=${acceptSignature}`,
      {},
      {
        headers: { "X-MBX-APIKEY": BINANCE_API_KEY }
      }
    );

    return acceptResponse.data;
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
