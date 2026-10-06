<?php
/**
 * gift_card_functions.php
 * Funciones compartidas para Geschenkgutscheine
 */

/**
 * Genera un código único EDIT-XXXXXX
 */
function generateGiftCardCode(PDO $pdo): string {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusión
    $maxAttempts = 10;
    for ($i = 0; $i < $maxAttempts; $i++) {
        $code = 'EDIT-';
        for ($j = 0; $j < 6; $j++) {
            $code .= $chars[random_int(0, strlen($chars) - 1)];
        }
        $stmt = $pdo->prepare("SELECT id FROM gift_card_purchases WHERE code = :code");
        $stmt->execute([':code' => $code]);
        if (!$stmt->fetch()) {
            return $code;
        }
    }
    throw new Exception('No se pudo generar un código único');
}

/**
 * Formatea el importe igual que en la web: sin decimales si es entero
 * (50 -> "50", 49.9 -> "49.90")
 */
function formatGiftCardAmount(float $amount): string {
    if ($amount == floor($amount)) {
        return (string)(int)$amount;
    }
    return number_format($amount, 2, '.', '');
}

/**
 * Rellena la imagen real del gutschein (gutscheine.png) con GD:
 *  - Datum  (verde)  junto a la etiqueta "Datum"
 *  - Visum  (verde)  = código (order_number) junto a "Visum"
 *  - Betrag (rojo)   a la derecha del "CHF" rojo
 * Devuelve el JPEG binario, o null si faltan la imagen / la fuente / GD.
 *
 * Posiciones calibradas visualmente con la preview de la web
 * (imagen base 844x542). left = borde izq. del texto en %, top = centro vertical en %.
 */
function fillGiftCardImage(string $code, float $amount, string $date): ?string {
    if (!function_exists('imagecreatefrompng') || !function_exists('imagettftext')) {
        return null;
    }

    $imgPath  = __DIR__ . '/gutscheine.png';
    $fontPath = __DIR__ . '/SpecialElite-Regular.ttf';
    if (!file_exists($imgPath) || !file_exists($fontPath)) {
        return null;
    }

    $img = @imagecreatefrompng($imgPath);
    if (!$img) {
        return null;
    }

    $W = imagesx($img);
    $H = imagesy($img);

    $green = imagecolorallocate($img, 0x2C, 0x5F, 0x2E);
    $red   = imagecolorallocate($img, 0xFF, 0x00, 0x00);

    // Dibuja texto: left-edge en xPct, centro vertical en yPct, tamaño en px CSS
    $draw = function (string $text, float $xPct, float $yPct, float $sizePx, int $color)
        use ($img, $fontPath, $W, $H) {
        $size = $sizePx * 0.75; // px CSS (96dpi) -> pt GD (72dpi)
        $bbox = imagettfbbox($size, 0, $fontPath, $text);
        $xLeft   = $xPct * $W;
        $yCenter = $yPct * $H;
        $drawX = (int) round($xLeft - $bbox[0]);
        $drawY = (int) round($yCenter - ($bbox[7] + $bbox[1]) / 2);
        imagettftext($img, $size, 0, $drawX, $drawY, $color, $fontPath, $text);
    };

    $draw($date,                      0.230, 0.288, 0.026 * $W, $green); // Datum
    $draw($code,                      0.175, 0.388, 0.026 * $W, $green); // Visum = código
    $draw(formatGiftCardAmount($amount) . '.-', 0.785, 0.632, 0.050 * $W, $red);   // Betrag

    ob_start();
    imagejpeg($img, null, 92);
    $jpeg = ob_get_clean();
    imagedestroy($img);

    return $jpeg ?: null;
}

/**
 * Genera el PDF del gutschein.
 * 1) Intenta incrustar la imagen real rellenada (gutscheine.png + GD).
 * 2) Si falla, usa el PDF de texto (FPDF o fallback en PHP puro).
 */
