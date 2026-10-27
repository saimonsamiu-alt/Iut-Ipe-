import { useState, useEffect, useRef } from "react";
import { currentUser } from "./cloud.js";
import { touchLocal, pushLocal, syncEverything } from "./store.js";

/* যেকোনো পাতায় ক্লাউড sync: খুললে একবার sync, বদলালে commit() দিয়ে ১.২ সেকেন্ড পর push */
export function useSync(onPulled) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    (async () => {
      const u = await currentUser().catch(() => null);
      if (!u) return;
      setUser(u);
      try {
        setStatus("🔄 Sync হচ্ছে…");
        const r = await syncEverything(u);
        if (onPulled) onPulled(r);
        setStatus("✅ Synced");
      } catch { setStatus("⚠️ Sync হয়নি (net/login check করুন)"); }
    })();
    // eslint-disable-next-line
  }, []);

  const pushSoon = () => {
    touchLocal();
    if (!user) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pushLocal(user).then(() => setStatus("☁️ Saved")).catch(() => setStatus("⚠️ Cloud save হয়নি — পরে Sync হবে"));
    }, 1200);
  };
  return { user, status, pushSoon };
}
