// api/send.js
import { createClient } from '@supabase/supabase-js';

// Telegram MarkdownV2 formatını bozabilecek karakterleri temizleyen/kaçış ekleyen fonksiyon
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

    // Çevresel değişkenler
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    if (!BOT_TOKEN || !CHAT_ID || !SUPABASE_URL || !SUPABASE_KEY) {
        console.error("Sunucu hatası: Çevresel değişkenler eksik.");
        return res.status(500).json({ message: "Sunucu yapılandırma hatası." });
    }

    // Supabase İstemcisini Başlat
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    try {
        // 1. AŞAMA: VERİLERİ SUPABASE VERİTABANINA KAYDET
        const { error: dbError } = await supabase
            .from('teklifler') // Supabase'deki tablonuzun adı
            .insert([
                {
                    ad_soyad: formData.ad_soyad,
                    telefon: formData.cep_telefonu,
                    eposta: formData.eposta || null,
                    sigorta_turu: formData.sigorta_turu || null,
                    detaylar: formData // Geri kalan tüm verileri JSON olarak saklar
                }
            ]);

        if (dbError) {
            console.error("Veritabanı kayıt hatası:", dbError);
            // Veritabanı çökse bile Telegram'a gitmesi için throw atmıyoruz, sadece logluyoruz.
        }

        // 2. AŞAMA: TELEGRAM'A BİLDİRİM GÖNDER (Güvenli Metin ile)
        let text = `🚨 *YENİ SİGORTA TEKLİF TALEBİ* 🚨\n\n`;
        text += `👤 *Ad Soyad:* ${escapeMarkdown(formData.ad_soyad)}\n`;
        text += `📞 *Telefon:* ${escapeMarkdown(formData.cep_telefonu)}\n`;
        text += `✉️ *E\\-posta:* ${escapeMarkdown(formData.eposta || 'Belirtilmedi')}\n`;
        text += `🛡 *Sigorta Türü:* ${escapeMarkdown(formData.sigorta_turu || 'Belirtilmedi')}\n\n`;
        text += `📋 *Sisteme Girilen Detaylar:*\n`;

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
                parse_mode: "MarkdownV2" // MarkdownV2 daha güvenlidir
            })
        });

        if (!telegramResponse.ok) {
            const errBody = await telegramResponse.text();
            console.error("Telegram Hatası:", errBody);
            throw new Error("Telegram API tarafında bir hata oluştu.");
        }

        return res.status(200).json({ message: "Başarıyla gönderildi ve kaydedildi" });
    } catch (error) {
        console.error("Sistem Hatası:", error);
        return res.status(500).json({ message: "İşlem başarısız." });
    }
}