function generateGiftCardPDF(string $code, float $amount, string $buyerName, string $date): string {
    // --- Opción preferida: imagen real del gutschein rellenada ---
    $jpeg = fillGiftCardImage($code, $amount, $date);
    if ($jpeg !== null) {
        $imgW = 844; // dimensiones reales de gutscheine.png
        $imgH = 542;

        // Página A4 horizontal, imagen centrada y escalada a la anchura
        $pageW = 842.0;
        $pageH = 595.0;
        $margin = 30.0;
        $drawW = $pageW - 2 * $margin;
        $drawH = $drawW * $imgH / $imgW;
        if ($drawH > $pageH - 2 * $margin) {
            $drawH = $pageH - 2 * $margin;
            $drawW = $drawH * $imgW / $imgH;
        }
        $posX = ($pageW - $drawW) / 2;
        $posY = ($pageH - $drawH) / 2;

        $imgLen = strlen($jpeg);
        $stream = "q\n"
                . round($drawW, 2) . " 0 0 " . round($drawH, 2) . " "
                . round($posX, 2) . " " . round($posY, 2) . " cm\n"
                . "/Im1 Do\nQ\n";
        $sLen = strlen($stream);

        $o1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        $o2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        $o3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {$pageW} {$pageH}] "
            . "/Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n";
        $o4 = "4 0 obj\n<< /Length {$sLen} >>\nstream\n{$stream}endstream\nendobj\n";
        $o5 = "5 0 obj\n<< /Type /XObject /Subtype /Image /Width {$imgW} /Height {$imgH} "
            . "/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {$imgLen} >>\n"
            . "stream\n" . $jpeg . "\nendstream\nendobj\n";

        $header  = "%PDF-1.4\n";
        $objects = [$o1, $o2, $o3, $o4, $o5];
        $offsets = [];
        $pos     = strlen($header);
        $body    = '';
        foreach ($objects as $obj) {
            $offsets[] = $pos;
            $pos += strlen($obj);
            $body .= $obj;
        }
        $count   = count($objects) + 1;
        $xrefPos = strlen($header) + strlen($body);
        $xref    = "xref\n0 {$count}\n0000000000 65535 f \n";
        foreach ($offsets as $off) {
            $xref .= str_pad((string)$off, 10, '0', STR_PAD_LEFT) . " 00000 n \n";
        }
        $trailer = "trailer\n<< /Size {$count} /Root 1 0 R >>\nstartxref\n{$xrefPos}\n%%EOF";

        return $header . $body . $xref . $trailer;
    }

    // --- Fallback: PDF de texto (FPDF si existe en el servidor) ---
    $fpdfPaths = [
        __DIR__ . '/fpdf/fpdf.php',
        __DIR__ . '/../vendor/fpdf/fpdf.php',
    ];
    foreach ($fpdfPaths as $path) {
        if (file_exists($path)) {
            require_once $path;
            break;
        }
    }

    if (!class_exists('FPDF')) {
        // Fallback: devolver un PDF mínimo hardcodeado si FPDF no está disponible
        return generateGiftCardPDFFallback($code, $amount, $buyerName, $date);
    }

    $pdf = new FPDF('L', 'mm', [148, 105]); // A6 horizontal
    $pdf->AddPage();

    // Fondo negro
    $pdf->SetFillColor(20, 20, 20);
    $pdf->Rect(0, 0, 148, 105, 'F');

    // Logo (local o desde URL)
    $logoPath = __DIR__ . '/icon-192x192.png';
    if (!file_exists($logoPath)) {
        $logoData = @file_get_contents('https://web.lweb.ch/templettedhopnew/icon-192x192.png');
        if ($logoData) {
            $tmpLogo = sys_get_temp_dir() . '/gc_logo_' . md5($logoData) . '.png';
            file_put_contents($tmpLogo, $logoData);
            $logoPath = $tmpLogo;
        }
    }
    if (file_exists($logoPath)) {
        $pdf->Image($logoPath, 5, 8, 35);
    }

    // Título
    $pdf->SetFont('Helvetica', 'B', 18);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetXY(42, 8);
    $pdf->Cell(100, 10, 'GESCHENKGUTSCHEIN', 0, 1, 'C');

    // Subtexto debajo del título
    $pdf->SetFont('Helvetica', '', 6);
    $pdf->SetTextColor(180, 180, 180);
    $pdf->SetXY(42, 19);
    $pdf->Cell(100, 4, '** ALLES FUER DIE BACH FLUSS UND SEEFISCHE', 0, 1, 'C');
    $pdf->SetXY(42, 23);
    $pdf->Cell(100, 4, '** GROSSE AUSWAHL  **  SCHNELLER VERSAND', 0, 1, 'C');

    // Línea separadora roja
    $pdf->SetDrawColor(180, 0, 0);
    $pdf->SetLineWidth(0.5);
    $pdf->Line(10, 30, 138, 30);

    // Importe grande
    $pdf->SetFont('Helvetica', 'B', 28);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetXY(0, 32);
    $pdf->Cell(148, 14, 'CHF ' . number_format($amount, 2, '.', "'"), 0, 1, 'C');

    // Recuadro del código (borde rojo)
    $pdf->SetDrawColor(180, 0, 0);
    $pdf->SetFillColor(40, 40, 40);
    $pdf->SetLineWidth(0.8);
    $codeBoxX = 34;
    $codeBoxY = 48;
    $pdf->Rect($codeBoxX, $codeBoxY, 80, 12, 'DF');

    // Código
    $pdf->SetFont('Helvetica', 'B', 16);
    $pdf->SetTextColor(255, 50, 50);
    $pdf->SetXY($codeBoxX, $codeBoxY + 1.5);
    $pdf->Cell(80, 9, $code, 0, 1, 'C');

    // Etiqueta "Gutschein-Code" + aktiv
    $pdf->SetFont('Helvetica', '', 6);
    $pdf->SetTextColor(150, 150, 150);
    $pdf->SetXY($codeBoxX, $codeBoxY + 12);
    $pdf->Cell(80, 4, 'Gutschein-Code', 0, 1, 'C');
    $pdf->SetFont('Helvetica', 'B', 8);
    $pdf->SetTextColor(34, 197, 94);
    $pdf->SetXY($codeBoxX, $codeBoxY + 16);
    $pdf->Cell(80, 5, '✓ Code aktiv', 0, 1, 'C');

    // Datos del comprador
    $pdf->SetFont('Helvetica', '', 8);
    $pdf->SetTextColor(200, 200, 200);

    $pdf->SetXY(10, 66);
    $pdf->Cell(35, 5, 'Ausgestellt fuer:', 0, 0, 'L');
    $pdf->SetTextColor(255, 255, 255);
    $pdf->Cell(60, 5, $buyerName, 0, 1, 'L');

    $pdf->SetTextColor(200, 200, 200);
    $pdf->SetXY(10, 71);
    $pdf->Cell(35, 5, 'Datum:', 0, 0, 'L');
    $pdf->SetTextColor(255, 255, 255);
    $pdf->Cell(60, 5, $date, 0, 1, 'L');

    // Línea separadora
    $pdf->SetDrawColor(60, 60, 60);
    $pdf->SetLineWidth(0.3);
    $pdf->Line(10, 79, 138, 79);

    // Pie de página
    $pdf->SetFont('Helvetica', '', 6.5);
    $pdf->SetTextColor(140, 140, 140);
    $pdf->SetXY(0, 81);
    $pdf->Cell(148, 4, 'Max Muster  **  Musterstrasse 1  **  CH 8000 Musterstadt', 0, 1, 'C');
    $pdf->SetXY(0, 85);
    $pdf->Cell(148, 4, '0000000000  **  www.lichtbild.ch  **  info@lichtbild.ch', 0, 1, 'C');

    // Nota de validez
    $pdf->SetFont('Helvetica', 'I', 5.5);
    $pdf->SetTextColor(100, 100, 100);
    $pdf->SetXY(0, 91);
    $pdf->Cell(148, 4, 'Kein Mindestbestellwert. Nicht mit anderen Aktionen kombinierbar. Kein Rueckgeld.', 0, 1, 'C');

    return $pdf->Output('S'); // devuelve como string
}

