// api/send.js

// Telegram MarkdownV2 formatını bozabilecek karakterleri temizleyen fonksiyon
function escapeMarkdown(text) {
    if (!text) return '';
    return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Sadece POST istekleri kabul edilir." });
    }

    const formData = req.body;

    if (!formData.ad_soyad || !formData.cep_telefonu) {
        return res.status(400).json({ message: "Ad Soyad ve Telefon zorunludur." });
    }

    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    if (!BOT_TOKEN || !CHAT_ID || !SUPABASE_URL || !SUPABASE_KEY) {
        console.error("Eksik çevresel değişkenler var.");
        return res.status(500).json({ message: "Sunucu yapılandırma hatası." });
    }

    try {
        // 1. SUPABASE'E KAYIT ATMA (Hiçbir paket kurmadan direkt fetch ile)
        const supabaseEndpoint = `${SUPABASE_URL}/rest/v1/teklifler`;
        
        const supabaseResponse = await fetch(supabaseEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                ad_soyad: formData.ad_soyad,
                telefon: formData.cep_telefonu,
                eposta: formData.eposta || null,
                sigorta_turu: formData.sigorta_turu || null,
                detaylar: formData
            })
        });

        if (!supabaseResponse.ok) {
            const dbError = await supabaseResponse.text();
            console.error('Supabase kayıt hatası:', supabaseResponse.status, dbError);
            throw new Error('Teklif veritabanına kaydedilemedi.');
        }

        // 2. TELEGRAM'A GÖNDERME (Markdown korumalı)
        let text = `🚨 *YENİ SİGORTA TEKLİF TALEBİ* 🚨\n\n`;
        text += `👤 *Ad Soyad:* ${escapeMarkdown(formData.ad_soyad)}\n`;
        text += `📞 *Telefon:* ${escapeMarkdown(formData.cep_telefonu)}\n`;
        text += `✉️ *E\\-posta:* ${escapeMarkdown(formData.eposta || 'Belirtilmedi')}\n`;
        text += `🛡 *Sigorta Türü:* ${escapeMarkdown(formData.sigorta_turu || 'Belirtilmedi')}\n\n`;
        text += `📋 *Detaylar:*\n`;

        const ignoredKeys = ['ad_soyad', 'cep_telefonu', 'eposta', 'sigorta_turu', 'kvkk'];
        for (const [key, value] of Object.entries(formData)) {
            if (!ignoredKeys.includes(key) && value && value.trim() !== '') {
                const cleanKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                text += `• *${escapeMarkdown(cleanKey)}:* ${escapeMarkdown(value)}\n`;
            }
        }

        const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: "MarkdownV2"
            })
        });

        const telegramResult = await telegramResponse.json();
        
        if (!telegramResponse.ok || !telegramResult.ok) {
            console.error(
                'Telegram gönderim hatası:',
                telegramResult.description || 'Bilinmeyen hata'
            );
        
            throw new Error('Telegram mesajı gönderilemedi.');
        }

        return res.status(200).json({ message: "Başarıyla gönderildi" });
    } catch (error) {
        console.error("Hata:", error);
        return res.status(500).json({ message: "İşlem başarısız." });
    }
}
