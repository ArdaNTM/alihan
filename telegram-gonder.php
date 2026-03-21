<?php
header('Content-Type: application/json');

// Telegram Bot Token ve Alihan Abinin Chat ID'si
$botToken = "8695667817:AAH2l1gh_7UFiZQ7YFrPXxMYWFtV0qA6OtA";
$chatId = "8726764546";

// Sadece POST isteği geldiğinde çalışır
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // Formdaki temel bilgileri al
    $sigorta_turu = isset($_POST['sigorta_turu']) ? $_POST['sigorta_turu'] : 'Belirtilmedi';
    $ad_soyad = isset($_POST['ad_soyad']) ? $_POST['ad_soyad'] : 'Belirtilmedi';
    $telefon = isset($_POST['cep_telefonu']) ? $_POST['cep_telefonu'] : 'Belirtilmedi';
    $eposta = isset($_POST['eposta']) ? $_POST['eposta'] : 'Belirtilmedi';

    // Telegram'a gidecek mesajın başlığı ve tasarımı (Emoji ve Kalın Yazı ile)
    $mesaj = "🚨 *YENİ SİGORTA TEKLİF TALEBİ* 🚨\n\n";
    $mesaj .= "👤 *Ad Soyad:* " . $ad_soyad . "\n";
    $mesaj .= "📞 *Telefon:* " . $telefon . "\n";
    $mesaj .= "✉️ *E-posta:* " . $eposta . "\n";
    $mesaj .= "🛡 *Sigorta Türü:* " . $sigorta_turu . "\n\n";
    $mesaj .= "📋 *Sisteme Girilen Detaylar:*\n";

    // Formdaki diğer detayları otomatik olarak dönüp mesaja ekler
    foreach($_POST as $key => $value) {
        // Zaten yukarıda eklediğimiz ve boş olan gereksiz verileri gizle
        if($key != 'ad_soyad' && $key != 'cep_telefonu' && $key != 'eposta' && $key != 'sigorta_turu' && $key != 'kvkk' && trim($value) != '') {
            // "tc_kimlik" gibi alt tireli isimleri "Tc Kimlik" şekline çevirip güzelleştir
            $clean_key = ucwords(str_replace('_', ' ', $key));
            $mesaj .= "• *" . $clean_key . ":* " . $value . "\n";
        }
    }

    // Telegram API URL'sini hazırla
    $url = "https://api.telegram.org/bot" . $botToken . "/sendMessage";
    
    // Gönderilecek veriyi paketle
    $data = [
        'chat_id' => $chatId,
        'text' => $mesaj,
        'parse_mode' => 'Markdown'
    ];

    // PHP'nin cURL alternatifi stream_context ile veriyi postala
    $options = [
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type:application/x-www-form-urlencoded\r\n",
            'content' => http_build_query($data)
        ]
    ];
    $context  = stream_context_create($options);
    $result = @file_get_contents($url, false, $context);

    // Siteye işlemin başarılı olup olmadığını JSON formatında bildir (Animasyon için gerekli)
    if ($result) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Telegram sunucusuna iletilemedi.']);
    }

} else {
    // URL'ye doğrudan girilmeye çalışılırsa hata ver
    echo json_encode(['success' => false, 'message' => 'Lütfen formu kullanarak gönderin.']);
}
?>