/**
 * Fallback: genera un PDF mínimo válido en PHP puro (sin FPDF)
 */
function generateGiftCardPDFFallback(string $code, float $amount, string $buyerName, string $date): string {
    try {
        $esc = function(string $s): string {
            return preg_replace('/[^A-Za-z0-9 \.\-\/:]/', '', $s);
        };
        $chf = 'CHF ' . number_format($amount, 2, '.', '');

        // Intentar obtener logo como JPEG via GD
        $imgObj  = '';
        $hasImg  = false;
        $imgW    = 80; $imgH = 80; // puntos PDF (~28mm)

        $logoData = @file_get_contents('https://web.lweb.ch/templettedhopnew/icon-192x192.png');
        if ($logoData && function_exists('imagecreatefromstring')) {
            $gd = @imagecreatefromstring($logoData);
            if ($gd) {
                ob_start();
                imagejpeg($gd, null, 90);
                $jpegData = ob_get_clean();
                imagedestroy($gd);
                if ($jpegData) {
                    $hasImg  = true;
                    $imgLen  = strlen($jpegData);
                    $imgObj  = "6 0 obj\n<< /Type /XObject /Subtype /Image /Width 192 /Height 192 "
                             . "/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " . $imgLen . " >>\nstream\n"
                             . $jpegData . "\nendstream\nendobj\n";
                }
            }
        }

        // Stream de contenido — imagen arriba a la izquierda + texto
        $stream  = "";
        if ($hasImg) {
            $stream .= "q\n{$imgW} 0 0 {$imgH} 30 745 cm\n/Im1 Do\nQ\n";
        }
        $stream .= "BT\n";
        $stream .= "/F1 18 Tf\n50 " . ($hasImg ? "720" : "780") . " Td\n(GESCHENKGUTSCHEIN) Tj\n";
        $stream .= "/F1 12 Tf\n0 -22 Td\n(Lichtbild) Tj\n";
        $stream .= "/F1 8 Tf\n0 -14 Td\n(ALLES FUER DIE BACH FLUSS UND SEEFISCHE) Tj\n";
        $stream .= "0 -11 Td\n(** GROSSE AUSWAHL) Tj\n";
        $stream .= "0 -11 Td\n(** SCHNELLER VERSAND) Tj\n";
        $stream .= "/F1 11 Tf\n0 -25 Td\n(Ausgestellt fuer: " . $esc($buyerName) . ") Tj\n";
        $stream .= "0 -16 Td\n(Datum: " . $esc($date) . ") Tj\n";
        $stream .= "/F1 20 Tf\n0 -28 Td\n(Gutschein Code: " . $esc($code) . ") Tj\n";
        $stream .= "/F1 24 Tf\n0 -26 Td\n(" . $esc($chf) . ") Tj\n";
        $stream .= "/F1 12 Tf\n0 -22 Td\n(Code aktiv) Tj\n";
        $stream .= "/F1 9 Tf\n0 -55 Td\n(Musterstrasse 1 - CH 8000 Musterstadt - www.lichtbild.ch) Tj\n";
        $stream .= "ET\n";

        $sLen = strlen($stream);

        $fontRes = '/Font << /F1 4 0 R >>';
        $imgRes  = $hasImg ? ' /XObject << /Im1 6 0 R >>' : '';
        $resources = $fontRes . $imgRes;

        $o1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        $o2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        $o3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << {$resources} >> >>\nendobj\n";
        $o4 = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
        $o5 = "5 0 obj\n<< /Length " . $sLen . " >>\nstream\n" . $stream . "endstream\nendobj\n";

        $header  = "%PDF-1.4\n";
        $pos     = strlen($header);
        $offsets = [];
        $body    = '';
        $objects = $hasImg ? [$o1, $o2, $o3, $o4, $o5, $imgObj] : [$o1, $o2, $o3, $o4, $o5];
        foreach ($objects as $obj) {
            $offsets[] = $pos;
            $pos += strlen($obj);
            $body .= $obj;
        }

        $count   = count($objects) + 1;
        $xrefPos = strlen($header) + strlen($body);
        $xref    = "xref\n0 {$count}\n0000000000 65535 f \n";
        foreach ($offsets as $off) {
            $xref .= str_pad((string)$off, 10, '0', STR_PAD_LEFT) . " 00000 n \n";
        }
        $trailer = "trailer\n<< /Size {$count} /Root 1 0 R >>\nstartxref\n" . $xrefPos . "\n%%EOF";

        return $header . $body . $xref . $trailer;
    } catch (Exception $e) {
        return '';
    }
}

