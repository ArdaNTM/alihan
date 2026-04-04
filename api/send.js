// send.js
export default async function handler(req, res) {
    // Sadece POST isteklerine izin ver
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Sadece POST istekleri kabul edilir." });
    }

    const formData = req.body;

    // Temel doğrulama
    if (!formData.ad_soyad || !formData.cep_telefonu) {
        return res.status(400).json({ message: "Ad Soyad ve Telefon zorunludur." });
    }

    // Çevresel değişkenleri (.env) çek (Kullanıcılar bunu asla göremez)
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
        console.error("Sunucu hatası: Telegram Token veya Chat ID eksik.");
        return res.status(500).json({ message: "Sunucu yapılandırma hatası." });
    }

    // Telegram'a gidecek mesajı dinamik olarak oluştur
    let text = `🚨 *YENİ SİGORTA TEKLİF TALEBİ* 🚨\n\n`;
    text += `👤 *Ad Soyad:* ${formData.ad_soyad}\n`;
    text += `📞 *Telefon:* ${formData.cep_telefonu}\n`;
    text += `✉️ *E-posta:* ${formData.eposta || 'Belirtilmedi'}\n`;
    text += `🛡 *Sigorta Türü:* ${formData.sigorta_turu || 'Belirtilmedi'}\n\n`;
    text += `📋 *Sisteme Girilen Detaylar:*\n`;

    // Ekstra bilgileri (TC, Plaka, Metrekare vb.) döngü ile ekle
    const ignoredKeys = ['ad_soyad', 'cep_telefonu', 'eposta', 'sigorta_turu', 'kvkk'];
    for (const [key, value] of Object.entries(formData)) {
        if (!ignoredKeys.includes(key) && value && value.trim() !== '') {
            // "tc_kimlik" gibi anahtarları "Tc Kimlik" şekline çevirerek güzelleştir
            const cleanKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            text += `• *${cleanKey}:* ${value}\n`;
        }
    }

    try {
        // Güvenli sunucudan Telegram'a istek atıyoruz
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: "Markdown"
            })
        });

        if (!response.ok) {
            throw new Error("Telegram API tarafında bir hata oluştu.");
        }

        return res.status(200).json({ message: "Başarıyla gönderildi" });
    } catch (error) {
        console.error("Telegram Gönderim Hatası:", error);
        return res.status(500).json({ message: "Gönderim başarısız." });
    }
}