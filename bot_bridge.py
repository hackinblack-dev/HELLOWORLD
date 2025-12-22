import logging
import requests
import json
import base64
import time
import asyncio
from io import BytesIO
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# ================= CONFIG =================
TELEGRAM_TOKEN = "8572505018:AAEzsHrB_5ypGRYlYxvEkyv_jlap4NInlI4"
TELEGRAM_CHAT_ID = "1369536118" # Your Chat ID to send photos to
FIREBASE_URL = "https://counter-72c46-default-rtdb.firebaseio.com"

# ================= LOGGING =================
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# ================= HANDLERS =================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Hello! I am the Love Bridge Bot.\n"
        "Use /m <message> to send a message to her inbox!"
    )

async def send_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("⚠️ Type a message! Ex: /m Love you!")
        return
    
    msg = ' '.join(context.args)
    url = f"{FIREBASE_URL}/inbox/message.json"
    requests.put(url, json=msg)
    await update.message.reply_text(f"✅ Sent: \"{msg}\"")

# ================= BACKGROUND SYNC =================
async def sync_doodles(context: ContextTypes.DEFAULT_TYPE):
    """Checks for unsent doodles in Firebase"""
    try:
        url = f"{FIREBASE_URL}/guestbook.json"
        # Order by key limit to last 10 to avoid huge fetches
        r = requests.get(url + '?orderBy="$key"&limitToLast=10') 
        data = r.json()

        if not data: return

        for key, entry in data.items():
            if isinstance(entry, dict) and entry.get("image") and entry.get("sentToTelegram") == False:
                logging.info(f"Found pending doodle: {key}")
                
                # 1. Decode Image
                base64_str = entry["image"].split(",")[1] # Remove data:image/png;base64,
                image_data = base64.b64decode(base64_str)
                
                # 2. Send to Telegram
                caption = f"🎨 Recovered Doodle\n📝 {entry.get('text', '')}"
                await context.bot.send_photo(
                    chat_id=TELEGRAM_CHAT_ID,
                    photo=BytesIO(image_data),
                    caption=caption
                )
                
                # 3. Mark as Sent
                requests.patch(f"{FIREBASE_URL}/guestbook/{key}.json", json={"sentToTelegram": True})
                logging.info(f"Synced {key}")
                
    except Exception as e:
        logging.error(f"Sync Error: {str(e)}")

# ================= MAIN =================
if __name__ == '__main__':
    # 1. Start HTTP Server in Background
    import http.server
    import socketserver
    import threading

    PORT = 8000
    Handler = http.server.SimpleHTTPRequestHandler

    def run_server():
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"🌍 Website live at: http://localhost:{PORT}")
            httpd.serve_forever()

    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    # 2. Start Telegram Bot
    app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
    
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("m", send_message))
    
    # Add Job Queue for Syncing
    job_queue = app.job_queue
    job_queue.run_repeating(sync_doodles, interval=10, first=5)
    
    print("🚀 Bot Bridge is running...")
    print(f"👉 Open your browser at: http://localhost:{PORT}")
    app.run_polling()