/**
 * Envía el email con el gutschein al comprador
 */
function sendGiftCardEmail(string $buyerEmail, string $buyerName, string $code, float $amount, string $date): bool {
    $pdfContent = generateGiftCardPDF($code, $amount, $buyerName, $date);

    $subject = "Ihr Geschenkgutschein – Bestellnummer " . $code;

    $boundary = md5(uniqid());

    $htmlBody = '
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#141414;color:#fff;border-radius:8px;overflow:hidden;">
      <div style="background:#0d0d0d;padding:20px 30px;text-align:center;border-bottom:2px solid #b40000;">
        <h1 style="color:#fff;font-size:22px;margin:0;letter-spacing:2px;">GESCHENKGUTSCHEIN</h1>
        <p style="color:#aaa;font-size:11px;margin:4px 0 0;">Lichtbild</p>
      </div>
      <div style="padding:30px;">
        <p style="color:#ccc;">Guten Tag, <strong style="color:#fff;">' . htmlspecialchars($buyerName) . '</strong></p>
        <p style="color:#ccc;">Vielen Dank fuer Ihren Kauf! Hier ist Ihr Geschenkgutschein:</p>

        <div style="background:#1e1e1e;border:2px solid #22c55e;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
          <p style="color:#aaa;font-size:11px;margin:0 0 6px;letter-spacing:1px;">GUTSCHEIN CODE</p>
          <p style="color:#22c55e;font-size:28px;font-weight:bold;letter-spacing:4px;margin:0;">' . htmlspecialchars($code) . '</p>
          <p style="color:#fff;font-size:22px;font-weight:bold;margin:10px 0 0;">CHF ' . number_format($amount, 2, '.', "'") . '</p>
        </div>

        <p style="color:#ccc;font-size:13px;">Gutschein Code: <strong style="color:#22c55e;">' . htmlspecialchars($code) . '</strong></p>
        <p style="color:#22c55e;font-size:20px;font-weight:bold;margin:16px 0 0;">&#10003; Code aktiv</p>
        <p style="color:#999;font-size:11px;">Der Gutschein liegt dieser E-Mail auch als PDF bei.</p>

        <hr style="border:none;border-top:1px solid #333;margin:20px 0;">
        <p style="color:#666;font-size:10px;text-align:center;">
          Max Muster &nbsp;**&nbsp; Musterstrasse 1 &nbsp;**&nbsp; CH 8000 Musterstadt<br>
          0000000000 &nbsp;**&nbsp; www.lichtbild.ch
        </p>
      </div>
    </div>';

    $headers = "From: Lichtbild <noreply@lichtbild.ch>\r\n";
    $headers .= "Reply-To: info@lichtbild.ch\r\n";
    $headers .= "MIME-Version: 1.0\r\n";

    if (!empty($pdfContent)) {
        // Con adjunto PDF
        $headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";
        $body  = "--{$boundary}\r\n";
        $body .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
        $body .= $htmlBody . "\r\n";
        $body .= "--{$boundary}\r\n";
        $body .= "Content-Type: application/pdf; name=\"Gutschein_{$code}.pdf\"\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n";
        $body .= "Content-Disposition: attachment; filename=\"Gutschein_{$code}.pdf\"\r\n\r\n";
        $body .= chunk_split(base64_encode($pdfContent)) . "\r\n";
        $body .= "--{$boundary}--";
    } else {
        // Sin PDF — solo HTML
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body = $htmlBody;
    }

    return mail($buyerEmail, $subject, $body, $headers);
}

