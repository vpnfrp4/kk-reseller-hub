export function downloadReceipt(tx: {
  id: string;
  amount: number;
  method: string | null;
  created_at: string;
  description: string;
  status: string;
  type: string;
}, userName: string) {
  const date = new Date(tx.created_at);
  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const receiptId = tx.id.slice(0, 8).toUpperCase();

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Receipt #${receiptId}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0a0f; color: #e5e5e5; padding: 40px; }
  .receipt { max-width: 480px; margin: 0 auto; background: linear-gradient(145deg, #111118, #0d0d14); border: 1px solid #c9a22740; border-radius: 16px; padding: 40px; position: relative; overflow: hidden; }
  .receipt::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #c9a227, #ffd700, #c9a227); }
  .header { text-align: center; margin-bottom: 32px; }
  .logo { font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #c9a227, #ffd700); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .subtitle { font-size: 12px; color: #666; margin-top: 4px; letter-spacing: 2px; text-transform: uppercase; }
  .badge { display: inline-block; background: #16a34a20; color: #4ade80; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-top: 12px; border: 1px solid #4ade8030; }
  .divider { border: none; border-top: 1px dashed #ffffff10; margin: 24px 0; }
  .row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; font-size: 14px; }
  .row .label { color: #888; }
  .row .value { font-weight: 500; text-align: right; }
  .amount-row .value { font-size: 28px; font-weight: 700; font-family: 'JetBrains Mono', monospace; background: linear-gradient(135deg, #c9a227, #ffd700); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #555; }
  .footer p { margin-top: 4px; }
  @media print { body { background: white; color: #111; } .receipt { border-color: #ddd; background: white; } .row .label { color: #666; } }
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <div class="logo">KK Reseller Hub</div>
    <div class="subtitle">Payment Receipt</div>
    <div class="badge">✓ Approved</div>
  </div>
  <hr class="divider"/>
  <div class="row"><span class="label">Receipt No.</span><span class="value">#${receiptId}</span></div>
  <div class="row"><span class="label">Date</span><span class="value">${formattedDate}</span></div>
  <div class="row"><span class="label">Time</span><span class="value">${formattedTime}</span></div>
  <div class="row"><span class="label">Account</span><span class="value">${userName}</span></div>
  <div class="row"><span class="label">Payment Method</span><span class="value">${tx.method || "—"}</span></div>
  <div class="row"><span class="label">Description</span><span class="value">${tx.description}</span></div>
  <hr class="divider"/>
  <div class="row amount-row"><span class="label">Amount</span><span class="value">+${tx.amount.toLocaleString()} MMK</span></div>
  <hr class="divider"/>
  <div class="footer">
    <p>Thank you for your payment.</p>
    <p>Transaction ID: ${tx.id}</p>
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${receiptId}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
