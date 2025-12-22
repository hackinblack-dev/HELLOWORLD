import logging
import requests
import json
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# ================= CONFIG =================
# Telegram Bot Token (Same as in script.js or new one)
TELEGRAM_TOKEN = "8572505018:AAEzsHrB_5ypGRYlYxvEkyv_jlap4NInlI4"

# Firebase Realtime Database URL
# Note: Using your Project ID. If this 404s, check Firebase Console for exact URL.
FIREBASE_URL = "https://counter-72c46-default-rtdb.firebaseio.com/inbox/message.json"

# ================= LOGGING =================
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# ================= HANDLERS =================

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Hello! I am the Love Bridge Bot.\n"
        "Use /m <message> to send a message to her inbox!\n"
        "Example: /m I love you! ❤️"
    )

async def send_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Get text after /m
    if not context.args:
        await update.message.reply_text("⚠️ Please type a message! Example: /m Miss you!")
        return

    message_text = ' '.join(context.args)
    user_name = update.effective_user.first_name

    logging.info(f"Sending message from {user_name}: {message_text}")

    # Send to Firebase (PUT replaces the current value)
    try:
        response = requests.put(FIREBASE_URL, json=message_text)
        
        if response.status_code == 200:
            await update.message.reply_text(f"✅ Sent: \"{message_text}\"")
        else:
            await update.message.reply_text(f"❌ Firebase Error: {response.status_code}")
            logging.error(f"Firebase Error: {response.text}")
            
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {str(e)}")
        logging.error(f"Exception: {str(e)}")

# ================= MAIN =================
if __name__ == '__main__':
    application = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("m", send_message))
    
    print("🚀 Bot Bridge is running...")
    application.run_polling()