/**
 * Envía notificación al vendedor
 */
function sendGiftCardSellerNotification(string $code, float $amount, string $buyerName, string $buyerEmail, string $date, bool $isPaid): bool {
    $sellerEmail = 'info@lichtbild.ch';
    $subject = $isPaid
        ? "Gutschein verkauft & bezahlt – {$code}"
        : "Neuer Gutschein (Zahlung ausstehend) – {$code}";

    $statusText = $isPaid
        ? '<span style="color:#22c55e;font-weight:bold;">BEZAHLT – Gutschein wurde dem Kunden zugesendet</span>'
        : '<span style="color:#f59e0b;font-weight:bold;">AUSSTEHEND – Zahlung noch nicht eingegangen</span>';

    $htmlBody = '
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;border-radius:8px;overflow:hidden;border:1px solid #ddd;">
      <div style="background:#141414;padding:16px 24px;">
        <h2 style="color:#fff;margin:0;font-size:18px;">Gutschein-Benachrichtigung</h2>
      </div>
      <div style="padding:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#666;">Code:</td><td style="color:#b40000;font-weight:bold;font-size:18px;">' . htmlspecialchars($code) . '</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Betrag:</td><td style="font-weight:bold;">CHF ' . number_format($amount, 2, '.', "'") . '</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Kaeufer:</td><td>' . htmlspecialchars($buyerName) . '</td></tr>
          <tr><td style="padding:6px 0;color:#666;">E-Mail:</td><td>' . htmlspecialchars($buyerEmail) . '</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Datum:</td><td>' . htmlspecialchars($date) . '</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Status:</td><td>' . $statusText . '</td></tr>
        </table>
      </div>
    </div>';

    $headers  = "From: Lichtbild <noreply@lichtbild.ch>\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";

    return mail($sellerEmail, $subject, $htmlBody, $headers);
}
?>
