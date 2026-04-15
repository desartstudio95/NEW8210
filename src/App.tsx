/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  CreditCard, 
  LayoutDashboard, 
  Smartphone, 
  History, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Bitcoin, 
  Printer,
  ChevronRight,
  User,
  DollarSign,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---
interface Transaction {
  tx_ref: string;
  amount: number;
  currency: string;
  email: string;
  customerName: string;
  status: "pending" | "paid" | "unknown";
  timestamp: number;
  paid_at?: number;
  binance_status?: string;
  binance_order_id?: string;
  isMock?: boolean;
}

// --- Components ---

const POSSimulator = ({ onPaymentCreated }: { onPaymentCreated: (tx: Transaction) => void }) => {
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("customer@example.com");
  const [name, setName] = useState("John Doe");
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [currentTx, setCurrentTx] = useState<Transaction | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  const handlePay = async () => {
    if (!amount || isNaN(Number(amount))) return;

    if (isOffline) {
      const offlineTx = {
        tx_ref: `offline-${Date.now()}`,
        amount: Number(amount),
        currency: "USD",
        timestamp: Date.now()
      };
      setOfflineQueue([...offlineQueue, offlineTx]);
      setAmount("");
      alert("Device Offline: Transaction added to local queue.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          currency: "USD",
          email,
          customerName: name
        })
      });
      const data = await res.json();
      setPaymentLink(data.link);
      
      const newTx: Transaction = {
        tx_ref: data.tx_ref,
        amount: Number(amount),
        currency: "USD",
        email,
        customerName: name,
        status: "pending",
        timestamp: Date.now(),
        isMock: data.isMock
      };
      setCurrentTx(newTx);
      onPaymentCreated(newTx);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const syncQueue = async () => {
    if (offlineQueue.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sync-offline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payments: offlineQueue })
      });
      const data = await res.json();
      
      // Open the first synced link for demo purposes
      if (data.synced && data.synced.length > 0) {
        setPaymentLink(data.synced[0].link);
        alert(`Synced ${data.synced.length} payments. Opening first checkout.`);
      }
      setOfflineQueue([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setAmount("");
    setPaymentLink(null);
    setCurrentTx(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] p-4">
      {/* Offline Toggle */}
      <div className="mb-6 flex items-center bg-[#111] p-2 rounded-full border border-[#222]">
        <button 
          onClick={() => setIsOffline(false)}
          className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${!isOffline ? "bg-[#00ff00] text-black" : "text-[#444]"}`}
        >
          ONLINE
        </button>
        <button 
          onClick={() => setIsOffline(true)}
          className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${isOffline ? "bg-red-500 text-white" : "text-[#444]"}`}
        >
          OFFLINE
        </button>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm bg-[#1a1a1a] rounded-[40px] p-8 shadow-2xl border-4 border-[#333] relative overflow-hidden"
      >
        {/* Newland NEW8210 Style Top */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-[#222] flex items-center justify-center border-b border-[#333]">
          <div className="w-16 h-1 bg-[#444] rounded-full"></div>
        </div>

        <div className="mt-8 space-y-6">
          <div className="text-center">
            <h2 className="text-[#888] text-xs font-mono uppercase tracking-widest">Enterprise POS</h2>
            <p className="text-white text-lg font-bold">NEW8210 Terminal</p>
            {isOffline && <p className="text-red-500 text-[10px] font-bold uppercase mt-1">Offline Mode Active</p>}
          </div>

          {!paymentLink ? (
            <div className="space-y-4">
              <div className="bg-[#000] p-4 rounded-xl border border-[#333]">
                <label className="text-[#666] text-[10px] uppercase font-bold block mb-1">Amount (USD)</label>
                <div className="flex items-center">
                  <span className="text-[#00ff00] text-2xl mr-2">$</span>
                  <input 
                    type="text" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-transparent text-[#00ff00] text-4xl font-mono w-full outline-none"
                  />
                </div>
              </div>

              {!isOffline && (
                <div className="space-y-2">
                  <div className="bg-[#222] p-3 rounded-lg flex items-center">
                    <User size={16} className="text-[#666] mr-3" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-transparent text-white text-sm w-full outline-none"
                      placeholder="Customer Name"
                    />
                  </div>
                  <div className="bg-[#222] p-3 rounded-lg flex items-center">
                    <Smartphone size={16} className="text-[#666] mr-3" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-transparent text-white text-sm w-full outline-none"
                      placeholder="Customer Email"
                    />
                  </div>
                </div>
              )}

              <button 
                onClick={handlePay}
                disabled={loading || !amount}
                className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${isOffline ? "bg-red-500 text-white" : "bg-[#00ff00] text-black"}`}
              >
                {loading ? <RefreshCw className="animate-spin mr-2" /> : <CreditCard className="mr-2" />}
                {isOffline ? "QUEUE TRANSACTION" : "INITIATE PAYMENT"}
              </button>

              {offlineQueue.length > 0 && !isOffline && (
                <button 
                  onClick={syncQueue}
                  className="w-full bg-[#333] text-[#00ff00] font-bold py-3 rounded-xl text-xs border border-[#444] flex items-center justify-center"
                >
                  <RefreshCw size={14} className="mr-2" /> SYNC OFFLINE QUEUE ({offlineQueue.length})
                </button>
              )}
            </div>
          ) : (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-6"
            >
              <div className="bg-[#000] p-6 rounded-2xl border-2 border-[#00ff00] animate-pulse">
                <Clock size={48} className="text-[#00ff00] mx-auto mb-4" />
                <p className="text-white font-bold">Awaiting Payment...</p>
                <p className="text-[#666] text-xs mt-2">Transaction Ref: {currentTx?.tx_ref}</p>
              </div>

              <div className="space-y-3">
                <a 
                  href={paymentLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center"
                >
                  OPEN CHECKOUT <ExternalLink size={16} className="ml-2" />
                </a>
                
                {(currentTx?.isMock || !currentTx) && (
                  <button 
                    onClick={async () => {
                      const ref = currentTx?.tx_ref || paymentLink?.split("mock-")[1];
                      if (ref) {
                        await fetch(`/api/mock-confirm/${ref}`, { method: "POST" });
                        alert("Mock payment confirmed. Check dashboard.");
                        reset();
                      }
                    }}
                    className="w-full bg-[#333] text-white py-3 rounded-xl text-sm border border-[#444]"
                  >
                    SIMULATE SUCCESS (MOCK)
                  </button>
                )}

                <button 
                  onClick={reset}
                  className="text-[#666] text-sm hover:text-white transition-colors"
                >
                  Cancel Transaction
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Keypad simulation */}
        <div className="mt-8 grid grid-cols-3 gap-2 opacity-20 pointer-events-none">
          {[1,2,3,4,5,6,7,8,9,"*",0,"#"].map(n => (
            <div key={n} className="bg-[#333] h-10 rounded-lg flex items-center justify-center text-white text-xs">{n}</div>
          ))}
        </div>
      </motion.div>
      
      <p className="text-[#666] text-xs mt-8 text-center max-w-xs">
        {isOffline ? "Transactions are being saved locally. Toggle to ONLINE to sync with the server." : "This simulator mimics the Newland NEW8210 hardware flow."}
      </p>
    </div>
  );
};

const Dashboard = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);

  const fetchTransactions = async () => {
    try {
      const res = await fetch("/api/transactions");
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, []);

  const ReceiptModal = ({ tx, onClose }: { tx: Transaction; onClose: () => void }) => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white text-black w-full max-w-[300px] p-6 font-mono text-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
          <h3 className="font-bold text-lg">ENTERPRISE POS</h3>
          <p className="text-[10px]">NEW8210 TERMINAL #8210-001</p>
          <p className="text-[10px]">{new Date(tx.timestamp).toLocaleString()}</p>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span>REF:</span>
            <span className="font-bold">{tx.tx_ref.slice(-8)}</span>
          </div>
          <div className="flex justify-between">
            <span>CUSTOMER:</span>
            <span className="truncate max-w-[150px]">{tx.customerName}</span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
            <span>STATUS:</span>
            <span className="font-bold uppercase">{tx.status}</span>
          </div>
        </div>

        <div className="text-center border-y-2 border-dashed border-gray-300 py-4 my-4">
          <p className="text-xs">TOTAL AMOUNT</p>
          <p className="text-3xl font-bold">${tx.amount.toFixed(2)}</p>
        </div>

        {tx.binance_status && (
          <div className="text-[9px] text-gray-500 mb-4">
            <p>SETTLEMENT: {tx.binance_status}</p>
            <p>ORDER: {tx.binance_order_id || "N/A"}</p>
          </div>
        )}

        <div className="text-center space-y-1">
          <p className="text-[10px]">THANK YOU FOR YOUR BUSINESS</p>
          <div className="flex justify-center py-2">
            <div className="w-full h-8 bg-black"></div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-6 bg-black text-white py-3 font-sans font-bold text-xs uppercase tracking-widest"
        >
          Close Receipt
        </button>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center">
            <LayoutDashboard className="mr-3 text-[#00ff00]" />
            Terminal Dashboard
          </h1>
          <p className="text-[#666] text-sm mt-1">NEW8210 Merchant Interface</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchTransactions}
            className="flex-1 md:flex-none bg-[#222] hover:bg-[#333] text-white px-4 py-2 rounded-xl transition-colors flex items-center justify-center"
          >
            <RefreshCw size={18} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Sync
          </button>
        </div>
      </div>

      {/* Quick Stats Grid - Optimized for Mobile */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-8">
        <div className="bg-[#111] border border-[#222] p-4 md:p-6 rounded-2xl">
          <p className="text-[#666] text-[10px] uppercase font-bold tracking-widest mb-1">Total Sales</p>
          <p className="text-xl md:text-3xl font-mono text-white">
            ${transactions.reduce((acc, tx) => tx.status === "paid" ? acc + tx.amount : acc, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-[#111] border border-[#222] p-4 md:p-6 rounded-2xl">
          <p className="text-[#666] text-[10px] uppercase font-bold tracking-widest mb-1">Settled</p>
          <p className="text-xl md:text-3xl font-mono text-[#00ff00]">
            {transactions.filter(tx => tx.status === "paid").length}
          </p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-[#111] border border-[#222] p-4 md:p-6 rounded-2xl">
          <p className="text-[#666] text-[10px] uppercase font-bold tracking-widest mb-1">Pending Orders</p>
          <p className="text-xl md:text-3xl font-mono text-yellow-500">
            {transactions.filter(tx => tx.status === "pending").length}
          </p>
        </div>
      </div>

      {/* Transaction List - Card Based for NEW8210 / Mobile */}
      <div className="space-y-3">
        <h2 className="text-[#444] text-[10px] uppercase font-bold tracking-widest px-1">Recent Activity</h2>
        {transactions.length === 0 ? (
          <div className="bg-[#111] border border-[#222] p-12 rounded-2xl text-center text-[#444]">
            No transactions found.
          </div>
        ) : (
          transactions.map((tx) => (
            <motion.div 
              key={tx.tx_ref}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111] border border-[#222] p-4 rounded-2xl flex items-center justify-between group hover:border-[#333] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.status === "paid" ? "bg-[#00ff0011] text-[#00ff00]" : "bg-yellow-50011 text-yellow-500"}`}>
                  {tx.status === "paid" ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">${tx.amount.toFixed(2)}</span>
                    <span className="text-[10px] text-[#444] font-mono">{tx.tx_ref.slice(-6)}</span>
                  </div>
                  <div className="text-[10px] text-[#666] uppercase font-bold">{tx.customerName || "Customer"}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {tx.status === "paid" && (
                  <button 
                    onClick={() => setSelectedReceipt(tx)}
                    className="p-2 bg-[#222] hover:bg-[#333] rounded-lg text-white transition-colors"
                    title="Print Receipt"
                  >
                    <Printer size={16} />
                  </button>
                )}
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] text-[#444]">{new Date(tx.timestamp).toLocaleTimeString()}</div>
                  {tx.binance_status && (
                    <div className="text-[8px] text-orange-500 font-bold uppercase tracking-tighter">Settled</div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedReceipt && (
          <ReceiptModal tx={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<"pos" | "dashboard">("pos");
  const [lastTx, setLastTx] = useState<Transaction | null>(null);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00ff00] selection:text-black">
      {/* Navigation Rail */}
      <nav className="fixed left-0 top-0 bottom-0 w-20 bg-[#111] border-r border-[#222] flex flex-col items-center py-8 space-y-8 z-50">
        <div className="w-12 h-12 bg-[#00ff00] rounded-2xl flex items-center justify-center mb-4">
          <Smartphone size={24} className="text-black" />
        </div>
        
        <button 
          onClick={() => setView("pos")}
          className={`p-3 rounded-xl transition-all ${view === "pos" ? "bg-[#222] text-[#00ff00]" : "text-[#444] hover:text-white"}`}
        >
          <Smartphone size={24} />
        </button>
        
        <button 
          onClick={() => setView("dashboard")}
          className={`p-3 rounded-xl transition-all ${view === "dashboard" ? "bg-[#222] text-[#00ff00]" : "text-[#444] hover:text-white"}`}
        >
          <LayoutDashboard size={24} />
        </button>

        <div className="mt-auto">
          <div className="w-8 h-8 rounded-full bg-[#333] border border-[#444]"></div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pl-20 min-h-screen">
        <AnimatePresence mode="wait">
          {view === "pos" ? (
            <motion.div
              key="pos"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <POSSimulator onPaymentCreated={setLastTx} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Dashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Status Bar (Bottom) */}
      <div className="fixed bottom-0 left-20 right-0 bg-[#111] border-t border-[#222] px-6 py-2 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-[#444] z-40">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-[#00ff00] rounded-full mr-2 animate-pulse"></div>
          System Online: Newland NEW8210 Gateway
        </div>
        <div className="flex items-center space-x-6">
          <span>Flutterwave: Connected</span>
          <span>Binance: API Ready</span>
          <span className="text-[#666]">{new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
