# AI প্ল্যানার সেটআপ (৩টা ধাপ)

## ১) Apps Script আপডেট
1. আপনার Google Sheet-এর Apps Script খুলে `Code.gs`-এর পুরো লেখা মুছে এই repo-র `apps-script/Code.gs` বসান। উপরের `SECRET` আগের মানেই রাখুন।
2. বাঁ পাশে ⚙️ Project Settings → **Script properties** → Add: নাম `GEMINI_API_KEY`, মান আপনার Gemini API key (Google AI Studio থেকে নেওয়া)।
3. Deploy → Manage deployments → ✏️ → Version: **New version** → Deploy। (URL একই থাকবে, নতুন ডিপ্লয় না করলে নতুন কোড চলবে না।)
4. প্রথমবার AI কল করলে Google "বাইরের সার্ভিসে কল (UrlFetchApp)-এর অনুমতি" চাইবে → Allow।

## ২) অ্যাপ বিল্ড
`src/` বদলেছে, তাই `npm install && npm run build` চালিয়ে `docs/` আপডেট করে GitHub-এ push করুন।

## ৩) ব্যবহার
- 🤖 AI প্ল্যান ট্যাব → কোর্স ও ধরন বেছে একসাথে অনেক PDF আপলোড → "নতুন সব ফাইল AI-কে পড়াও"।
- AI ফাইলে পরীক্ষার তারিখ পেলে "পরীক্ষায় যোগ করো" বোতাম আসে।
- টিচারের নাম, স্যারের বলা তথ্য, টিউশন রুটিন, আজকের নোট দিন।
- "আজকের প্ল্যান বানাও" → কাজ টিক দিন → ৭ দিনের প্রগ্রেস দেখুন।

## মনে রাখবেন
- AI কল আপনার Gemini API key দিয়ে যায়। ফ্রি টিয়ারে কী কী মডেল/কতটা লিমিট আছে তা AI Studio-তে দেখে নিন; লিমিটে ঠেকলে `Code.gs`-এর `AI_MODEL` বদলে `gemini-3.5-flash-lite` দিন। প্রতিটা ফাইল একবারই পড়া হয় (সারাংশ Sheet-এর `ai_notes` ট্যাবে জমা থাকে)।
- ফাইল ১৪MB-র বেশি হলে অ্যাপ আপলোডই নেয় না।
- শুধু PDF নেওয়া হয়।
