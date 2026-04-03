<?php
/**
 * Legwrk Webhook Receiver for Hostinger
 * 
 * 1. Put this file in the main folder of your live Hostinger site.
 * 2. It will be accessible at: https://reil.studio/legwrk/screenshot.php
 * 3. It listens for webhooks from the Google Apps Script.
 */

// Secure token to ensure only your Google Sheet can trigger this:
$WEBHOOK_SECRET = 'legwrk_secret_1234';

// Check the request method and secret
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit("Method Not Allowed. Use POST.");
}

if (!isset($input['secret']) || $input['secret'] !== $WEBHOOK_SECRET) {
    http_response_code(403);
    exit("Forbidden. Invalid Secret.");
}

if (!isset($input['name']) || !isset($input['url'])) {
    http_response_code(400);
    exit("Bad Request. Name and URL are required.");
}

$studioName = $input['name'];
$studioUrl = $input['url'];

// Convert name to a slug - exactly matching the frontend logic
$slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $studioName), '-'));

if (empty($slug)) {
    http_response_code(400);
    exit("Bad Request. Name could not be slugified.");
}

// Ensure the screenshots directory exists
$screenshotsDir = __DIR__ . '/screenshots';
if (!is_dir($screenshotsDir)) {
    mkdir($screenshotsDir, 0755, true);
}

$savePath = $screenshotsDir . '/' . $slug . '.jpg';

// We fetch the screenshot from a third-party screenshot API
// Using thum.io as it was the primary alternative fallback on frontend
$thumUrl = 'https://image.thum.io/get/width/800/crop/600/noanimate/' . urlencode($studioUrl);

// Grab the image contents
$imageBytes = file_get_contents($thumUrl);

if ($imageBytes === false || strlen($imageBytes) == 0) {
    http_response_code(500);
    exit("Internal Server Error. Failed to fetch screenshot from generator.");
}

// Save it relative to this file
$result = file_put_contents($savePath, $imageBytes);

if ($result === false) {
    http_response_code(500);
    exit("Internal Server Error. Failed to write file to the server. Check file permissions for the 'screenshots' folder.");
}

// Success
echo json_encode([
    "status" => "success",
    "message" => "Generated screenshot for " . $studioName,
    "path" => "/screenshots/" . $slug . ".jpg"
]);
exit();
?>
